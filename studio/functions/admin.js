const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const { validarAlvo, podeExcluirPagamento } = require('./adminPolitica')
const opcoes = { region: 'southamerica-east1' }
const texto = (v, max=180) => typeof v === 'string' ? v.trim().slice(0,max) : ''
function id(v) { if(typeof v !== 'string'||!v||v.length>180||v.includes('/')) throw new HttpsError('invalid-argument','Identificador inválido.');return v }
async function admin(req, tx) {
  if(!req.auth) throw new HttpsError('unauthenticated','Faça login.')
  const ref=getFirestore().doc(`usuarios/${req.auth.uid}`), s=tx?await tx.get(ref):await ref.get()
  if(s.data()?.papel!=='admin'||s.data().ativo===false) throw new HttpsError('permission-denied','Somente administradores podem gerenciar acessos e excluir propostas.')
}
function auditar(db, req, acao, alvo, extra={}) {
  return db.collection('auditoriaAdmin').add({autor:req.auth.uid,acao,alvo,...extra,em:FieldValue.serverTimestamp()})
}

exports.administrarUsuarios=onCall(opcoes, async req=>{
  await admin(req)
  const db=getFirestore(), auth=getAuth(), d=req.data||{}
  if(d.acao==='listar') {
    let q=db.collection('usuarios').orderBy(FieldPath.documentId()).limit(100)
    if(d.cursor) q=q.startAfter(id(d.cursor))
    const perfis=await q.get(), contas=perfis.empty?{users:[]}:await auth.getUsers(perfis.docs.map(s=>({uid:s.id})))
    const porId=new Map(contas.users.map(u=>[u.uid,u]))
    return {usuarios:perfis.docs.map(s=>{
      const p=s.data(),u=porId.get(s.id)
      return {uid:s.id,nome:p.nome||'',empresa:p.empresa||'',email:u?.email||p.email||'',papel:p.papel||'',ativo:p.ativo!==false&&!u?.disabled,semLogin:!u,precisaTrocarSenha:p.precisaTrocarSenha===true,cadastroPendente:p.cadastroCompleto===false,organizadoraId:p.organizadoraId||null,feira:p.feira||'',feiraIds:p.feiraIds||[],telefone:p.telefone||'',ultimoAcesso:u?.metadata.lastSignInTime||null,emailVerificado:u?.emailVerified||false}
    }),cursor:perfis.size===100?perfis.docs.at(-1).id:null}
  }
  const uid=id(d.uid), ref=db.doc(`usuarios/${uid}`), s=await ref.get()
  if(!s.exists) throw new HttpsError('not-found','Perfil não encontrado.')
  try { validarAlvo(req.auth.uid,uid,['redefinir','provisoria'].includes(d.acao)?'senha':d.acao) } catch(e) { throw new HttpsError('failed-precondition',e.message) }
  if(d.acao==='acesso') {
    if(typeof d.ativo!=='boolean') throw new HttpsError('invalid-argument','Informe se o acesso está liberado.')
    const gravar=()=>db.runTransaction(async tx=>{
      await admin(req,tx);const atual=await tx.get(ref)
      if(!atual.exists) throw new HttpsError('not-found','Perfil removido.')
      tx.update(ref,{ativo:d.ativo,atualizadoEm:FieldValue.serverTimestamp()})
      if(atual.data().papel==='organizadora')tx.set(db.doc(`organizadoras/${atual.data().organizadoraId||uid}`),{ativo:d.ativo},{merge:true})
      tx.create(db.collection('auditoriaAdmin').doc(),{autor:req.auth.uid,alvo:uid,acao:d.ativo?'liberar_acesso':'bloquear_acesso',em:FieldValue.serverTimestamp()})
    })
    // Ao bloquear, as regras devem impedir o acesso mesmo com token antigo.
    if(!d.ativo)await gravar()
    await auth.updateUser(uid,{disabled:!d.ativo})
    if(!d.ativo)await auth.revokeRefreshTokens(uid)
    else await gravar()
    return {ok:true}
  }
  if(d.acao==='sessoes') {
    await auth.revokeRefreshTokens(uid);await auditar(db,req,'encerrar_sessoes',uid);return{ok:true}
  }
  if(d.acao==='redefinir') {
    const conta=await auth.getUser(uid)
    if(conta.disabled||s.data().ativo===false)throw new HttpsError('failed-precondition','Libere o acesso antes de redefinir a senha.')
    const link=await auth.generatePasswordResetLink(conta.email)
    await auditar(db,req,'gerar_redefinicao_senha',uid)
    return {ok:true,link,email:conta.email}
  }
  if(d.acao==='provisoria') {
    if(typeof d.senha!=='string'||d.senha.length<8||d.senha.length>128)throw new HttpsError('invalid-argument','Use uma senha provisória de 8 a 128 caracteres.')
    if(s.data().ativo===false)throw new HttpsError('failed-precondition','Libere o acesso antes de alterar a senha.')
    await auth.updateUser(uid,{password:d.senha})
    await auth.revokeRefreshTokens(uid)
    await ref.update({precisaTrocarSenha:true,atualizadoEm:FieldValue.serverTimestamp()})
    await auditar(db,req,'senha_provisoria',uid)
    return {ok:true}
  }
  if(d.acao==='editar') {
    const nome=texto(d.nome),telefone=texto(d.telefone,30)
    if(!nome)throw new HttpsError('invalid-argument','Informe o nome.')
    await auth.updateUser(uid,{displayName:nome})
    await db.runTransaction(async tx=>{
      await admin(req,tx);const p=await tx.get(ref)
      if(!p.exists)throw new HttpsError('not-found','Perfil removido.')
      tx.update(ref,{nome,telefone,...(p.data().papel==='expositor'?{empresa:nome}:{}),atualizadoEm:FieldValue.serverTimestamp()})
      if(p.data().papel==='organizadora')tx.set(db.doc(`organizadoras/${p.data().organizadoraId||uid}`),{nome},{merge:true})
      tx.create(db.collection('auditoriaAdmin').doc(),{autor:req.auth.uid,alvo:uid,acao:'editar_usuario',em:FieldValue.serverTimestamp()})
    });return{ok:true}
  }
  throw new HttpsError('invalid-argument','Ação inválida.')
})

