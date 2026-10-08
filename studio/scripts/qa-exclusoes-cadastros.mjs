// Exclusivamente demo-uset nos emuladores. Não altera cadastros reais.
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase/app'
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,deleteUser} from 'firebase/auth'
import {getFirestore,connectFirestoreEmulator,doc,getDoc,deleteDoc} from 'firebase/firestore'
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions'
import {getStorage,connectStorageEmulator,ref,uploadBytes,getBytes} from 'firebase/storage'
const portas={auth:Number(process.env.QA_AUTH_PORT||9198),firestore:Number(process.env.QA_FIRESTORE_PORT||8185),storage:Number(process.env.QA_STORAGE_PORT||9298),functions:Number(process.env.QA_FUNCTIONS_PORT||5001)}
const projeto='demo-uset',stamp=Date.now().toString(),senha='SomenteQA2026!',apps=[]
function valor(v){if(v===null)return{nullValue:null};if(Array.isArray(v))return{arrayValue:{values:v.map(valor)}};if(typeof v==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,valor(x)]))}};return typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:{doubleValue:v}}
async function seed(path,d){const r=await fetch(`http://127.0.0.1:${portas.firestore}/v1/projects/${projeto}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:valor(d).mapValue.fields})});assert.ok(r.ok,await r.text())}
async function conta(nome,papel,mais={}){const email=`excluir-${nome}-${stamp}@cadastros.test`,app=initializeApp({projectId:projeto,apiKey:'demo-key',storageBucket:`${projeto}.appspot.com`},email);apps.push(app);const auth=getAuth(app),db=getFirestore(app),fn=getFunctions(app,'southamerica-east1'),storage=getStorage(app);connectAuthEmulator(auth,`http://127.0.0.1:${portas.auth}`,{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',portas.firestore);connectFunctionsEmulator(fn,'127.0.0.1',portas.functions);connectStorageEmulator(storage,'127.0.0.1',portas.storage);const {user}=await createUserWithEmailAndPassword(auth,email,senha);await seed(`usuarios/${user.uid}`,{nome,email,papel,ativo:true,...mais});return{uid:user.uid,email,auth,db,storage,call:async(n,d)=>(await httpsCallable(fn,n)(d)).data}}
try{
 const admin=await conta('admin','admin'),outra=await conta('outro-admin','admin'),org=await conta('organizadora','organizadora'),intruso=await conta('intruso','produtor')
 await seed(`usuarios/${org.uid}`,{nome:'Organizadora QA',email:org.email,papel:'organizadora',ativo:true,organizadoraId:org.uid})
 const org2=await conta('organizadora-2','organizadora',{organizadoraId:org.uid}),orgNome=`Org exclusão ${stamp}`,fair1=`excluir-feira-1-${stamp}`,fair2=`excluir-feira-2-${stamp}`,modeloId=`excluir-modelo-${stamp}`
 await seed(`organizadoras/${org.uid}`,{nome:orgNome,email:org.email,ativo:true,cobranca:'organizadora'})
 await seed(`modelos/${modeloId}`,{nome:'Modelo QA',organizadoraIds:[org.uid,'outra-org-preservada']})
 await seed(`feiras/${fair1}`,{nome:'Primeira feira',organizadoraId:org.uid,modeloIds:[modeloId],ativo:true})
 await seed(`feiras/${fair2}`,{nome:'Segunda feira',organizadoraId:org.uid,modeloIds:[modeloId],ativo:true})
 const cliente=await conta('cliente','expositor',{feiraId:fair1,modeloId,organizadoraId:org.uid})
 const resumo=(tipo,id)=>admin.call('excluirCadastroAdmin',{acao:'consultar',tipo,id})
 const excluir=(tipo,id,confirmacao)=>admin.call('excluirCadastroAdmin',{acao:'excluir',tipo,id,confirmacao})
 for(const u of [cliente,org,intruso])for(const tipo of ['usuario','feira','organizadora'])await assert.rejects(u.call('excluirCadastroAdmin',{acao:'excluir',tipo,id:tipo==='usuario'?outra.uid:tipo==='feira'?fair1:org.uid,confirmacao:outra.email}),e=>e.code==='functions/permission-denied')
 await assert.rejects(excluir('usuario',admin.uid,admin.email),e=>e.code==='functions/failed-precondition')
 await assert.rejects(excluir('usuario',outra.uid,'errado'),e=>e.code==='functions/failed-precondition')
 assert.equal((await resumo('feira',fair1)).usuarios,1)
 await assert.rejects(excluir('feira',fair1,'Primeira feira'),e=>e.code==='functions/failed-precondition')
 assert.equal((await resumo('organizadora',org.uid)).feiras,2)
 await assert.rejects(excluir('organizadora',org.uid,orgNome),e=>e.code==='functions/failed-precondition')
 await admin.call('administrarUsuarios',{acao:'acesso',uid:cliente.uid,ativo:false})
 await assert.rejects(excluir('feira',fair1,'Primeira feira'),e=>e.code==='functions/failed-precondition')
 await admin.call('vincularExpositor',{uid:cliente.uid,feiraId:fair2,modeloId})
 await excluir('feira',fair1,'Primeira feira')
 await excluir('feira',fair1,'Primeira feira') // Repetição segura.
 assert.ok((await getDoc(doc(admin.db,'feiras',fair1))).data().excluidaEm)
 assert.equal((await getDoc(doc(admin.db,'feiras',fair1))).data().nome,'Primeira feira')
 assert.ok((await getDoc(doc(admin.db,'modelos',modeloId))).data().organizadoraIds.includes(org.uid))
 await assert.rejects(admin.call('salvarFeira',{id:fair1,nome:'Reativada indevidamente',organizadoraId:org.uid,modeloIds:[modeloId]}),e=>e.code==='functions/failed-precondition')
 await assert.rejects(admin.call('vincularExpositor',{uid:cliente.uid,feiraId:fair1,modeloId}),e=>e.code==='functions/failed-precondition')
 await assert.rejects(admin.call('cadastrarExpositor',{nome:'Novo',email:`novo-${stamp}@cadastros.test`,feiraId:fair1,modeloId}),e=>e.code==='functions/failed-precondition')
 await admin.call('administrarUsuarios',{acao:'acesso',uid:cliente.uid,ativo:true})
 await signInWithEmailAndPassword(cliente.auth,cliente.email,senha)
 const pid=`excluir-proposta-${stamp}`,path=`propostas/${cliente.uid}/${pid}/estande.glb`
 await uploadBytes(ref(cliente.storage,path),new Uint8Array([1,2,3]),{contentType:'model/gltf-binary'})
 await seed(`propostas/${pid}`,{cliente:cliente.uid,clienteNome:'Cliente QA preservado',feiraId:fair2,feira:'Segunda feira',organizadoraId:org.uid,decisaoComercial:'aprovada',arquivoPersonalizado:{caminho:path}})
 await seed(`pagamentos/${pid}`,{status:'paga',valorCentavos:5000})
 await seed(`emailsSaida/excluir-convite-${stamp}`,{destinatarioId:cliente.uid,status:'pendente_integracao'})
 await seed(`dispositivosPush/excluir-device-${stamp}`,{uid:cliente.uid,subscription:{endpoint:'https://push.test/qa'}})
 assert.equal((await resumo('usuario',cliente.uid)).propostas,1)
 await assert.rejects(deleteDoc(doc(admin.db,'usuarios',cliente.uid)))
 await excluir('usuario',cliente.uid,cliente.email)
 await excluir('usuario',cliente.uid,cliente.email)
 assert.equal((await getDoc(doc(admin.db,'usuarios',cliente.uid))).exists(),false)
 assert.equal((await getDoc(doc(admin.db,'usuariosExcluidos',cliente.uid))).data().estadoExclusao,'concluida')
 assert.equal((await getDoc(doc(admin.db,'propostas',pid))).data().decisaoComercial,'aprovada')
 assert.equal((await getDoc(doc(admin.db,'pagamentos',pid))).data().status,'paga')
 assert.equal((await getDoc(doc(admin.db,'emailsSaida',`excluir-convite-${stamp}`))).data().status,'cancelado')
 await assert.rejects(getDoc(doc(cliente.db,'propostas',pid)))
 await assert.rejects(signInWithEmailAndPassword(cliente.auth,cliente.email,senha))
 // Mesmo login removido, a organizadora conserva o acesso ao GLB do envio.
 assert.equal((await getBytes(ref(org.storage,path))).byteLength,3)
 const novo=await createUserWithEmailAndPassword(cliente.auth,cliente.email,senha)
 assert.notEqual(novo.user.uid,cliente.uid)
 await deleteUser(novo.user)
 await excluir('feira',fair2,'Segunda feira')
 assert.deepEqual((await getDoc(doc(admin.db,'modelos',modeloId))).data().organizadoraIds,['outra-org-preservada'])
 const p=await resumo('organizadora',org.uid);assert.equal(p.feiras,0);assert.equal(p.usuarios,0);assert.equal(p.logins,2)
 await excluir('organizadora',org.uid,orgNome)
 for(const u of [org,org2]){assert.equal((await getDoc(doc(admin.db,'usuarios',u.uid))).exists(),false);await assert.rejects(signInWithEmailAndPassword(u.auth,u.email,senha))}
 assert.equal((await getDoc(doc(admin.db,'organizadoras',org.uid))).data().ativo,false)
 assert.ok((await getDoc(doc(admin.db,'organizadoras',org.uid))).data().excluidaEm)
 assert.equal((await getDoc(doc(admin.db,'propostas',pid))).exists(),true)
 assert.equal((await getBytes(ref(admin.storage,path))).byteLength,3)
 await assert.rejects(org.call('administrarUsuarios',{acao:'listar'}))
 // Também remove outro admin e perfis sem login; nunca a própria conta.
 await excluir('usuario',outra.uid,outra.email)
 const semLogin=`excluir-sem-login-${stamp}`
 await seed(`usuarios/${semLogin}`,{nome:'Sem login',email:`sem-login-${stamp}@cadastros.test`,papel:'expositor',ativo:false})
 await admin.call('excluirExpositor',{uid:semLogin})
 assert.equal((await getDoc(doc(admin.db,'usuarios',semLogin))).exists(),false)
 assert.equal((await getDoc(doc(admin.db,'usuarios',admin.uid))).data().ativo,true)
 const pendente=`excluir-pendente-${stamp}`,emailPendente=`pendente-${stamp}@cadastros.test`
 await seed(`usuarios/${pendente}`,{nome:'Exclusão interrompida',email:emailPendente,papel:'expositor',ativo:false,exclusaoPendente:true})
 await seed(`usuariosExcluidos/${pendente}`,{nome:'Exclusão interrompida',email:emailPendente,papel:'expositor',ativo:false,estadoExclusao:'pendente'})
 await assert.rejects(admin.call('administrarUsuarios',{acao:'acesso',uid:pendente,ativo:true}),e=>e.code==='functions/failed-precondition')
 await excluir('usuario',pendente,emailPendente)
 assert.equal((await getDoc(doc(admin.db,'usuariosExcluidos',pendente))).data().estadoExclusao,'concluida')
 const legadoFair=`excluir-feira-legado-${stamp}`
 await seed(`feiras/${legadoFair}`,{nome:'Feira antiga sem organizadora'})
 await excluir('feira',legadoFair,'Feira antiga sem organizadora')
 assert.equal((await getDoc(doc(admin.db,'feiras',legadoFair))).data().ativo,false)
 // Corrida: exclusão de feira e cadastro não podem ambos produzir um órfão.
 const corridaOrg=`excluir-org-corrida-${stamp}`,corridaFair=`excluir-feira-corrida-${stamp}`
 await seed(`organizadoras/${corridaOrg}`,{nome:'Org corrida',ativo:true})
 await seed(`feiras/${corridaFair}`,{nome:'Feira corrida',organizadoraId:corridaOrg,modeloIds:[modeloId],ativo:true})
 const corridas=await Promise.allSettled([admin.call('cadastrarExpositor',{nome:'Cliente corrida',email:`corrida-${stamp}@cadastros.test`,feiraId:corridaFair,modeloId}),excluir('feira',corridaFair,'Feira corrida')])
 assert.ok(corridas.some(r=>r.status==='rejected'))
 if(corridas[0].status==='fulfilled'){assert.equal((await getDoc(doc(admin.db,'feiras',corridaFair))).data().ativo,true);assert.equal((await getDoc(doc(admin.db,'usuarios',corridas[0].value.uid))).data().feiraId,corridaFair)}
 else assert.equal((await getDoc(doc(admin.db,'feiras',corridaFair))).data().ativo,false)
 console.log('QA exclusões OK: admin exclusivo, confirmação, própria conta protegida, dependências inclusive bloqueados, feira compartilhada, login e e-mail liberados, histórico/GLB/pagamento preservados, convites cancelados, todos os logins da organizadora removidos, repetição segura, perfil sem login e corrida sem cadastros órfãos.')
}catch(e){console.error(e);process.exitCode=1}finally{await Promise.all(apps.map(deleteApp))}
