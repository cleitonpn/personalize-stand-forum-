// Exclusivamente demo-uset nos emuladores locais.
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase/app'
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendPasswordResetEmail} from 'firebase/auth'
import {getFirestore,connectFirestoreEmulator,doc,getDoc,deleteDoc} from 'firebase/firestore'
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions'
import {getStorage,connectStorageEmulator,ref,uploadBytes,getBytes} from 'firebase/storage'
const stamp=Date.now(),apps=[],senha='SenhaQA2026!',projeto='demo-uset'
function valor(v){if(v===null)return{nullValue:null};if(Array.isArray(v))return{arrayValue:{values:v.map(valor)}};if(typeof v==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,valor(x)]))}};return typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:{integerValue:String(v)}}
async function seed(path,d){const r=await fetch(`http://127.0.0.1:8185/v1/projects/${projeto}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:valor(d).mapValue.fields})});assert.ok(r.ok,await r.text())}
async function estadoOrdem(id){const r=await fetch(`http://127.0.0.1:8185/v1/projects/${projeto}/databases/(default)/documents/ordensProducao/${id}`,{headers:{Authorization:'Bearer owner'}});assert.ok(r.ok);return(await r.json()).fields.estado.stringValue}
async function conta(nome,papel,mais={}){const email=`${nome}-${stamp}@admin.test`,app=initializeApp({projectId:projeto,apiKey:'demo-key',storageBucket:`${projeto}.appspot.com`},email);apps.push(app);const auth=getAuth(app),db=getFirestore(app),fn=getFunctions(app,'southamerica-east1'),storage=getStorage(app);connectAuthEmulator(auth,'http://127.0.0.1:9198',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8185);connectFunctionsEmulator(fn,'127.0.0.1',5001);connectStorageEmulator(storage,'127.0.0.1',9298);const {user}=await createUserWithEmailAndPassword(auth,email,senha);await seed(`usuarios/${user.uid}`,{nome,email,papel,ativo:true,...mais});return{uid:user.uid,email,auth,db,storage,call:async(n,d)=>(await httpsCallable(fn,n)(d)).data}}
try {
 const a=await conta('admin','admin'),c=await conta('cliente','expositor'),o=await conta('org','organizadora'),cv=await conta('cv','analista_cv')
 for(const u of [c,o,cv])await assert.rejects(u.call('administrarUsuarios',{acao:'listar'}))
 const us=await a.call('administrarUsuarios',{acao:'listar'});assert.ok(us.usuarios.some(u=>u.uid===c.uid));assert.ok(!JSON.stringify(us).includes('passwordHash'))
 await assert.rejects(a.call('administrarUsuarios',{acao:'acesso',uid:a.uid,ativo:false}))
 await a.call('administrarUsuarios',{acao:'acesso',uid:c.uid,ativo:false});assert.equal((await getDoc(doc(a.db,'usuarios',c.uid))).data().ativo,false)
 await signOut(c.auth);await assert.rejects(signInWithEmailAndPassword(c.auth,c.email,senha),e=>e.code==='auth/user-disabled')
 await a.call('administrarUsuarios',{acao:'acesso',uid:c.uid,ativo:true});await signInWithEmailAndPassword(c.auth,c.email,senha)
 const reset=await a.call('administrarUsuarios',{acao:'redefinir',uid:c.uid});assert.equal(reset.email,c.email);assert.ok(reset.link.includes('oobCode='));await sendPasswordResetEmail(a.auth,c.email)
 await assert.rejects(a.call('administrarUsuarios',{acao:'provisoria',uid:c.uid,senha:'123'}))
 await a.call('administrarUsuarios',{acao:'provisoria',uid:c.uid,senha:'NovaSenhaQA2026!'});assert.equal((await getDoc(doc(a.db,'usuarios',c.uid))).data().precisaTrocarSenha,true)
 await signOut(c.auth);await assert.rejects(signInWithEmailAndPassword(c.auth,c.email,senha));await signInWithEmailAndPassword(c.auth,c.email,'NovaSenhaQA2026!')
 await a.call('administrarUsuarios',{acao:'editar',uid:c.uid,nome:'Empresa QA editada',telefone:'11999999999',papel:'admin'});assert.equal((await getDoc(doc(a.db,'usuarios',c.uid))).data().papel,'expositor')
 await a.call('administrarUsuarios',{acao:'sessoes',uid:c.uid})
 const pid=`qa-admin-${stamp}`,oid=`ordem-admin-${stamp}`,caminho=`propostas/${c.uid}/${pid}/estande.glb`
 await uploadBytes(ref(c.storage,caminho),new Uint8Array([1,2,3]),{contentType:'model/gltf-binary'})
 await seed(`propostas/${pid}`,{cliente:c.uid,clienteNome:'Empresa QA',modeloNome:'QA',decisaoComercial:'aprovada',organizadoraId:o.uid,feiraId:'qa',arquivoPersonalizado:{caminho}})
 await seed(`ordensProducao/${oid}`,{propostaId:pid,estado:'liberada',revisao:1,feiraId:'qa',equipeIds:[]})
 await seed(`acessosProducao/${pid}`,{ordemId:oid,estado:'liberada',feiraId:'qa',equipeIds:[]})
 await assert.rejects(c.call('gerenciarPropostasAdmin',{acao:'excluir',propostaId:pid}));await assert.rejects(deleteDoc(doc(a.db,'propostas',pid)))
 await seed(`pagamentos/${pid}`,{status:'paga'});await assert.rejects(a.call('gerenciarPropostasAdmin',{acao:'excluir',propostaId:pid}));assert.equal((await getDoc(doc(a.db,'propostas',pid))).exists(),true)
 await seed(`pagamentos/${pid}`,{status:'aguardando_integracao'})
 await a.call('gerenciarPropostasAdmin',{acao:'excluir',propostaId:pid});await a.call('gerenciarPropostasAdmin',{acao:'excluir',propostaId:pid})
 assert.equal((await getDoc(doc(a.db,'propostas',pid))).exists(),false);assert.equal(await estadoOrdem(oid),'suspensa');await assert.rejects(getDoc(doc(a.db,'ordensProducao',oid)))
 await assert.rejects(getDoc(doc(c.db,'propostasExcluidas',pid)));await assert.rejects(getBytes(ref(c.storage,caminho)))
 assert.ok((await a.call('gerenciarPropostasAdmin',{acao:'lixeira'})).propostas.some(p=>p.id===pid))
 await a.call('gerenciarPropostasAdmin',{acao:'restaurar',propostaId:pid});assert.equal((await getDoc(doc(a.db,'propostas',pid))).data().decisaoComercial,'pendente');assert.equal(await estadoOrdem(oid),'suspensa')
 assert.equal((await getDoc(doc(a.db,'pagamentos',pid))).data().status,'cancelada');assert.equal((await getBytes(ref(c.storage,caminho))).byteLength,3)
 console.log('QA admin OK: isolamento, bloqueio/liberação de login real, redefinição, senha provisória, edição sem elevar papel, cobrança protegida, lixeira e restauração sem liberar produção.')
} finally {for(const app of apps)await deleteApp(app)}