exports.gerenciarPropostasAdmin=onCall(opcoes,async req=>{
  await admin(req)
  const db=getFirestore(),d=req.data||{}
  if(d.acao==='lixeira') {
    let q=db.collection('propostasExcluidas').orderBy(FieldPath.documentId()).limit(100)
    if(d.cursor)q=q.startAfter(id(d.cursor))
    const s=await q.select('clienteNome','modeloNome','feira','excluidaEm','excluidaMotivo').get()
    return{propostas:s.docs.map(p=>({id:p.id,...p.data(),excluidaEm:p.data().excluidaEm?.toDate().toISOString()||null})),cursor:s.size===100?s.docs.at(-1).id:null}
  }
  const propostaId=id(d.propostaId),ref=db.doc(`propostas/${propostaId}`),lixeira=db.doc(`propostasExcluidas/${propostaId}`)
  if(!['excluir','restaurar'].includes(d.acao))throw new HttpsError('invalid-argument','Ação inválida.')
  await db.runTransaction(async tx=>{
    await admin(req,tx)
    const [p,a,pagamento,ordens]=await Promise.all([tx.get(ref),tx.get(lixeira),tx.get(db.doc(`pagamentos/${propostaId}`)),tx.get(db.collection('ordensProducao').where('propostaId','==',propostaId))])
    const agora=FieldValue.serverTimestamp()
    if(d.acao==='restaurar') {
      if(p.exists)throw new HttpsError('already-exists','Esta proposta já está na lista.')
      if(!a.exists)throw new HttpsError('not-found','Proposta não encontrada na lixeira.')
      const {excluidaEm,excluidaPor,excluidaMotivo,decisaoEm,decisaoPor,decisaoMotivo,ordemProducaoId,...original}=a.data()
      tx.create(ref,{...original,decisaoComercial:'pendente',restauradaEm:agora,restauradaPor:req.auth.uid})
      tx.delete(lixeira)
    } else {
      if(!p.exists){if(a.exists)return;throw new HttpsError('not-found','Proposta não encontrada.')}
      if(!podeExcluirPagamento(pagamento.data()))throw new HttpsError('failed-precondition','Resolva a cobrança emitida ou recebida antes de excluir esta proposta.')
      tx.set(lixeira,{...p.data(),excluidaEm:agora,excluidaPor:req.auth.uid,excluidaMotivo:texto(d.motivo,500)})
      tx.delete(ref)
      tx.set(db.doc(`acessosProducao/${propostaId}`),{estado:'excluida'},{merge:true})
      for(const o of ordens.docs){tx.update(o.ref,{estado:'suspensa',atualizadoEm:agora});tx.create(o.ref.collection('eventos').doc(),{acao:'proposta_excluida',autor:req.auth.uid,revisao:o.data().revisao,em:agora})}
      if(pagamento.exists)tx.update(pagamento.ref,{status:'cancelada',atualizadoEm:agora})
    }
    tx.create(db.collection('auditoriaAdmin').doc(),{autor:req.auth.uid,alvo:propostaId,acao:`${d.acao}_proposta`,em:agora})
  })
  return{ok:true}
})
