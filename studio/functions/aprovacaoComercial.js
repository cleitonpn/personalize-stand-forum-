const {onCall,HttpsError}=require('firebase-functions/v2/https')
const {getFirestore,FieldValue}=require('firebase-admin/firestore')
const {randomUUID,createHash}=require('node:crypto')
const {manifesto}=require('./manifestoProposta')
const {prepararEvento,gravarEvento,entregarEventos}=require('./notificacoes')
const REGIAO='southamerica-east1'
const texto=(v,max=180)=>String(v||'').trim().slice(0,max)
function id(v){if(typeof v!=='string'||!v||v.length>180||v.includes('/'))throw new HttpsError('invalid-argument','Identificador inválido.');return v}
async function perfil(req,tx){if(!req.auth)throw new HttpsError('unauthenticated','Faça login.');const ref=getFirestore().doc(`usuarios/${req.auth.uid}`),s=await(tx?tx.get(ref):ref.get()),p=s.data();if(!p||p.ativo===false)throw new HttpsError('permission-denied','Acesso indisponível.');return {...p,uid:req.auth.uid}}
function exigir(cond,msg='Esta ação não está disponível para seu acesso.'){if(!cond)throw new HttpsError('permission-denied',msg)}
const chaveOrdem=p=>createHash('sha256').update(`${p.cliente}|${p.feiraId}`).digest('hex')
exports.decidirProposta=onCall({region:REGIAO},async req=>{
  const inicial=await perfil(req);exigir(inicial.papel==='admin')
  const d=req.data||{},propostaId=id(d.propostaId),db=getFirestore(),ref=db.doc(`propostas/${propostaId}`),p=(await ref.get()).data()
  if(!p)throw new HttpsError('not-found','Proposta não encontrada.')
  if(!['aprovada','recusada'].includes(d.decisao))throw new HttpsError('invalid-argument','Escolha aprovar ou recusar.')
  if(d.decisao==='recusada'&&!texto(d.motivo,2000))throw new HttpsError('invalid-argument','Explique a recusa.')
  if(d.decisao==='aprovada'&&(!p.feiraId||!p.arquivoPersonalizado?.caminho))throw new HttpsError('failed-precondition','Vincule uma feira e confira o GLB antes de liberar a produção.')
  const ordemId=chaveOrdem(p),ordemRef=db.doc(`ordensProducao/${ordemId}`)
  const evento=await prepararEvento({id:randomUUID(),alvo:'cliente',autor:req.auth.uid,cliente:p.cliente,organizadoraId:p.organizadoraId,propostaId,tipo:'decisao_comercial',titulo:d.decisao==='aprovada'?'Proposta aprovada pela USET':'Proposta precisa de revisão',corpo:d.decisao==='aprovada'?'Seu estande foi liberado para preparação pela equipe. As artes seguem a conferência e aprovação de provas.':'Consulte a orientação da USET para dar continuidade à proposta.',url:`/artes/${propostaId}`})
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
    const registro={...o,id:ordemId,propostaId,cliente:a.cliente,clienteNome:a.clienteNome,feiraId:a.feiraId,feira:a.feira||'',organizadoraId:a.organizadoraId||null,modeloId:a.modeloId,modeloNome:a.modeloNome,
      contatoNome:contato.contatoNome||a.contatoNome||'',telefone:contato.telefone||a.telefone||'',localizacao:contato.localizacao||a.localizacao||'',estado:d.decisao==='aprovada'?'liberada':'suspensa',revisao,
      manifesto:m||o?.manifesto||null,arquivoPersonalizado:a.arquivoPersonalizado||null,atualizadoEm:agora,aprovadoPor:req.auth.uid}
    if(o)tx.create(ordemRef.collection('revisoes').doc(String(o.revisao)),{...o,arquivadaEm:agora})
    if(o?.propostaId && o.propostaId!==propostaId)tx.set(db.doc(`acessosProducao/${o.propostaId}`),{estado:'substituida'},{merge:true})
    if(d.decisao==='aprovada'||o)tx.set(db.doc(`acessosProducao/${propostaId}`),{ordemId,estado:registro.estado,feiraId:registro.feiraId})
    if(d.decisao==='aprovada'||o){tx.set(ordemRef,registro);tx.create(ordemRef.collection('eventos').doc(),{acao:d.decisao,autor:req.auth.uid,revisao,motivo:texto(d.motivo,2000),em:agora})}
    tx.update(ref,{decisaoComercial:d.decisao,decisaoMotivo:texto(d.motivo,2000),decisaoEm:agora,decisaoPor:req.auth.uid,...(d.decisao==='aprovada'?{ordemProducaoId:ordemId}:{})})
    if(usuario.exists)tx.update(usuario.ref,{personalizacaoBloqueada:d.decisao==='aprovada'?{propostaId,modeloId:a.modeloId,feiraId:a.feiraId}:null})
    notificacoes=gravarEvento(tx,evento)
  })
  await entregarEventos(notificacoes);return{ok:true,ordemId}
})

