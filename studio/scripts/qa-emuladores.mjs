// Somente serviços locais demo-uset; nunca recebe configurações de produção.
import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import * as THREE from 'three'
import { initializeApp,deleteApp } from 'firebase/app'
import { getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,updateDoc,serverTimestamp } from 'firebase/firestore'
import { getStorage,connectStorageEmulator,ref,uploadBytes,getBytes,deleteObject } from 'firebase/storage'
import { getFunctions,connectFunctionsEmulator,httpsCallable } from 'firebase/functions'
import { criarCenaExemplo } from '../dev/exemplo.js'
import { exportarGLB } from '../src/lib/exportarGLB.js'
import { analisar } from '../src/lib/glb/analyze.js'
import { superficiesPadrao } from '../src/lib/glb/superficies.js'
import { detectarObjetos,numerar } from '../src/lib/glb/objetos.js'
import { organizarElementos } from '../src/lib/glb/elementos.js'
import { ETAPAS } from '../src/lib/jornada.js'

globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.()})} readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.()})}}
const projeto='demo-uset',senha='SomenteQA2026!',apps=[]
async function conta(email){const app=initializeApp({projectId:projeto,apiKey:'demo-key',storageBucket:`${projeto}.appspot.com`},email);apps.push(app);const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);connectAuthEmulator(auth,'http://127.0.0.1:9198',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8185);connectStorageEmulator(storage,'127.0.0.1',9298);let cred;try{cred=await createUserWithEmailAndPassword(auth,email,senha)}catch(e){if(e.code!=='auth/email-already-in-use')throw e;cred=await signInWithEmailAndPassword(auth,email,senha)}return {db,storage,uid:cred.user.uid}}
function valor(v){if(v===null)return {nullValue:null};if(Array.isArray(v))return {arrayValue:{values:v.map(valor)}};if(typeof v==='object')return {mapValue:{fields:Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined).map(([k,x])=>[k,valor(x)]))}};return typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:{doubleValue:v}}
async function seed(path,data){const r=await fetch(`http://127.0.0.1:8185/v1/projects/${projeto}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:valor(data).mapValue.fields})});if(!r.ok)throw Error(await r.text())}
const admin=await conta('admin@uset.test'),cliente=await conta('cliente@uset.test'),outro=await conta('outro@uset.test')
await seed(`usuarios/${admin.uid}`,{nome:'Admin QA',papel:'admin',ativo:true})
for(const c of [cliente,outro])await seed(`usuarios/${c.uid}`,{nome:'Expositor QA',papel:'expositor',ativo:true,modeloId:'qa-estande'})
const cena=criarCenaExemplo(),glb=await exportarGLB([cena]),analise=analisar(cena),papeis=Object.fromEntries(analise.materiais.map(m=>[m.nome,m.papelSugerido])),sups=superficiesPadrao(analise,papeis),objetos=numerar(detectarObjetos(analise,papeis,{superficies:sups})),superficies=organizarElementos(analise,sups,objetos)
await mkdir(new URL('../dev/qa.local/',import.meta.url),{recursive:true})
await writeFile(new URL('../dev/qa.local/estande.glb',import.meta.url),Buffer.from(await glb.arrayBuffer()))
const movel=new THREE.Scene();movel.add(new THREE.Mesh(new THREE.BoxGeometry(1,.7,.8),new THREE.MeshStandardMaterial({color:'#ad9569'})))
await writeFile(new URL('../dev/qa.local/mesa.glb',import.meta.url),Buffer.from(await (await exportarGLB([movel])).arrayBuffer()))
const modelo={nome:'Estande QA',arquivo:{url:'http://127.0.0.1:4501/dev/qa.local/estande.glb'},papeis,superficies,objetos,complementos:[],recorte:{x0:-4.1,x1:4.1,z0:-2.1,z1:2.1},precos:{bagum:{unidade:'m2',valor:30},madeira:{unidade:'m2',valor:45},eletrica:{unidade:'peca',valor:100,ativo:true}},status:'mapeado'}
await seed('modelos/qa-estande',modelo);await seed('modelos/qa-outro',{...modelo,nome:'Outro projeto QA'})
const metrica={uid:cliente.uid,modeloId:'qa-estande',dispositivo:'desktop',segundos:20,enviou:false,ultimaEtapa:'marca',acoes:{reinicio:1},etapas:Object.fromEntries(ETAPAS.map(e=>[e.id,{visitas:1,segundos:2,erros:0,concluiu:false}])),atualizadoEm:serverTimestamp()}
await setDoc(doc(cliente.db,'sessoesUso','qa-sessao'),metrica)
await assert.rejects(getDoc(doc(outro.db,'sessoesUso','qa-sessao')))
await assert.rejects(setDoc(doc(outro.db,'sessoesUso','qa-sessao'),{...metrica,uid:outro.uid}))
await assert.rejects(setDoc(doc(cliente.db,'sessoesUso','qa-invalida'),{...metrica,texto:'não permitido'}))
await assert.rejects(setDoc(doc(cliente.db,'mobiliario','qa-invalido'),{nome:'Sem acesso'}))
assert.equal((await getDoc(doc(admin.db,'sessoesUso','qa-sessao'))).exists(),true)
const propostaId=`qa-${Date.now()}`,caminho=`propostas/${cliente.uid}/${propostaId}/estande.glb`
await uploadBytes(ref(cliente.storage,caminho),new Uint8Array(await glb.arrayBuffer()),{contentType:'model/gltf-binary'})
await assert.rejects(getBytes(ref(outro.storage,caminho)))
const fn=getFunctions(apps[1],'southamerica-east1');connectFunctionsEmulator(fn,'127.0.0.1',5001)
await httpsCallable(fn,'registrarProposta')({id:propostaId,proposta:{cliente:cliente.uid,clienteEmail:'cliente@uset.test',arquivoPersonalizado:{caminho},clienteNome:'QA — regra de imutabilidade',modeloNome:'Estande QA',modeloId:'qa-estande',total:0,quantidadePersonalizada:0}})
await assert.rejects(uploadBytes(ref(cliente.storage,caminho),new Uint8Array([1]),{contentType:'model/gltf-binary'}))
await assert.rejects(deleteObject(ref(cliente.storage,caminho)))
assert.ok((await getBytes(ref(admin.storage,caminho))).byteLength>0)
await updateDoc(doc(admin.db,'usuarios',outro.uid),{ativo:false})
await assert.rejects(setDoc(doc(outro.db,'sessoesUso','qa-desativado'),{...metrica,uid:outro.uid}))
console.log('Regras verificadas: isolamento das métricas, schema restrito, biblioteca admin e GLB imutável. Contas locais admin@uset.test / cliente@uset.test, senha SomenteQA2026!')
await Promise.all(apps.map(deleteApp))
