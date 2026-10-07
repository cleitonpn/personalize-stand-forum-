// ============================================================================
//  Cloud Functions — o que o navegador não pode fazer.
//
//  Pelo cliente, deleteUser só age sobre quem está logado: não há como o admin
//  apagar a conta de outro usuário. Isso exige o Admin SDK, que só roda no
//  servidor. Cadastros, vínculos e aprovação financeira também ficam aqui.
// ============================================================================

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp()

exports.artesProposta = require('./producao').artesProposta
exports.conversaCliente = require('./conversas').conversaCliente

const REGIAO = 'southamerica-east1'

/** O chamador é admin? Confere no Firestore, nunca no que o cliente afirma. */
async function exigirAdmin(auth) {
  if (!auth)
    throw new HttpsError('unauthenticated', 'Faça login para continuar.')
  const snap = await getFirestore().doc(`usuarios/${auth.uid}`).get()
  if (
    !snap.exists ||
    snap.data().papel !== 'admin' ||
    snap.data().ativo === false
  ) {
    throw new HttpsError(
      'permission-denied',
      'Somente o time da montadora pode fazer isso.',
    )
  }
}

/**
 * Exclui um expositor por completo: o perfil e o login.
 * Sem isto o login sobreviveria à exclusão do perfil e o e-mail ficaria preso,
 * impedindo cadastrar a mesma pessoa de novo.
 */
exports.excluirExpositor = onCall({ region: REGIAO }, async (req) => {
  await exigirAdmin(req.auth)

  const uid = req.data?.uid
  if (!uid)
    throw new HttpsError('invalid-argument', 'Informe o uid do expositor.')
  if (uid === req.auth.uid) {
    throw new HttpsError(
      'failed-precondition',
      'Você não pode excluir a própria conta por aqui.',
    )
  }

  const ref = getFirestore().doc(`usuarios/${uid}`)
  const snap = await ref.get()
  if (snap.exists && snap.data().papel !== 'expositor') {
    throw new HttpsError(
      'failed-precondition',
      'Esta operação exclui somente contas de expositor.',
    )
  }

  // O perfil sai primeiro: se a remoção do login falhar, o acesso já está
  // bloqueado pelas regras, que exigem perfil existente.
  if (snap.exists) await ref.delete()

  try {
    await getAuth().deleteUser(uid)
  } catch (e) {
    // conta já removida no Console é sucesso, não erro
    if (e.code !== 'auth/user-not-found') throw e
  }

  return { ok: true }
})

const { randomUUID } = require('node:crypto')
const { FieldValue } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')
const { Timestamp } = require('firebase-admin/firestore')

const { sincronizarArquivos, revogarLinks } = require('./acessos.js')
exports.sincronizarAcessosArquivos = onCall({ region: REGIAO, timeoutSeconds:300 }, async (req) => {
  await exigirAdmin(req.auth)
  return sincronizarArquivos()
})

exports.criarProjetoAdmin = onCall({region:REGIAO,timeoutSeconds:300}, async req=>{
  await exigirAdmin(req.auth)
  const d=req.data||{}, db=getFirestore()
  if(!texto(d.nome)||!/^modelos\/[^/]+$/.test(d.arquivo?.caminho||''))throw new HttpsError('invalid-argument','Informe o projeto e seu GLB.')
  const ref=db.collection('modelos').doc()
  await ref.set({...d,nome:texto(d.nome),organizadoraIds:[],criadoPor:req.auth.uid,criadoEm:FieldValue.serverTimestamp()})
  await sincronizarArquivos()
  return{id:ref.id}
})
exports.salvarProjetoAdmin = onCall({region:REGIAO,timeoutSeconds:300},async req=>{
  await exigirAdmin(req.auth)
  const {id,patch,versao}=req.data||{}, db=getFirestore(), agora=Timestamp.now()
  if(typeof id!=='string'||id.includes('/')||!patch||typeof patch!=='object'||Array.isArray(patch)||'organizadoraIds' in patch)throw new HttpsError('invalid-argument','Configuração inválida.')
  await db.runTransaction(async tx=>{
    const ref=db.doc(`modelos/${id}`),atual=await tx.get(ref)
    if(!atual.exists)throw new HttpsError('not-found','O projeto foi removido.')
    const v=atual.data().atualizadoEm
    if((v?.seconds||0)!==(versao?.seconds||0)||(v?.nanoseconds||0)!==(versao?.nanoseconds||0))throw new HttpsError('failed-precondition','Este projeto mudou em outra tela. Recarregue antes de salvar.')
    tx.update(ref,{...patch,atualizadoEm:agora})
  })
  await sincronizarArquivos()
  return{atualizadoEm:{seconds:agora.seconds,nanoseconds:agora.nanoseconds}}
})
exports.excluirProjetoAdmin = onCall({region:REGIAO,timeoutSeconds:300},async req=>{
  await exigirAdmin(req.auth)
  const id=req.data?.id,db=getFirestore()
  if(typeof id!=='string'||!id||id.includes('/'))throw new HttpsError('invalid-argument','Projeto inválido.')
  const ref=db.doc(`modelos/${id}`),s=await ref.get()
  await ref.delete();await sincronizarArquivos()
  const caminho=s.data()?.arquivo?.caminho
  if(/^modelos\/[^/]+$/.test(caminho||'')&&!(await db.doc(`arquivosModelo/${caminho.slice(8)}`).get()).exists)try{await getStorage().bucket().file(caminho).delete()}catch(e){if(Number(e.code)!==404)throw e}
  return{ok:true}
})

