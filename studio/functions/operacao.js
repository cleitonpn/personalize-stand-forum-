const {onCall,HttpsError}=require('firebase-functions/v2/https')
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore')
const {getAuth}=require('firebase-admin/auth')
const {getStorage}=require('firebase-admin/storage')
const {randomUUID,createHash}=require('node:crypto')
const {PAPEIS,podeOperar,podeGerir,manifesto}=require('./operacaoPolitica')
const {revogarLinks}=require('./acessos')
const {prepararEvento,gravarEvento,entregarEventos}=require('./notificacoes')
const REGIAO='southamerica-east1'
const texto=(v,max=180)=>String(v||'').trim().slice(0,max)
function id(v){if(typeof v!=='string'||!v||v.length>180||v.includes('/'))throw new HttpsError('invalid-argument','Identificador inválido.');return v}
function ids(v){if(!Array.isArray(v)||v.length>30)throw new HttpsError('invalid-argument','Escolha até 30 vínculos.');return [...new Set(v.map(id))]}
const versao=v=>v?.toMillis?.() || 0
async function perfil(req,tx){if(!req.auth)throw new HttpsError('unauthenticated','Faça login.');const ref=getFirestore().doc(`usuarios/${req.auth.uid}`),s=await(tx?tx.get(ref):ref.get()),p=s.data();if(!p||p.ativo===false)throw new HttpsError('permission-denied','Acesso indisponível.');return p}
function exigir(cond,msg='Esta ação não está disponível para seu acesso.'){if(!cond)throw new HttpsError('permission-denied',msg)}
const chaveOrdem=p=>createHash('sha256').update(`${p.cliente}|${p.feiraId}`).digest('hex')
async function avisoOperacional(o,autor,titulo,corpo){
  const db=getFirestore(),s=await db.collection('usuarios').where('ativo','==',true).get()
  return {id:randomUUID(),autor,alvo:'operacao',tipo:'operacao_atualizada',cliente:o.cliente,organizadoraId:o.organizadoraId||null,propostaId:o.propostaId,ordemId:o.id,titulo,corpo,url:`/producao/${o.id}`,destinatarios:s.docs.filter(u=>u.id!==autor&&podeOperar(u.data(),o)).map(u=>u.id)}
}
exports.decidirProposta=onCall({region:REGIAO},async req=>{
  const inicial=await perfil(req);exigir(inicial.papel==='admin')
  const d=req.data||{},propostaId=id(d.propostaId),db=getFirestore(),ref=db.doc(`propostas/${propostaId}`),p=(await ref.get()).data()
  if(!p)throw new HttpsError('not-found','Proposta não encontrada.')
  if(!['aprovada','recusada'].includes(d.decisao))throw new HttpsError('invalid-argument','Escolha aprovar ou recusar.')
  if(d.decisao==='recusada'&&!texto(d.motivo,2000))throw new HttpsError('invalid-argument','Explique a recusa.')
  if(d.decisao==='aprovada'&&(!p.feiraId||!p.arquivoPersonalizado?.caminho))throw new HttpsError('failed-precondition','Vincule uma feira e confira o GLB antes de liberar a produção.')
  const ordemId=chaveOrdem(p),ordemRef=db.doc(`ordensProducao/${ordemId}`)
  const evento=await prepararEvento({id:randomUUID(),alvo:'cliente',autor:req.auth.uid,cliente:p.cliente,organizadoraId:p.organizadoraId,propostaId,tipo:'decisao_comercial',titulo:d.decisao==='aprovada'?'Proposta aprovada pela USET':'Proposta precisa de revisão',corpo:d.decisao==='aprovada'?'Seu estande foi liberado para preparação pela equipe. As artes seguem a conferência e aprovação de provas.':'Consulte a orientação da USET para dar continuidade à proposta.',url:`/artes/${propostaId}`})
  const aviso=await avisoOperacional({...p,id:ordemId,propostaId,estado:'liberada',equipeIds:[]},req.auth.uid,'Projeto liberado para produção',`${p.clienteNome} · ${p.feira||'Feira'}: confira a configuração aprovada.`)
  let notificacoes=[]
  await db.runTransaction(async tx=>{
    exigir((await perfil(req,tx)).papel==='admin')
    const atual=await tx.get(ref),ordem=await tx.get(ordemRef),usuario=await tx.get(db.doc(`usuarios/${p.cliente}`)),a=atual.data(),o=ordem.data()
    if(!a||a.cliente!==p.cliente||a.feiraId!==p.feiraId)throw new HttpsError('failed-precondition','A proposta mudou. Recarregue.')
    if(a.decisaoComercial===d.decisao)return
    if(o&&o.propostaId!==propostaId&&d.decisao==='recusada')throw new HttpsError('failed-precondition','A produção está vinculada a outra proposta aprovada.')
    if(o?.propostaId!==propostaId&&o?.estado==='liberada'&&d.confirmarSubstituicao!==true)throw new HttpsError('failed-precondition','Já existe uma ordem liberada para este expositor nesta feira. Confirme a substituição; o histórico será preservado.')
    let m=a.manifestoProducao
    if(d.decisao==='aprovada'&&!m){
      if(d.confirmarLegado!==true)throw new HttpsError('failed-precondition','Proposta anterior ao registro completo. Confira o mapeamento atual e confirme a conferência manual.')
      const modelo=await tx.get(db.doc(`modelos/${id(a.modeloId)}`))
      if(!modelo.exists)throw new HttpsError('failed-precondition','O projeto original não está disponível.')
      m={...manifesto(modelo.data(),a),origem:'legado_conferido_manualmente'}
    }
    if(d.decisao==='aprovada'&&Buffer.byteLength(JSON.stringify(m))>750000)throw new HttpsError('failed-precondition','O registro do projeto excede o limite. Revise o mapeamento.')
    const revisao=(o?.revisao||0)+1,agora=FieldValue.serverTimestamp(),contato=usuario.data()||{}
    const registro={id:ordemId,propostaId,cliente:a.cliente,clienteNome:a.clienteNome,feiraId:a.feiraId,feira:a.feira||'',organizadoraId:a.organizadoraId||null,modeloId:a.modeloId,modeloNome:a.modeloNome,
      contatoNome:contato.contatoNome||a.contatoNome||'',telefone:contato.telefone||a.telefone||'',localizacao:contato.localizacao||a.localizacao||'',estado:d.decisao==='aprovada'?'liberada':'suspensa',revisao,
      equipeIds:o?.equipeIds||[],manifesto:m||o?.manifesto||null,arquivoPersonalizado:a.arquivoPersonalizado||null,atualizadoEm:agora,aprovadoPor:req.auth.uid}
    if(o)tx.create(ordemRef.collection('revisoes').doc(String(o.revisao)),{...o,arquivadaEm:agora})
    if(o?.propostaId && o.propostaId!==propostaId)tx.set(db.doc(`acessosProducao/${o.propostaId}`),{estado:'substituida'},{merge:true})
    if(d.decisao==='aprovada'||o)tx.set(db.doc(`acessosProducao/${propostaId}`),{ordemId,estado:registro.estado,feiraId:registro.feiraId,equipeIds:registro.equipeIds})
    if(d.decisao==='aprovada'||o){tx.set(ordemRef,registro);tx.create(ordemRef.collection('eventos').doc(),{acao:d.decisao,autor:req.auth.uid,revisao,motivo:texto(d.motivo,2000),em:agora})}
    tx.update(ref,{decisaoComercial:d.decisao,decisaoMotivo:texto(d.motivo,2000),decisaoEm:agora,decisaoPor:req.auth.uid,...(d.decisao==='aprovada'?{ordemProducaoId:ordemId}:{})})
    notificacoes=gravarEvento(tx,evento)
    if(d.decisao==='aprovada')notificacoes.push(...gravarEvento(tx,{...aviso,destinatarios:aviso.destinatarios}))
  })
  await entregarEventos(notificacoes);return{ok:true,ordemId}
})

