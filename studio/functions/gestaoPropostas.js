const {onCall,HttpsError}=require('firebase-functions/v2/https')
const {getFirestore,FieldPath,FieldValue}=require('firebase-admin/firestore')
const opcoes={region:'southamerica-east1',timeoutSeconds:300,memory:'512MiB'}
const id=v=>{if(typeof v!=='string'||!v||v.length>180||v.includes('/'))throw new HttpsError('invalid-argument','Identificador inválido.');return v}
async function equipe(req,tx){if(!req.auth)throw new HttpsError('unauthenticated','Faça login.');const ref=getFirestore().doc(`usuarios/${req.auth.uid}`),u=await(tx?tx.get(ref):ref.get()),p=u.data();if(!p||p.ativo===false||!['admin','organizadora'].includes(p.papel)||(p.papel==='organizadora'&&!p.organizadoraId))throw new HttpsError('permission-denied','Acesso restrito à gestão comercial.');return p}
exports.listarPropostasGestao=onCall(opcoes,async req=>{
  const db=getFirestore(),perfil=await equipe(req),d=req.data||{},politica=await import('./relatorios.mjs')
  let q=db.collection(d.excluidas===true?'propostasExcluidas':'propostas').orderBy(FieldPath.documentId()).limit(40)
  if(perfil.papel==='organizadora')q=q.where('organizadoraId','==',perfil.organizadoraId)
  if(d.cursor)q=q.startAfter(id(d.cursor))
  const s=await q.get(),propostas=[]
  // Pequena página; não devolve imagens de prévia nem escolhas contendo artes em base64.
  const campos=['cliente','clienteNome','clienteEmail','feiraId','feira','modeloId','modeloNome','organizadoraId','criadoEm','total','itens','complementos','pendenciasArte','eletrica','franquia','contatoNome','telefone','localizacao','cobranca','liberadaEm','decisaoComercial','decisaoEm','decisaoMotivo','ordemProducaoId','arquivoPersonalizado','manifestoProducao','status','restauradaEm']
  const orgIds=[...new Set(s.docs.map(x=>x.data().organizadoraId).filter(Boolean))],orgs=orgIds.length?await db.getAll(...orgIds.map(x=>db.doc(`organizadoras/${id(x)}`))):[],nomes=new Map(orgs.map(x=>[x.id,x.data()?.nome||'Organizadora']))
  const feiraIds=[...new Set(s.docs.map(x=>x.data().feiraId).filter(Boolean))],feiras=feiraIds.length?await db.getAll(...feiraIds.map(x=>db.doc(`feiras/${id(x)}`))):[],nomesFeiras=new Map(feiras.map(x=>[x.id,x.data()?.nome||x.id]))
  for(let i=0;i<s.docs.length;i+=8)await Promise.all(s.docs.slice(i,i+8).map(async doc=>{
    const p=doc.data(),[a,pg,w,modelo]=await db.getAll(db.doc(`acessosProducao/${doc.id}`),db.doc(`pagamentos/${doc.id}`),db.doc(`artesPropostas/${doc.id}`),...(typeof p.modeloId==='string'&&p.modeloId&&!p.modeloId.includes('/')?[db.doc(`modelos/${id(p.modeloId)}`)]:[]))
    let resumo=w.data()?.resumoArtes
    if((!resumo||!resumo.areas)&&w.exists)resumo=politica.resumoArtes((await w.ref.collection('areas').get()).docs.map(x=>({id:x.id,...x.data()})))
    if(!resumo)resumo=politica.resumoArtes((p.areasArte||p.manifestoProducao?.areasArte||p.pendenciasArte||[]).map(()=>({status:'aguardando'})))
    let estado=d.excluidas===true?'excluida':a.data()?.estado||null
    // Só a proposta corrente de uma ordem ativa conta como liberada nos relatórios.
    if(estado==='liberada'){if(a.data()?.ordemId){const o=await db.doc(`ordensProducao/${id(a.data().ordemId)}`).get();if(o.data()?.propostaId!==doc.id||o.data()?.estado!=='liberada')estado='substituida'}else estado='suspensa'}
    const m=p.manifestoProducao,quantitativos=modelo?.data()?.quantitativos,compativel=!!quantitativos&&!!m?.materiais?.length&&m.materiais.every(x=>quantitativos[x.id])
    propostas.push({id:doc.id,...Object.fromEntries(campos.filter(k=>p[k]!==undefined).map(k=>[k,p[k]])),feira:p.feira||nomesFeiras.get(p.feiraId)||'Feira não informada',organizadoraNome:nomes.get(p.organizadoraId)||'Sem organizadora',estadoProducao:estado,resumoArtes:resumo,pagamento:pg.exists?{status:pg.data().status,valorCentavos:pg.data().valorCentavos,pendenciaCancelamento:pg.data().pendenciaCancelamento||false}:null,
      ...(perfil.papel==='admin'&&compativel&&d.excluidas!==true?{levantamentoSugerido:{modeloVersao:modelo.data().atualizadoEm||null,quantitativos}}:{})})
  }))
  return {propostas:propostas.sort((a,b)=>politica.momento(b.criadoEm)-politica.momento(a.criadoEm)),cursor:s.size===40?s.docs.at(-1).id:null}
})
exports.confirmarQuantitativos=onCall(opcoes,async req=>{
  if((await equipe(req)).papel!=='admin')throw new HttpsError('permission-denied','Somente admin confere quantidades.')
  const db=getFirestore(),lista=req.data?.propostas
  if(!Array.isArray(lista)||!lista.length||lista.length>40)throw new HttpsError('invalid-argument','Selecione até 40 propostas por vez.')
  // Atualização atômica e auditada; não muda escolhas, preço, arte ou aprovação.
  await db.runTransaction(async tx=>{
    if((await equipe(req,tx)).papel!=='admin')throw new HttpsError('permission-denied','Acesso mudou.')
    const preparados=[]
    for(const item of lista){const p=await tx.get(db.doc(`propostas/${id(item.id)}`));if(!p.exists)throw new HttpsError('not-found','Proposta removida.');const dados=p.data(),m=await tx.get(db.doc(`modelos/${id(dados.modeloId)}`)),v=m.data()?.atualizadoEm,esperada=item.modeloVersao
      if((v?.seconds||0)!==(esperada?.seconds??esperada?._seconds??0)||(v?.nanoseconds||0)!==(esperada?.nanoseconds??esperada?._nanoseconds??0))throw new HttpsError('failed-precondition','O levantamento do projeto mudou. Atualize os relatórios e confira novamente.')
      const registro=dados.manifestoProducao,q=m.data()?.quantitativos
      if(!registro||(registro.materiais||[]).some(s=>!q?.[s.id]))throw new HttpsError('failed-precondition','Mapeamento incompatível. Confira as medidas do projeto original.')
      const ordem=dados.ordemProducaoId?await tx.get(db.doc(`ordensProducao/${id(dados.ordemProducaoId)}`)):null
      preparados.push({p,ordem,manifesto:{...registro,materiais:registro.materiais.map(s=>({...s,quantitativo:s.quantitativo||q[s.id]})),quantidadesConferidasPor:req.auth.uid}})
    }
    for(const r of preparados){tx.update(r.p.ref,{manifestoProducao:r.manifesto,quantidadesConferidasEm:FieldValue.serverTimestamp()});if(r.ordem?.data()?.propostaId===r.p.id)tx.update(r.ordem.ref,{manifesto:r.manifesto});tx.create(db.collection('auditoriaAdmin').doc(),{acao:'conferir_quantidades',alvo:r.p.id,autor:req.auth.uid,em:FieldValue.serverTimestamp()})}
  });return{ok:true}
})