exports.registrarProposta = onCall({region:REGIAO},async req=>{
  if(!req.auth)throw new HttpsError('unauthenticated','Faça login.')
  const db=getFirestore(),u=await db.doc(`usuarios/${req.auth.uid}`).get(),perfil=u.data()
  if(!perfil||perfil.papel!=='expositor'||perfil.ativo===false||perfil.cadastroCompleto===false)throw new HttpsError('permission-denied','Complete o cadastro antes de enviar sua proposta.')
  const {id,proposta:p}=req.data||{}
  if(typeof id!=='string'||!id||id.includes('/')||!p||p.modeloId!==perfil.modeloId||p.cliente!==req.auth.uid||(p.organizadoraId||null)!==(perfil.organizadoraId||null)||(p.feiraId||null)!==(perfil.feiraId||null))throw new HttpsError('permission-denied','Seu vínculo mudou. Recarregue o projeto antes de enviar.')
  if(!Number.isFinite(p.total)||p.total<0||!Number.isInteger(p.quantidadePersonalizada)||p.quantidadePersonalizada<0||p.quantidadePersonalizada>10000)throw new HttpsError('invalid-argument','Proposta inválida.')
  const ref=db.doc(`propostas/${id}`),existente=await ref.get()
  if(existente.exists){if(existente.data().cliente!==req.auth.uid)throw new HttpsError('permission-denied','Envio indisponível.');return{id}}
  const modelo=await db.doc(`modelos/${perfil.modeloId}`).get()
  if(!modelo.exists)throw new HttpsError('failed-precondition','Projeto indisponível.')
  const esperado=`propostas/${req.auth.uid}/${id}/estande.glb`
  if(p.arquivoPersonalizado?.caminho!==esperado)throw new HttpsError('invalid-argument','GLB inválido.')
  const arquivo=getStorage().bucket().file(esperado),[metadata]=await arquivo.getMetadata()
  if(Number(metadata.size)>=200*1024*1024||metadata.contentType!=='model/gltf-binary')throw new HttpsError('invalid-argument','Confira o arquivo 3D do envio.')
  await revogarLinks(arquivo)
  const org=perfil.organizadoraId?await db.doc(`organizadoras/${perfil.organizadoraId}`).get():null
  await db.runTransaction(async tx=>{
    const atual=await tx.get(ref),usuario=await tx.get(u.ref),projeto=await tx.get(modelo.ref)
    const atualizado=usuario.data()
    if(!atualizado||atualizado.papel!=='expositor'||atualizado.ativo===false||atualizado.cadastroCompleto===false||atualizado.modeloId!==perfil.modeloId||(atualizado.organizadoraId||null)!==(perfil.organizadoraId||null)||(atualizado.feiraId||null)!==(perfil.feiraId||null))throw new HttpsError('failed-precondition','Seu acesso mudou. Recarregue antes de enviar.')
    if(atual.exists){if(atual.data().cliente!==req.auth.uid)throw new HttpsError('permission-denied','Envio indisponível.');return}
    const v=projeto.data()?.atualizadoEm,versao=req.data?.versao
    if(!projeto.exists||(v?.seconds||0)!==(versao?.seconds||0)||(v?.nanoseconds||0)!==(versao?.nanoseconds||0))throw new HttpsError('failed-precondition','O projeto ou seus preços mudaram. Recarregue antes de enviar.')
    let entrada=p.areasArte
    if(!Array.isArray(entrada)){
      const grupos=new Map()
      for(const [id,acab] of Object.entries(p.acabamentos||{})){
        if((!acab.arte&&!acab.artePendente)||acab.removido)continue
        const s=(projeto.data().superficies||[]).find(s=>s.id===id),grupo=s?.elementoId||id
        if(!grupos.has(grupo))grupos.set(grupo,{id:grupo,superficieIds:[]})
        grupos.get(grupo).superficieIds.push(id)
      }
      entrada=[...grupos.values()]
    }
    if(entrada.length>80||new Set(entrada.map(a=>a.id)).size!==entrada.length)throw new HttpsError('invalid-argument','Lista de áreas inválida.')
    const areasArte=entrada.map(a=>{
      const ids=Array.isArray(a.superficieIds)?a.superficieIds:[a.id],s=(projeto.data().superficies||[]).find(s=>s.id===ids[0])
      if(!ids.length||ids.length>200||ids.some(id=>{const sup=(projeto.data().superficies||[]).find(s=>s.id===id);return !sup?.podeArte||(sup.elementoId||sup.id)!==a.id})||!ids.some(id=>{const acab=p.acabamentos?.[id];return acab&&!acab.removido&&(acab.arte||acab.artePendente)}))throw new HttpsError('invalid-argument','Área de arte inválida.')
      const medida=(projeto.data().artesMedidas||[]).find(m=>m.id===a.id)||a
      return{id:a.id,superficieIds:ids,nome:texto(medida.nome||s.nome),larguraCm:Number.isFinite(medida.larguraCm)?medida.larguraCm:0,alturaCm:Number.isFinite(medida.alturaCm)?medida.alturaCm:0,perfilId:medida.perfilId||'lona-parede',origem:'glb',confirmada:false}
    })
    tx.create(ref,{...p,areasArte,clienteNome:perfil.empresa||perfil.nome,clienteEmail:perfil.email||req.auth.token.email,
      organizadoraId:perfil.organizadoraId||null,feiraId:perfil.feiraId||null,feira:perfil.feira||null,
      contatoNome:perfil.contatoNome||'',telefone:perfil.telefone||'',localizacao:perfil.localizacao||'',
      modeloNome:modelo.data().nome,cobranca:org?.data()?.cobranca||'organizadora',status:'recebida',criadoEm:FieldValue.serverTimestamp()})
  })
  return{id}
})

