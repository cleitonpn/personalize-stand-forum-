const {onCall,HttpsError}=require('firebase-functions/v2/https')
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore')
const {getStorage}=require('firebase-admin/storage')
const {randomUUID,createHash}=require('node:crypto')
const {revogarLinks}=require('./acessos')
const {transicao}=require('./producaoEstado')
const {prepararEvento,gravarEvento,entregarEventos}=require('./notificacoes')
const REGIAO='southamerica-east1'
const id=(v)=>{if(typeof v!=='string'||!v||v.length>180||v.includes('/'))throw new HttpsError('invalid-argument','Identificador inválido.');return v}
const {arquivosApoio}=require('./apoio')
const limpo=(v,max=2000)=>String(v||'').trim().slice(0,max)
function podeLer(perfil,uid,p){return perfil&&perfil.ativo!==false&&(perfil.papel==='admin'||(perfil.papel==='expositor'&&p.cliente===uid)||(perfil.papel==='organizadora'&&perfil.organizadoraId&&perfil.organizadoraId===p.organizadoraId))}
async function contexto(req){
  if(!req.auth)throw new HttpsError('unauthenticated','Faça login.')
  const db=getFirestore(),propostaId=id(req.data?.propostaId)
  const [u,p]=await Promise.all([db.doc(`usuarios/${req.auth.uid}`).get(),db.doc(`propostas/${propostaId}`).get()])
  if(!p.exists||!podeLer(u.data(),req.auth.uid,p.data()))throw new HttpsError('permission-denied','Proposta indisponível para esta conta.')
  return{db,u,p,perfil:u.data(),propostaId,ref:db.doc(`artesPropostas/${propostaId}`)}
}
async function validarContexto(tx,c,req){const [u,p]=await Promise.all([tx.get(c.u.ref),tx.get(c.p.ref)]);if(!p.exists||!podeLer(u.data(),req.auth.uid,p.data()))throw new HttpsError('permission-denied','Seu acesso mudou.');return u.data()}
function limparRelatorio(r){
  if(!r||!['aprovado','ressalva','reprovado'].includes(r.veredicto))throw new HttpsError('invalid-argument','Análise inválida.')
  return {origem:'analise_local_informativa',veredicto:r.veredicto,escalaFator:[1,2,4,10].includes(r.escalaFator)?r.escalaFator:1,
    achados:(Array.isArray(r.achados)?r.achados:[]).slice(0,60).map(a=>({nivel:limpo(a.nivel,20),titulo:limpo(a.titulo,220),detalhe:limpo(a.detalhe,1800)})),hash:limpo(r.hash,64)}
}
async function conferirArquivo(c,req,reservaId,tipo){
  const reservaRef=c.db.doc(`artesPropostas/${c.propostaId}/uploads/${id(reservaId)}`),s=await reservaRef.get(),r=s.data()
  if(!r||r.uid!==req.auth.uid||r.tipo!==tipo||r.usado||r.expiraEm.toMillis()<Date.now())throw new HttpsError('failed-precondition','Envio expirado ou já utilizado. Selecione o arquivo novamente.')
  const file=getStorage().bucket().file(r.caminho),[m]=await file.getMetadata()
  if(Number(m.size)!==r.bytes||m.contentType!==r.mime)throw new HttpsError('invalid-argument','O arquivo não corresponde ao envio reservado.')
  const hash=createHash('sha256');let assinatura=Buffer.alloc(0)
  for await(const chunk of file.createReadStream()){hash.update(chunk);if(assinatura.length<8)assinatura=Buffer.concat([assinatura,chunk]).subarray(0,8)}
  const formato=assinatura.subarray(0,5).toString()==='%PDF-'?'application/pdf':assinatura.toString('hex').startsWith('89504e470d0a1a0a')?'image/png':assinatura.toString('hex').startsWith('ffd8ff')?'image/jpeg':null
  if(formato!==r.mime)throw new HttpsError('invalid-argument','O formato real do arquivo não corresponde ao tipo informado.')
  await revogarLinks(file)
  return{reservaRef,r,arquivo:{caminho:r.caminho,nome:r.nome,bytes:r.bytes,mime:r.mime,hash:hash.digest('hex')}}
}
exports.artesProposta=onCall({region:REGIAO,timeoutSeconds:300,memory:'1GiB'},async req=>{
  const c=await contexto(req),d=req.data,acao=d.acao
  if(acao==='iniciar'){
    await c.db.runTransaction(async tx=>{
      await validarContexto(tx,c,req);const existente=await tx.get(c.ref)
      if(existente.exists)return
      const modelo=await tx.get(c.db.doc(`modelos/${c.p.data().modeloId}`)),p=c.p.data()
      const escolhidas=Array.isArray(p.areasArte)?p.areasArte.map(a=>a.id):Object.entries(p.acabamentos||{}).filter(([,a])=>(a.arte||a.artePendente)&&!a.removido).map(([k])=>k)
      const areas=escolhidas.map(k=>{
        const s=modelo.data()?.superficies?.find(s=>s.id===k),medida=(p.areasArte||[]).find(a=>a.id===k)||modelo.data()?.artesMedidas?.find(a=>a.id===k)
        return{id:k,nome:limpo(medida?.nome||s?.nome||'Área de arte',180),larguraCm:Number(medida?.larguraCm)||0,alturaCm:Number(medida?.alturaCm)||0,perfilId:medida?.perfilId||'lona-parede',confirmada:medida?.confirmada===true||medida?.semGabarito===true,semGabarito:medida?.semGabarito===true,sangriaMm:medida?.sangriaMm??3,margemMm:medida?.margemMm??10}
      })
      if(!areas.length)for(const [i,nome] of (p.pendenciasArte||[]).entries())areas.push({id:`legado-${i}`,nome:limpo(nome,180),larguraCm:0,alturaCm:0,perfilId:'lona-parede'})
      if(areas.length>80)throw new HttpsError('failed-precondition','Divida as áreas de arte em até 80 itens.')
      tx.create(c.ref,{propostaId:c.propostaId,cliente:p.cliente,clienteNome:limpo(p.clienteNome,180)||'Expositor',organizadoraId:p.organizadoraId||null,feiraId:p.feiraId||null,criadoEm:FieldValue.serverTimestamp(),prazo:null})
      for(const a of areas)tx.create(c.ref.collection('areas').doc(id(a.id)),{...a,confirmada:!!a.confirmada,revisao:0,versao:0,status:'aguardando',arquivo:null,prova:null})
    });return{ok:true}
  }
  if(acao==='prazo'){
    if(c.perfil.papel!=='admin')throw new HttpsError('permission-denied','Somente o admin define o prazo.')
    const prazo=d.prazo?new Date(d.prazo):null
    if(prazo&&!Number.isFinite(prazo.getTime()))throw new HttpsError('invalid-argument','Prazo inválido.')
    const evento=await prepararEvento({id:randomUUID(),alvo:'cliente',autor:req.auth.uid,cliente:c.p.data().cliente,organizadoraId:c.p.data().organizadoraId,propostaId:c.propostaId,tipo:'prazo_arte',titulo:'Prazo de envio de artes atualizado',corpo:'Consulte o prazo atualizado na área de artes do seu estande.',url:`/artes/${c.propostaId}`});let ids=[]
    await c.db.runTransaction(async tx=>{const perfil=await validarContexto(tx,c,req);if(perfil.papel!=='admin')throw new HttpsError('permission-denied','Acesso restrito.');const s=await tx.get(c.ref);if(!s.exists)throw new HttpsError('failed-precondition','Abra as artes da proposta primeiro.');if((s.data().prazo?.toMillis()||null)===(prazo?.getTime()||null))return;tx.update(c.ref,{prazo:prazo?Timestamp.fromDate(prazo):null});ids=gravarEvento(tx,evento)});await entregarEventos(ids);return{ok:true}
  }
  if(['reservarApoio','enviarApoio'].includes(acao))return arquivosApoio(c,req,validarContexto)
  const areaId=id(d.areaId),areaRef=c.ref.collection('areas').doc(areaId)
  if(acao==='reservar'){
    const tipo=d.tipo,bytes=d.bytes,mime=d.mime
    if(!['arte','prova'].includes(tipo)||!Number.isSafeInteger(bytes)||bytes<=0||bytes>(tipo==='arte'?300:30)*1024*1024||!['application/pdf','image/png','image/jpeg'].includes(mime))throw new HttpsError('invalid-argument','Envie PDF, PNG ou JPG dentro do limite indicado.')
    const uploadId=randomUUID(),r=c.ref.collection('uploads').doc(uploadId)
    await c.db.runTransaction(async tx=>{
      const perfil=await validarContexto(tx,c,req),s=await tx.get(areaRef),workspace=await tx.get(c.ref),a=s.data()
      if(!a)throw new HttpsError('not-found','Área não encontrada.')
      try{transicao(a,tipo==='arte'?'enviar':'prova',perfil.papel,{revisao:d.revisao,versao:d.versao})}catch(e){throw new HttpsError('failed-precondition',e.message)}
      if(tipo==='arte'&&workspace.data()?.prazo?.toMillis()<Date.now())throw new HttpsError('failed-precondition','O prazo terminou. Peça uma extensão pelo chat.')
      tx.create(r,{uid:req.auth.uid,tipo,areaId,revisao:a.revisao,versao:a.versao,bytes,mime,nome:limpo(d.nome,180),caminho:`producao/${c.propostaId}/${uploadId}/arquivo`,usado:false,expiraEm:Timestamp.fromMillis(Date.now()+3600000)})
    });return{uploadId,caminho:`producao/${c.propostaId}/${uploadId}/arquivo`}
  }
  let envio=null
  if(acao==='enviar'||acao==='prova')envio=await conferirArquivo(c,req,d.uploadId,acao==='enviar'?'arte':'prova')
  const tipos={configurar:['gabarito_liberado','Gabarito liberado','As medidas de uma área foram confirmadas. Você já pode preparar e enviar a arte.'],enviar:['arte_nova','Nova arte recebida','Um expositor enviou uma nova versão da arte para conferência.'],prova:['prova_nova','Nova prova para aprovação','A prova da sua arte está pronta. Confira e aprove ou peça ajustes.'],devolver:['arte_reprovada','Sua arte precisa de ajustes','A produção deixou uma orientação para corrigir o arquivo.'],responder:[d.aprovar?'prova_aprovada':'prova_reprovada',d.aprovar?'Cliente aprovou a prova':'Cliente pediu ajustes na prova','Consulte a decisão do cliente na área de artes.'],impressao:['arte_producao','Produção da arte atualizada',d.status==='impressa'?'Sua arte foi marcada como impressa.':'Sua arte entrou em impressão.']}
  const descricao=tipos[acao],eventoId=randomUUID()
  const evento=descricao?await prepararEvento({id:eventoId,alvo:['enviar','responder'].includes(acao)?'equipe':'cliente',autor:req.auth.uid,cliente:c.p.data().cliente,organizadoraId:c.p.data().organizadoraId,propostaId:c.propostaId,tipo:descricao[0],titulo:descricao[1],corpo:descricao[2],url:`/artes/${c.propostaId}`}):null
  let avisos=[]
  await c.db.runTransaction(async tx=>{
    const perfil=await validarContexto(tx,c,req),s=await tx.get(areaRef),workspace=await tx.get(c.ref),a=s.data()
    if(!a)throw new HttpsError('not-found','Área não encontrada.')
    const apoios=acao==='logoPronto'?await tx.get(c.ref.collection('apoio').where('categoria','==','logo')):null
    if(apoios?.empty)throw new HttpsError('failed-precondition','O cliente precisa enviar um logo nos arquivos de apoio primeiro.')
    let reserva=null;if(envio)reserva=await tx.get(envio.reservaRef)
    if(envio&&(reserva.data()?.usado||envio.r.areaId!==areaId||envio.r.revisao!==a.revisao||envio.r.versao!==a.versao))throw new HttpsError('failed-precondition','A área mudou durante o envio. Recarregue.')
    if(acao==='enviar'&&workspace.data()?.prazo?.toMillis()<Date.now())throw new HttpsError('failed-precondition','Peça extensão do prazo pelo chat.')
    if(d.versao!==a.versao||d.revisao!==a.revisao)throw new HttpsError('failed-precondition','Esta área foi atualizada em outra tela. Recarregue.')
    const prova=acao==='prova'?{...envio.arquivo,id:envio.reservaRef.id,versao:a.versao,revisao:a.revisao}:null
    let patch
    try{patch=transicao(a,acao,perfil.papel,{...d,prova})}catch(e){throw new HttpsError('failed-precondition',e.message)}
    if(acao==='logoPronto'){patch.apoio=apoios.docs.map(s=>({id:s.id,arquivo:s.data().arquivo}));tx.create(areaRef.collection('versoes').doc(String(patch.versao)),{...patch,enviadoPor:req.auth.uid,enviadoEm:FieldValue.serverTimestamp()})}
    if(acao==='configurar'){
      if(![d.larguraCm,d.alturaCm].every(v=>Number.isFinite(v)&&v>0&&v<=10000)||!['lona-parede','testeira','adesivo-balcao','vinil-piso','placa','livre'].includes(d.perfilId)||![d.sangriaMm,d.margemMm].every(v=>Number.isFinite(v)&&v>=0&&v<=500)||d.margemMm*2>=Math.min(d.larguraCm,d.alturaCm)*10)throw new HttpsError('invalid-argument','Confira dimensões, sangria e margem. A margem segura deve caber dentro da peça.')
      patch={...patch,larguraCm:d.larguraCm,alturaCm:d.alturaCm,perfilId:d.perfilId,sangriaMm:d.sangriaMm,margemMm:d.margemMm,confirmada:true}
    }
    if(acao==='enviar'){
      const relatorio=limparRelatorio(d.relatorio)
      if(relatorio.hash!==envio.arquivo.hash)throw new HttpsError('invalid-argument','A análise pertence a outro arquivo.')
      if(d.contestar&&!limpo(d.motivo))throw new HttpsError('invalid-argument','Explique a solicitação de revisão.')
      patch={...patch,arquivo:envio.arquivo,relatorio,motivo:limpo(d.motivo)}
      tx.create(areaRef.collection('versoes').doc(String(patch.versao)),{...patch,medidas:{larguraCm:a.larguraCm,alturaCm:a.alturaCm,revisao:a.revisao},enviadoPor:req.auth.uid,enviadoEm:FieldValue.serverTimestamp()})
    }
    if(envio)tx.update(envio.reservaRef,{usado:true})
    tx.update(areaRef,{...patch,atualizadoEm:FieldValue.serverTimestamp()})
    tx.create(areaRef.collection('eventos').doc(),{acao,autor:req.auth.uid,papel:perfil.papel,versao:patch.versao??a.versao,revisao:patch.revisao??a.revisao,prova:prova||null,motivo:limpo(d.motivo),aprovou:d.aprovar===true,em:FieldValue.serverTimestamp()})
    if(evento)avisos=gravarEvento(tx,evento)
  });await entregarEventos(avisos);return{ok:true}
})

exports.contextoProposta=contexto
