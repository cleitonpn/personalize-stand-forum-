const {HttpsError}=require('firebase-functions/v2/https')
const {getStorage}=require('firebase-admin/storage')
const {FieldValue,Timestamp}=require('firebase-admin/firestore')
const {randomUUID,createHash}=require('node:crypto')
const {revogarLinks}=require('./acessos')
const {prepararEvento,gravarEvento,entregarEventos}=require('./notificacoes')
const MIMES=['application/pdf','image/png','image/jpeg','image/svg+xml','application/postscript']
async function arquivosApoio(c,req,validar){
 const d=req.data
 if(c.perfil.papel!=='expositor')throw new HttpsError('permission-denied','Somente o cliente envia arquivos de apoio.')
 if(d.acao==='reservarApoio'){
  if(!Number.isSafeInteger(d.bytes)||d.bytes<=0||d.bytes>30*1024*1024||!MIMES.includes(d.mime)||!['logo','manual','referencia'].includes(d.categoria))throw new HttpsError('invalid-argument','Envie PDF, AI compatível com PDF, EPS, SVG, PNG ou JPG de até 30 MB.')
  const ref=c.ref.collection('uploads').doc(randomUUID()),caminho=`producao/${c.propostaId}/${ref.id}/arquivo`
  await c.db.runTransaction(async tx=>{const u=await validar(tx,c,req),w=await tx.get(c.ref);if(u.papel!=='expositor'||!w.exists)throw new HttpsError('permission-denied','Envio indisponível.');if(w.data().prazo?.toMillis()<Date.now())throw new HttpsError('failed-precondition','Peça uma extensão do prazo pelo chat.');tx.create(ref,{uid:req.auth.uid,tipo:'apoio',bytes:d.bytes,mime:d.mime,nome:String(d.nome||'arquivo').slice(0,180),categoria:d.categoria,caminho,usado:false,expiraEm:Timestamp.fromMillis(Date.now()+3600000)})})
  return{uploadId:ref.id,caminho}
 }
 if(typeof d.uploadId!=='string'||!/^[a-f0-9-]{36}$/.test(d.uploadId))throw new HttpsError('invalid-argument','Envio inválido.')
 const ref=c.ref.collection('uploads').doc(d.uploadId),r=(await ref.get()).data()
 if(!r||r.uid!==req.auth.uid||r.tipo!=='apoio'||r.expiraEm.toMillis()<Date.now())throw new HttpsError('failed-precondition','Envio expirado.')
 if(r.usado)return{ok:true}
 const file=getStorage().bucket().file(r.caminho),[m]=await file.getMetadata()
 if(Number(m.size)!==r.bytes||m.contentType!==r.mime)throw new HttpsError('invalid-argument','O arquivo não corresponde à reserva.')
 let inicio=Buffer.alloc(0);const hash=createHash('sha256')
 for await(const chunk of file.createReadStream()){hash.update(chunk);if(inicio.length<8192)inicio=Buffer.concat([inicio,chunk]).subarray(0,8192)}
 const txt=inicio.toString('utf8').replace(/^\uFEFF/,'').trimStart()
 const valido=r.mime==='application/pdf'?txt.startsWith('%PDF-'):r.mime==='application/postscript'?txt.startsWith('%!PS'):r.mime==='image/svg+xml'?/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(txt):r.mime==='image/png'?inicio.toString('hex').startsWith('89504e470d0a1a0a'):inicio.toString('hex').startsWith('ffd8ff')
 if(!valido)throw new HttpsError('invalid-argument','O conteúdo não corresponde ao formato escolhido.')
 await revogarLinks(file)
 const arquivo={nome:r.nome,mime:r.mime,bytes:r.bytes,caminho:r.caminho,hash:hash.digest('hex')}
 const evento=await prepararEvento({id:`apoio-${c.propostaId}-${ref.id}`,alvo:'equipe',autor:req.auth.uid,cliente:c.p.data().cliente,organizadoraId:c.p.data().organizadoraId,propostaId:c.propostaId,tipo:'apoio_novo',titulo:'Novo arquivo de apoio',corpo:'O cliente enviou material da marca para a produção.',url:`/artes/${c.propostaId}`});let ids=[]
 await c.db.runTransaction(async tx=>{const u=await validar(tx,c,req),s=await tx.get(ref),w=await tx.get(c.ref);if(u.papel!=='expositor')throw new HttpsError('permission-denied','Envio indisponível.');if(s.data()?.usado)return;if(w.data()?.prazo?.toMillis()<Date.now())throw new HttpsError('failed-precondition','O prazo terminou.');tx.update(ref,{usado:true});tx.create(c.ref.collection('apoio').doc(ref.id),{arquivo,categoria:r.categoria,enviadoPor:req.auth.uid,enviadoEm:FieldValue.serverTimestamp()});ids=gravarEvento(tx,evento)})
 await entregarEventos(ids);return{ok:true}
}
module.exports={arquivosApoio}
