// Somente emuladores demo-uset. Nenhuma conta ou proposta de produção é modificada.
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase/app'
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword} from 'firebase/auth'
import {getFirestore,connectFirestoreEmulator,doc,getDoc} from 'firebase/firestore'
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions'
import {getStorage,connectStorageEmulator,ref,uploadBytes,getBytes,getDownloadURL} from 'firebase/storage'
import {enviarGLBProposta} from '../src/lib/envioProposta.js'
import {readFile} from 'node:fs/promises'
const portas={auth:Number(process.env.QA_AUTH_PORT||9198),firestore:Number(process.env.QA_FIRESTORE_PORT||8185),storage:Number(process.env.QA_STORAGE_PORT||9298),functions:Number(process.env.QA_FUNCTIONS_PORT||5001)}
const senha='SomenteQA2026!',apps=[],stamp=Date.now().toString(),projeto='demo-uset'
function valor(v){if(v===null)return{nullValue:null};if(Array.isArray(v))return{arrayValue:{values:v.map(valor)}};if(typeof v==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,valor(x)]))}};return typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:{doubleValue:v}}
async function seed(path,d){const r=await fetch(`http://127.0.0.1:${portas.firestore}/v1/projects/${projeto}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:valor(d).mapValue.fields})});if(!r.ok)throw Error(await r.text())}
async function conta(nome,papel,mais={}){const email=`${nome}-${stamp}@operacao.test`,app=initializeApp({projectId:projeto,apiKey:'demo-key',storageBucket:`${projeto}.appspot.com`},email);apps.push(app);const auth=getAuth(app),db=getFirestore(app),fn=getFunctions(app,'southamerica-east1'),storage=getStorage(app);connectAuthEmulator(auth,`http://127.0.0.1:${portas.auth}`,{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',portas.firestore);connectFunctionsEmulator(fn,'127.0.0.1',portas.functions);connectStorageEmulator(storage,'127.0.0.1',portas.storage);let c;try{c=await createUserWithEmailAndPassword(auth,email,senha)}catch{c=await signInWithEmailAndPassword(auth,email,senha)}const uid=c.user.uid;await seed(`usuarios/${uid}`,{nome,email,papel,ativo:true,...mais});return{uid,email,db,storage,call:async(n,d)=>(await httpsCallable(fn,n)(d)).data}}

try{
 const feiraId=`qa-blocos-${stamp}`,outra=`qa-fora-${stamp}`
 await seed(`feiras/${feiraId}`,{nome:'Feira 300 estandes'});await seed(`feiras/${outra}`,{nome:'Feira de outra gestão'})
 const admin=await conta('admin-blocos','admin'),gestor=await conta('gerente-blocos','gerente_operacional',{feiraIds:[feiraId]}),produtor=await conta('produtor-blocos','produtor',{feiraIds:[feiraId],equipeIds:[]}),intruso=await conta('intruso-blocos','gerente_operacional',{feiraIds:[outra]})
 const equipe=await gestor.call('operacao',{acao:'equipe',nome:'Equipe do bloco',especialidade:'montagem',feiraIds:[feiraId],membros:[produtor.uid],responsavelUid:produtor.uid}),original=await gestor.call('operacao',{acao:'equipe',nome:'Equipe anterior',especialidade:'montagem',feiraIds:[feiraId],membros:[]})
 const estandes=Array.from({length:300},(_,i)=>({id:`qa-bloco-${stamp}-${i}`,revisao:1}))
 const writes=estandes.map((a,i)=>({update:{name:`projects/${projeto}/databases/(default)/documents/ordensProducao/${a.id}`,fields:valor({cliente:'cliente-bloco',clienteNome:`Empresa ${i+1}`,feiraId,feira:'Feira 300 estandes',modeloNome:'Padrão QA',localizacao:String(i+1),propostaId:`qa-bloco-proposta-${stamp}-${i}`,estado:'liberada',revisao:1,equipeIds:[original.id],produtorIds:[],atendimentoIds:[]}).mapValue.fields}}))
 const r=await fetch(`http://127.0.0.1:${portas.firestore}/v1/projects/${projeto}/databases/(default)/documents:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});assert.ok(r.ok,await r.text())
 const pedido={acao:'atribuirBloco',feiraId,nome:'Bloco A',equipeIds:[equipe.id],modo:'adicionar',estandes}
 await assert.rejects(intruso.call('operacao',pedido));await assert.rejects(produtor.call('operacao',pedido));await assert.rejects(getDoc(doc(produtor.db,'ordensProducao',estandes[0].id)))
 const resultado=await gestor.call('operacao',pedido);assert.equal(resultado.aplicadas.length,300);assert.equal(resultado.falhas.length,0)
 const pendencias=estandes.map(a=>({update:{name:`projects/${projeto}/databases/(default)/documents/ordensProducao/${a.id}/pendencias/qa`,fields:valor({descricao:'Conferir montagem',equipeId:equipe.id,status:'aberta',revisao:1}).mapValue.fields}}))
 const rp=await fetch(`http://127.0.0.1:${portas.firestore}/v1/projects/${projeto}/databases/(default)/documents:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes:pendencias})});assert.ok(rp.ok,await rp.text())
 let depois=null,paginas=0;const relatorio=[];do{const r=await gestor.call('operacao',{acao:'relatorio',feiraId,depois});relatorio.push(...r.linhas);depois=r.proximaPagina;paginas++}while(depois);assert.equal(paginas,3);assert.equal(relatorio.length,300);assert.equal(new Set(relatorio.map(a=>a.ordemId)).size,300)
 const lista=await gestor.call('operacao',{acao:'listar'});assert.equal(lista.ordens.length,300);assert.ok(lista.ordens.every(o=>o.blocoId===resultado.blocoId&&o.equipeIds.includes(equipe.id)&&o.equipeIds.includes(original.id)));assert.ok(lista.blocos.some(b=>b.id===resultado.blocoId))
 assert.ok((await getDoc(doc(produtor.db,'ordensProducao',estandes[299].id))).exists())
 const duplicada=await gestor.call('operacao',{...pedido,blocoId:resultado.blocoId});assert.equal(duplicada.aplicadas.length,300);assert.equal((await getDoc(doc(gestor.db,'ordensProducao',estandes[0].id))).data().equipeIds.length,2)
 await gestor.call('operacao',{...pedido,blocoId:resultado.blocoId,modo:'substituir',equipeIds:[original.id],estandes:[estandes[0]]});await assert.rejects(getDoc(doc(produtor.db,'ordensProducao',estandes[0].id)))
 const parcial=await gestor.call('operacao',{...pedido,blocoId:resultado.blocoId,estandes:[{...estandes[1],revisao:2},...estandes.slice(2,42)]});assert.equal(parcial.aplicadas.length,1);assert.equal(parcial.falhas.length,40)
 await assert.rejects(admin.call('operacao',{...pedido,feiraId:outra,blocoId:resultado.blocoId,estandes:[estandes[1]]}))
 console.log('QA blocos OK: 300 estandes por seleção manual, isolamento da gestão, acesso do produtor via equipe, adição sem duplicar/remover equipes, substituição explícita, blocos reutilizáveis e falhas parciais por revisão informadas.')
}finally{await Promise.all(apps.map(deleteApp))}