exports.operacao=onCall({region:REGIAO},async req=>{
  const p=await perfil(req),d=req.data||{},db=getFirestore(),gestor=['admin','gerente_operacional','analista_operacional'].includes(p.papel)
  exigir(p.papel==='admin'||PAPEIS.includes(p.papel))
  if(d.acao==='listar'){
    // Consultas por feira evitam entregar dados de outras organizadoras ao dispositivo.
    const feiras=p.papel==='admin'?(await db.collection('feiras').get()).docs.map(s=>({id:s.id,...s.data()})):await Promise.all((p.feiraIds||[]).map(async f=>{const s=await db.doc(`feiras/${id(f)}`).get();return {id:s.id,...s.data()}}))
    const ordens=p.papel==='admin'?(await db.collection('ordensProducao').get()).docs:(await Promise.all((p.feiraIds||[]).map(f=>db.collection('ordensProducao').where('feiraId','==',f).get()))).flatMap(s=>s.docs)
    const equipes=(await db.collection('equipesOperacionais').get()).docs.filter(s=>p.papel==='admin'||(s.data().feiraIds||[]).some(f=>(p.feiraIds||[]).includes(f)))
    const usuarios=gestor?(await db.collection('usuarios').get()).docs.filter(s=>PAPEIS.includes(s.data().papel)&&(p.papel==='admin'||(s.data().feiraIds||[]).some(f=>(p.feiraIds||[]).includes(f)))).map(s=>({uid:s.id,nome:s.data().nome,email:s.data().email,papel:s.data().papel,ativo:s.data().ativo,feiraIds:s.data().feiraIds||[],equipeIds:s.data().equipeIds||[]})):[]
    return {feiras:feiras.map(f=>({id:f.id,nome:f.nome})),ordens:ordens.filter(s=>podeOperar(p,s.data())).map(s=>{const o=s.data();return{id:s.id,propostaId:o.propostaId,clienteNome:o.clienteNome,feira:o.feira,feiraId:o.feiraId,localizacao:o.localizacao,modeloNome:o.modeloNome,revisao:o.revisao,equipeIds:o.equipeIds,atualizadoEm:versao(o.atualizadoEm)}}),equipes:equipes.map(s=>({id:s.id,...s.data()})),usuarios}
  }
  if(d.acao==='equipe'){
    exigir(gestor);const feiraIds=ids(d.feiraIds),membros=ids(d.membros),nome=texto(d.nome)
    if(!nome||!feiraIds.length||!['montagem','marcenaria','eletrica','tapecaria','mobiliario','cv','logistica'].includes(d.especialidade))throw new HttpsError('invalid-argument','Informe nome, especialidade e ao menos uma feira.')
    exigir(feiraIds.every(f=>podeGerir(p,f)))
    const equipeRef=db.doc(`equipesOperacionais/${d.id?id(d.id):randomUUID()}`)
    await db.runTransaction(async tx=>{
      const atualPerfil=await perfil(req,tx),equipe=await tx.get(equipeRef),antes=equipe.data(),fs=await Promise.all(feiraIds.map(f=>tx.get(db.doc(`feiras/${f}`)))),us=await Promise.all(membros.map(uid=>tx.get(db.doc(`usuarios/${uid}`))))
      const atribuidas=await tx.get(db.collection('ordensProducao').where('equipeIds','array-contains',equipeRef.id))
      if(atribuidas.docs.some(s=>s.data().estado==='liberada'&&!feiraIds.includes(s.data().feiraId)))throw new HttpsError('failed-precondition','Retire a equipe dos estandes dessa feira antes de remover o vínculo da equipe com a feira.')
      exigir(feiraIds.every(f=>podeGerir(atualPerfil,f))&&(!antes||(antes.feiraIds||[]).every(f=>podeGerir(atualPerfil,f))))
      if(fs.some(s=>!s.exists)||us.some(s=>!s.exists||s.data().ativo===false||!PAPEIS.includes(s.data().papel)||!feiraIds.every(f=>(s.data().feiraIds||[]).includes(f))))throw new HttpsError('invalid-argument','Os integrantes devem ter acesso ativo a todas as feiras da equipe.')
      const retirados=await Promise.all((antes?.membros||[]).filter(uid=>!membros.includes(uid)).map(uid=>tx.get(db.doc(`usuarios/${uid}`))))
      if(d.responsavelUid&&!membros.includes(d.responsavelUid))throw new HttpsError('invalid-argument','O responsável deve ser um integrante da equipe.')
      tx.set(equipeRef,{nome,especialidade:d.especialidade,feiraIds,membros,responsavelUid:d.responsavelUid||null,responsavelNome:texto(d.responsavelNome),contato:texto(d.contato),ativo:d.ativo!==false,instrucoes:texto(d.instrucoes,4000),atualizadoEm:Timestamp.now()})
      for(const u of us)tx.update(u.ref,{equipeIds:d.ativo===false?FieldValue.arrayRemove(equipeRef.id):FieldValue.arrayUnion(equipeRef.id)})
      for(const u of retirados)if(u.exists)tx.update(u.ref,{equipeIds:FieldValue.arrayRemove(equipeRef.id)})
    });return{ok:true,id:equipeRef.id}
  }
  if(d.acao==='vincular'){
    const ref=db.doc(`ordensProducao/${id(d.ordemId)}`),equipeIds=ids(d.equipeIds)
    await db.runTransaction(async tx=>{const usuario=await perfil(req,tx),s=await tx.get(ref),o=s.data();exigir(podeGerir(usuario,o?.feiraId)&&o?.estado==='liberada');if(d.revisao!==o.revisao)throw new HttpsError('failed-precondition','A versão aprovada mudou. Recarregue.');const eq=await Promise.all(equipeIds.map(e=>tx.get(db.doc(`equipesOperacionais/${e}`))));if(eq.some(e=>!e.exists||e.data().ativo===false||!(e.data().feiraIds||[]).includes(o.feiraId)))throw new HttpsError('invalid-argument','Equipe indisponível nesta feira.');tx.update(ref,{equipeIds,atualizadoEm:Timestamp.now()});tx.set(db.doc(`acessosProducao/${o.propostaId}`),{equipeIds},{merge:true});tx.create(ref.collection('eventos').doc(),{acao:'equipes',autor:req.auth.uid,equipeIds,revisao:o.revisao,em:Timestamp.now()})})
    const o={...(await ref.get()).data(),id:ref.id},evento=await avisoOperacional(o,req.auth.uid,'Estande atribuído à equipe','Confira os serviços e documentos do estande aprovado.');let avisos=[];await db.runTransaction(async tx=>{avisos=gravarEvento(tx,evento)});await entregarEventos(avisos);return{ok:true}
  }
  if(d.acao==='cadastroAcesso'){
    exigir(p.papel==='admin');const email=texto(d.email).toLowerCase(),nome=texto(d.nome),feiraIds=ids(d.feiraIds),papel=d.papel
    if(!nome||!/^\S+@\S+\.\S+$/.test(email)||!PAPEIS.includes(papel)||!feiraIds.length)throw new HttpsError('invalid-argument','Informe nome, e-mail, papel e feiras.')
    for(const f of feiraIds)if(!(await db.doc(`feiras/${f}`).get()).exists)throw new HttpsError('invalid-argument','Feira não encontrada.')
    let usuario,criado=false
    try{usuario=await getAuth().getUserByEmail(email);const existente=(await db.doc(`usuarios/${usuario.uid}`).get()).data();if(existente&&!PAPEIS.includes(existente.papel))throw new HttpsError('failed-precondition','Este e-mail já pertence a outro tipo de acesso.')}catch(e){if(e.code!=='auth/user-not-found')throw e;usuario=await getAuth().createUser({email,displayName:nome});criado=true}
    try{const convite=await getAuth().generatePasswordResetLink(email);await db.doc(`usuarios/${usuario.uid}`).set({nome,email,papel,feiraIds,ativo:d.ativo!==false,...(criado?{equipeIds:[]}:{}),precisaTrocarSenha:false,atualizadoEm:Timestamp.now()},{merge:true});await db.collection('emailsSaida').add({para:email,tipo:'convite_operacional',status:'pendente_integracao',texto:`Olá, ${nome}. Seu acesso à produção USET foi cadastrado. Defina sua senha: ${convite}`,criadoEm:Timestamp.now()});return{uid:usuario.uid,convite}}catch(e){if(criado){await db.doc(`usuarios/${usuario.uid}`).delete().catch(()=>{});await getAuth().deleteUser(usuario.uid).catch(()=>{})}throw e}
  }
  if(['reservarAnexo','anexar','removerAnexo'].includes(d.acao)){
    const tipo=d.tipo;if(!['ordensProducao','equipesOperacionais'].includes(tipo))throw new HttpsError('invalid-argument','Destino inválido.')
    const pai=db.doc(`${tipo}/${id(d.parentId)}`),s=await pai.get(),o=s.data(),pode=tipo==='ordensProducao'?podeOperar(p,o):gestor&&(o?.feiraIds||[]).every(f=>podeGerir(p,f))
    exigir(pode)
    if(d.acao==='reservarAnexo'){
      if(tipo==='ordensProducao'&&d.revisao!=null&&d.revisao!==o.revisao)throw new HttpsError('failed-precondition','O projeto mudou. Gere as vistas da revisão atual.');
      if(!Number.isSafeInteger(d.bytes)||d.bytes<=0||d.bytes>30*1024*1024||!['application/pdf','image/png','image/jpeg','image/webp','model/gltf-binary'].includes(d.mime))throw new HttpsError('invalid-argument','Envie PDF, imagem ou GLB de até 30 MB.')
      const uploadId=randomUUID(),caminho=`operacao/${tipo}/${s.id}/${uploadId}`
      await db.doc(`uploadsOperacionais/${uploadId}`).set({uid:req.auth.uid,tipo,parentId:s.id,caminho,nome:texto(d.nome),bytes:d.bytes,mime:d.mime,usado:false,expiraEm:Timestamp.fromMillis(Date.now()+3600000),revisao:o.revisao||null})
      return{uploadId,caminho}
    }
    const ar=pai.collection('anexos').doc(id(d.uploadId))
    if(d.acao==='removerAnexo'){exigir(gestor);await ar.delete();await getStorage().bucket().file(`operacao/${tipo}/${s.id}/${d.uploadId}`).delete({ignoreNotFound:true});return{ok:true}}
    const reservaRef=db.doc(`uploadsOperacionais/${id(d.uploadId)}`),r=(await reservaRef.get()).data()
    exigir(r?.uid===req.auth.uid&&r.tipo===tipo&&r.parentId===s.id&&!r.usado&&r.expiraEm.toMillis()>Date.now())
    const file=getStorage().bucket().file(r.caminho),[m]=await file.getMetadata()
    if(Number(m.size)!==r.bytes||m.contentType!==r.mime)throw new HttpsError('invalid-argument','Arquivo diferente do reservado.')
    await revogarLinks(file)
    await db.runTransaction(async tx=>{const u=await perfil(req,tx),atual=await tx.get(pai),reserva=await tx.get(reservaRef),a=atual.data();exigir(tipo==='ordensProducao'?podeOperar(u,a):(['admin','gerente_operacional','analista_operacional'].includes(u.papel)&&(a?.feiraIds||[]).every(f=>podeGerir(u,f))));if(reserva.data()?.usado||r.revisao!==(a.revisao||null))throw new HttpsError('failed-precondition','O destino mudou. Selecione o arquivo novamente.');tx.create(ar,{nome:r.nome,caminho:r.caminho,bytes:r.bytes,mime:r.mime,autor:req.auth.uid,criadoEm:Timestamp.now(),revisao:r.revisao});tx.update(reservaRef,{usado:true})});return{ok:true}
  }
  if(d.acao==='pendencia'){
    const ordemRef=db.doc(`ordensProducao/${id(d.ordemId)}`),ref=ordemRef.collection('pendencias').doc(d.id?id(d.id):randomUUID())
    await db.runTransaction(async tx=>{const u=await perfil(req,tx),s=await tx.get(ordemRef),o=s.data(),antiga=await tx.get(ref);exigir(podeOperar(u,o));if(d.revisao!==o.revisao)throw new HttpsError('failed-precondition','A configuração aprovada mudou. Recarregue antes de registrar.');const a=antiga.data();if(a&&a.revisao!==o.revisao)throw new HttpsError('failed-precondition','Esta pendência pertence à revisão anterior. Registre o serviço na configuração atual.');if(!a){if(!texto(d.descricao,2000)||!(o.equipeIds||[]).includes(d.equipeId))throw new HttpsError('invalid-argument','Informe descrição e uma equipe atribuída ao estande.');exigir(u.papel!=='equipe_producao'||(u.equipeIds||[]).includes(d.equipeId));tx.create(ref,{descricao:texto(d.descricao,2000),equipeId:id(d.equipeId),status:'aberta',autor:req.auth.uid,revisao:o.revisao,criadoEm:Timestamp.now()})}else{exigir(podeGerir(u,o.feiraId)||(u.equipeIds||[]).includes(a.equipeId));if(!['em_execucao','aguardando_validacao','concluida','aberta'].includes(d.status)||d.status===a.status)throw new HttpsError('invalid-argument','Etapa inválida.');const permitidas={aberta:['em_execucao'],em_execucao:['aguardando_validacao'],aguardando_validacao:['concluida','aberta'],concluida:[]};if(!(permitidas[a.status]||[]).includes(d.status))throw new HttpsError('failed-precondition','Siga as etapas de execução e validação.');if(['concluida','aberta'].includes(d.status))exigir(podeGerir(u,o.feiraId));tx.update(ref,{status:d.status,atualizadoPor:req.auth.uid,atualizadoEm:Timestamp.now()})}tx.create(ordemRef.collection('eventos').doc(),{acao:'pendencia',pendenciaId:ref.id,status:d.status||'aberta',autor:req.auth.uid,autorNome:u.nome||'',revisao:o.revisao,em:Timestamp.now()})});const o={...(await ordemRef.get()).data(),id:ordemRef.id},evento=await avisoOperacional(o,req.auth.uid,d.status==='aguardando_validacao'?'Serviço aguarda validação':d.status==='concluida'?'Serviço validado':d.id?'Pendência atualizada':'Nova pendência operacional',`Confira os serviços de ${o.clienteNome}.`);let avisos=[];await db.runTransaction(async tx=>{avisos=gravarEvento(tx,evento)});await entregarEventos(avisos);return{ok:true}
  }
  throw new HttpsError('invalid-argument','Ação inválida.')
})
exports.avisoOperacional=avisoOperacional