function texto(v, max = 180) {
  return String(v || '')
    .trim()
    .slice(0, max)
}
function obrigatorio(v, nome) {
  const s = texto(v)
  if (!s) throw new HttpsError('invalid-argument', `Informe ${nome}.`)
  return s
}

// O convite fica na fila até conectarmos o provedor. Nunca registramos senhas.
async function cadastrarConta(req, papel) {
  await exigirAdmin(req.auth)
  const d = req.data || {},
    db = getFirestore()
  const nome = obrigatorio(
    d.nome,
    papel === 'expositor' ? 'a empresa' : 'a organizadora',
  )
  const email = obrigatorio(d.email, 'o e-mail').toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new HttpsError('invalid-argument', 'E-mail inválido.')
  let vinculo = {}
  if (papel === 'expositor') {
    const feiraId = obrigatorio(d.feiraId, 'a feira'),
      modeloId = obrigatorio(d.modeloId, 'o projeto')
    const feira = await db.doc(`feiras/${feiraId}`).get()
    if (
      !feira.exists ||
      feira.data().ativo === false ||
      !feira.data().modeloIds?.includes(modeloId)
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Escolha um projeto vinculado à feira.',
      )
    }
    const organizadoraId = feira.data().organizadoraId
    const org = await db.doc(`organizadoras/${organizadoraId}`).get()
    const modelo = await db.doc(`modelos/${modeloId}`).get()
    if (!org.exists || org.data().ativo === false || !modelo.exists)
      throw new HttpsError('failed-precondition', 'Vínculo indisponível.')
    vinculo = {
      organizadoraId,
      feiraId,
      feira: feira.data().nome,
      modeloId,
      empresa: nome,
      cadastroCompleto: false,
      localizacao: '',
      localizacaoPendente: true,
    }
  } else if (!['montadora', 'organizadora'].includes(d.cobranca)) {
    throw new HttpsError(
      'invalid-argument',
      'Escolha como a personalização será cobrada.',
    )
  }
  let conta
  try {
    conta = await getAuth().createUser({
      email,
      displayName: nome,
      password: randomUUID() + randomUUID(),
    })
    const convite = await getAuth().generatePasswordResetLink(email)
    const batch = db.batch()
    const perfil = {
      nome,
      email,
      papel,
      ativo: true,
      precisaTrocarSenha: false,
      ...vinculo,
      criadoEm: FieldValue.serverTimestamp(),
      criadoPor: req.auth.uid,
    }
    if (papel === 'organizadora') {
      perfil.organizadoraId = conta.uid
      batch.set(db.doc(`organizadoras/${conta.uid}`), {
        nome,
        email,
        cobranca: d.cobranca,
        ativo: true,
        criadoEm: FieldValue.serverTimestamp(),
      })
    }
    batch.set(db.doc(`usuarios/${conta.uid}`), perfil)
    batch.set(db.collection('emailsSaida').doc(), {
      para: email,
      destinatarioId: conta.uid,
      tipo: 'convite',
      status: 'pendente_integracao',
      assunto: 'Seu acesso ao USET Studio',
      texto: `Olá, ${nome}! Seu acesso ao USET Studio foi cadastrado. Defina sua senha pelo link: ${convite}\nAcesse https://personalizacao-stand.web.app/entrar. ${papel==='expositor'?'No primeiro acesso, complete seus dados de contato.':'Consulte os projetos, expositores e propostas vinculados à sua organizadora.'}`,
      criadoEm: FieldValue.serverTimestamp(),
      criadoPor: req.auth.uid,
    })
    await batch.commit()
    return { uid: conta.uid, convite, emailPendente: true }
  } catch (e) {
    if (conta)
      await getAuth()
        .deleteUser(conta.uid)
        .catch(() => {})
    if (e.code === 'auth/email-already-exists')
      throw new HttpsError('already-exists', 'Este e-mail já possui acesso.')
    if (e instanceof HttpsError) throw e
    throw new HttpsError(
      'internal',
      'Não foi possível cadastrar o acesso. Tente novamente.',
    )
  }
}
exports.cadastrarOrganizadora = onCall({ region: REGIAO }, (req) =>
  cadastrarConta(req, 'organizadora'),
)
exports.cadastrarExpositor = onCall({ region: REGIAO }, (req) =>
  cadastrarConta(req, 'expositor'),
)

