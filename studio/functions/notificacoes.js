const {onCall,HttpsError}=require('firebase-functions/v2/https')
const {onSchedule}=require('firebase-functions/v2/scheduler')
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore')
const {createHash,randomUUID}=require('node:crypto')
const webpush=require('web-push')
const {destinoValido,destinatarios,chave}=require('./notificacaoPolitica')
const REGIAO='southamerica-east1'
async function chaves(){const db=getFirestore(),ref=db.doc('configuracaoPrivada/webpush');return db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.exists)return s.data();const keys=webpush.generateVAPIDKeys();tx.create(ref,keys);return keys})}
async function prepararEvento(evento){
  const db=getFirestore(),usuarios=[]
  if(evento.alvo==='cliente'){const s=await db.doc(`usuarios/${evento.cliente}`).get();if(s.exists)usuarios.push({id:s.id,...s.data()})}
  else {const [admins,orgs]=await Promise.all([db.collection('usuarios').where('papel','==','admin').get(),evento.organizadoraId?db.collection('usuarios').where('organizadoraId','==',evento.organizadoraId).get():Promise.resolve({docs:[]})]);for(const s of [...admins.docs,...orgs.docs])usuarios.push({id:s.id,...s.data()})}
  return{...evento,destinatarios:[...new Set(destinatarios(usuarios,evento))]}
}
function gravarEvento(tx,evento){
  const db=getFirestore(),ids=[]
  for(const uid of evento.destinatarios){const id=chave(evento.id,uid),dados={destinatario:uid,tipo:evento.tipo,titulo:evento.titulo,corpo:evento.corpo,url:evento.url,cliente:evento.cliente,organizadoraId:evento.organizadoraId||null,propostaId:evento.propostaId||null,lida:false,criadoEm:FieldValue.serverTimestamp()}
    tx.create(db.doc(`notificacoes/${id}`),dados)
    tx.create(db.doc(`filaPush/${id}`),{...dados,status:'pendente',tentativas:0,proximaEm:Timestamp.now()});ids.push(id)
  }
  return ids
}
async function permitido(d){const db=getFirestore(),s=await db.doc(`usuarios/${d.destinatario}`).get(),u=s.data();if(!u||u.ativo===false)return false
  if(u.papel==='admin')return true
  if(u.papel==='expositor')return d.cliente===s.id
  if(u.papel!=='organizadora'||!d.organizadoraId||u.organizadoraId!==d.organizadoraId)return false
  if(d.propostaId){const p=await db.doc(`propostas/${d.propostaId}`).get();return p.data()?.organizadoraId===u.organizadoraId}
  const c=await db.doc(`usuarios/${d.cliente}`).get();return c.data()?.organizadoraId===u.organizadoraId
}
async function entregar(id){
  const db=getFirestore(),ref=db.doc(`filaPush/${id}`),lease=randomUUID()
  const dados=await db.runTransaction(async tx=>{const s=await tx.get(ref),d=s.data();if(!d||['entregue','sem_dispositivo','cancelada','falhou'].includes(d.status)||d.proximaEm?.toMillis()>Date.now()||d.leaseAte?.toMillis()>Date.now())return null;tx.update(ref,{lease,leaseAte:Timestamp.fromMillis(Date.now()+120000)});return d})
  if(!dados)return
  try{
    if(!await permitido(dados)){await ref.update({status:'cancelada',leaseAte:null});return}
    const devices=await db.collection('dispositivosPush').where('uid','==',dados.destinatario).get()
    if(devices.empty){await ref.update({status:'sem_dispositivo',leaseAte:null});return}
    const keys=await chaves(),resultados=await Promise.all(devices.docs.map(async s=>{
      if((dados.dispositivosEntregues||[]).includes(s.id))return true
      if(!destinoValido(s.data().subscription?.endpoint)){await s.ref.delete();return true}
      try{
        if(!process.env.FIRESTORE_EMULATOR_HOST)await webpush.sendNotification(s.data().subscription,JSON.stringify({id,titulo:dados.titulo,corpo:dados.corpo,url:dados.url}),{vapidDetails:{subject:'https://personalizacao-stand.web.app',...keys},timeout:10000,TTL:86400,urgency:'normal',topic:id.slice(0,32)})
        await s.ref.update({ultimaEntregaEm:FieldValue.serverTimestamp()});await ref.update({dispositivosEntregues:FieldValue.arrayUnion(s.id)});return true
      }catch(e){if([404,410].includes(e.statusCode)){await s.ref.delete();return true}return false}
    }))
    const tentativas=dados.tentativas+1,ok=resultados.every(Boolean)
    await ref.update({status:ok?'entregue':tentativas>=6?'falhou':'pendente',tentativas,leaseAte:null,proximaEm:Timestamp.fromMillis(Date.now()+Math.min(3600000,30000*2**tentativas)),atualizadoEm:FieldValue.serverTimestamp()})
  }catch{await ref.update({status:dados.tentativas>=5?'falhou':'pendente',tentativas:dados.tentativas+1,leaseAte:null,proximaEm:Timestamp.fromMillis(Date.now()+60000)}).catch(()=>{});console.warn('Uma entrega push ficou pendente para nova tentativa.')}
}
async function entregarEventos(ids=[]){await Promise.allSettled(ids.map(entregar))}
exports.prepararEvento=prepararEvento;exports.gravarEvento=gravarEvento;exports.entregarEventos=entregarEventos
exports.processarNotificacoes=onSchedule({region:REGIAO,schedule:'every 5 minutes',timeoutSeconds:300},async()=>{const s=await getFirestore().collection('filaPush').where('status','==','pendente').orderBy('proximaEm').limit(100).get();await entregarEventos(s.docs.filter(d=>d.data().proximaEm?.toMillis()<=Date.now()).map(d=>d.id))})
exports.notificacoesUsuario=onCall({region:REGIAO},async req=>{
  if(!req.auth)throw new HttpsError('unauthenticated','Faça login.')
  const db=getFirestore(),perfil=(await db.doc(`usuarios/${req.auth.uid}`).get()).data(),d=req.data||{}
  if(!perfil||perfil.ativo===false)throw new HttpsError('permission-denied','Acesso desativado.')
  if(d.acao==='chave'){const k=await chaves();return{publicKey:k.publicKey}}
  if(d.acao==='registrar'){
    const s=d.subscription
    if(!destinoValido(s?.endpoint)||!/^[-\w]{85,90}$/.test(s?.keys?.p256dh||'')||!/^[-\w]{20,26}$/.test(s?.keys?.auth||''))throw new HttpsError('invalid-argument','Assinatura push inválida.')
    const id=createHash('sha256').update(s.endpoint).digest('hex')
    await db.doc(`dispositivosPush/${id}`).set({uid:req.auth.uid,subscription:{endpoint:s.endpoint,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}},atualizadoEm:FieldValue.serverTimestamp()})
    return{id}
  }
  if(d.acao==='desativar'){
    if(typeof d.id!=='string'||!/^[a-f0-9]{64}$/.test(d.id))throw new HttpsError('invalid-argument','Dispositivo inválido.')
    const ref=db.doc(`dispositivosPush/${d.id}`);await db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.data()?.uid===req.auth.uid)tx.delete(ref)});return{ok:true}
  }
  if(d.acao==='ler'){
    if(!Array.isArray(d.ids)||d.ids.length>100||d.ids.some(id=>typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id)))throw new HttpsError('invalid-argument','Avisos inválidos.')
    await db.runTransaction(async tx=>{const ss=await Promise.all(d.ids.map(id=>tx.get(db.doc(`notificacoes/${id}`))));for(const s of ss){if(s.data()?.destinatario!==req.auth.uid)throw new HttpsError('permission-denied','Aviso indisponível.')}for(const s of ss)tx.update(s.ref,{lida:true})});return{ok:true}
  }
  if(d.acao==='teste'){
    await db.runTransaction(async tx=>{const ref=db.doc(`controlePush/${req.auth.uid}`),s=await tx.get(ref);if((s.data()?.testeEm?.toMillis()||0)>Date.now()-20000)throw new HttpsError('resource-exhausted','Aguarde alguns segundos antes de testar novamente.');tx.set(ref,{testeEm:Timestamp.now()})})
    const evento=await prepararEvento({id:`teste-${randomUUID()}`,alvo:'cliente',autor:'teste',cliente:req.auth.uid,tipo:'teste',titulo:'USET Studio',corpo:'As notificações deste dispositivo estão ativadas.',url:'/notificacoes'})
    let ids=[];await db.runTransaction(async tx=>{ids=gravarEvento(tx,evento)});await entregarEventos(ids);const entrega=ids.length?(await db.doc(`filaPush/${ids[0]}`).get()).data()?.status:'sem_dispositivo';return{ok:true,entrega}
  }
  throw new HttpsError('invalid-argument','Ação inválida.')
})