exports.salvarFeira = onCall({ region: REGIAO,timeoutSeconds:300 }, async (req) => {
  await exigirAdmin(req.auth)
  const db = getFirestore(),
    d = req.data || {}
  const nome = obrigatorio(d.nome, 'o nome da feira'),
    organizadoraId = obrigatorio(d.organizadoraId, 'a organizadora')
  const ids = [...new Set(Array.isArray(d.modeloIds) ? d.modeloIds : [])]
  if (
    ids.length > 100 ||
    ids.some((id) => typeof id !== 'string' || id.includes('/'))
  )
    throw new HttpsError('invalid-argument', 'Projetos inválidos.')
  const feiraRef = d.id
    ? db.doc(`feiras/${obrigatorio(d.id, 'a feira')}`)
    : db.collection('feiras').doc()
  await db.runTransaction(async (tx) => {
    const org = await tx.get(db.doc(`organizadoras/${organizadoraId}`))
    const antiga = await tx.get(feiraRef)
    if (!org.exists || org.data().ativo === false)
      throw new HttpsError('failed-precondition', 'Organizadora indisponível.')
    if (antiga.exists && antiga.data().organizadoraId !== organizadoraId)
      throw new HttpsError(
        'failed-precondition',
        'A organizadora de uma feira existente não pode ser trocada.',
      )
    const anteriores = antiga.data()?.modeloIds || []
    const todas = await tx.get(
      db.collection('feiras').where('organizadoraId', '==', organizadoraId),
    )
    const clientes = antiga.exists
      ? await tx.get(
          db.collection('usuarios').where('feiraId', '==', feiraRef.id),
        )
      : null
    if (clientes?.docs.some((c) => !ids.includes(c.data().modeloId)))
      throw new HttpsError(
        'failed-precondition',
        'Há expositores vinculados a um dos projetos removidos. Reatribua-os primeiro.',
      )
    const modelos = await Promise.all(
      [...new Set([...anteriores, ...ids])].map((id) =>
        tx.get(db.doc(`modelos/${id}`)),
      ),
    )
    if (modelos.some((m) => !m.exists && ids.includes(m.id)))
      throw new HttpsError('not-found', 'Projeto não encontrado.')
    for (const m of modelos) {
      if (!m.exists) continue
      const vinculado =
        ids.includes(m.id) ||
        todas.docs.some(
          (f) => f.id !== feiraRef.id && f.data().modeloIds?.includes(m.id),
        )
      const orgs = new Set(m.data().organizadoraIds || [])
      if (vinculado) orgs.add(organizadoraId)
      else orgs.delete(organizadoraId)
      tx.update(m.ref, { organizadoraIds: [...orgs] })
    }
    tx.set(
      feiraRef,
      {
        nome,
        organizadoraId,
        modeloIds: ids,
        ativo: true,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })
  await sincronizarArquivos()
  return { id: feiraRef.id }
})

exports.vincularExpositor = onCall({ region: REGIAO }, async (req) => {
  await exigirAdmin(req.auth)
  const db = getFirestore(),
    { uid, feiraId, modeloId } = req.data || {}
  for (const v of [uid, feiraId, modeloId])
    if (!v || typeof v !== 'string' || v.includes('/'))
      throw new HttpsError('invalid-argument', 'Vínculo inválido.')
  await db.runTransaction(async (tx) => {
    const cliente = await tx.get(db.doc(`usuarios/${uid}`)),
      feira = await tx.get(db.doc(`feiras/${feiraId}`))
    if (
      !cliente.exists ||
      cliente.data().papel !== 'expositor' ||
      !feira.exists ||
      !feira.data().modeloIds?.includes(modeloId)
    )
      throw new HttpsError(
        'failed-precondition',
        'Expositor, feira ou projeto inválido.',
      )
    tx.update(cliente.ref, {
      feiraId,
      modeloId,
      feira: feira.data().nome,
      organizadoraId: feira.data().organizadoraId,
    })
  })
  return { ok: true }
})

exports.prepararPagamento = onCall({ region: REGIAO }, async (req) => {
  await exigirAdmin(req.auth)
  const { propostaId, valorCentavos } = req.data || {}
  if (
    typeof propostaId !== 'string' ||
    propostaId.includes('/') ||
    !Number.isSafeInteger(valorCentavos) ||
    valorCentavos <= 0 ||
    valorCentavos > 100000000
  )
    throw new HttpsError(
      'invalid-argument',
      'Informe um valor aprovado válido em centavos.',
    )
  const db = getFirestore()
  await db.runTransaction(async (tx) => {
    const p = await tx.get(db.doc(`propostas/${propostaId}`))
    if (!p.exists || !p.data().organizadoraId)
      throw new HttpsError(
        'failed-precondition',
        'Proposta sem vínculo comercial.',
      )
    const org = await tx.get(db.doc(`organizadoras/${p.data().organizadoraId}`))
    const existente = await tx.get(db.doc(`pagamentos/${propostaId}`))
    if (org.data()?.cobranca !== 'montadora')
      throw new HttpsError(
        'failed-precondition',
        'Esta organizadora recebe propostas para negociação direta.',
      )
    if (existente.exists && existente.data().status !== 'aguardando_integracao')
      throw new HttpsError(
        'failed-precondition',
        'Uma cobrança já emitida não pode ser substituída.',
      )
    tx.set(db.doc(`pagamentos/${propostaId}`), {
      propostaId,
      cliente: p.data().cliente,
      organizadoraId: p.data().organizadoraId,
      feiraId: p.data().feiraId,
      valorCentavos,
      moeda: 'BRL',
      status: 'aguardando_integracao',
      provedor: null,
      aprovadoPor: req.auth.uid,
      atualizadoEm: FieldValue.serverTimestamp(),
    })
  })
  return { ok: true, status: 'aguardando_integracao' }
})

/**
 * Define uma nova senha provisória, para quando o expositor não recebe o e-mail
 * de redefinição (caixa corporativa costuma barrar) e precisa da senha na mão.
 */
exports.definirSenhaProvisoria = onCall({ region: REGIAO }, async (req) => {
  await exigirAdmin(req.auth)

  const { uid, senha } = req.data || {}
  if (!uid || !senha)
    throw new HttpsError('invalid-argument', 'Informe uid e senha.')
  if (String(senha).length < 6) {
    throw new HttpsError(
      'invalid-argument',
      'A senha precisa ter pelo menos 6 caracteres.',
    )
  }

  await getAuth().updateUser(uid, { password: String(senha) })
  await getFirestore()
    .doc(`usuarios/${uid}`)
    .update({ precisaTrocarSenha: true })

  return { ok: true }
})
