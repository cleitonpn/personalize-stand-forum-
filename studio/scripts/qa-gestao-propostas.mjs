// Somente emuladores demo-uset. Nenhuma conta ou proposta de produção é modificada.
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase/app'
import {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword} from 'firebase/auth'
import {getFirestore,connectFirestoreEmulator,doc,getDoc} from 'firebase/firestore'
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions'
import {getStorage,connectStorageEmulator,ref,uploadBytes,getBytes,getDownloadURL} from 'firebase/storage'
import {enviarGLBProposta} from '../src/lib/envioProposta.js'
import {readFile,writeFile} from 'node:fs/promises'
import {linhasQuantidades,agruparQuantidades,propostasValidas} from '../functions/relatorios.mjs'
const portas={auth:Number(process.env.QA_AUTH_PORT||9198),firestore:Number(process.env.QA_FIRESTORE_PORT||8185),storage:Number(process.env.QA_STORAGE_PORT||9298),functions:Number(process.env.QA_FUNCTIONS_PORT||5001)}
const senha='SomenteQA2026!',apps=[],stamp=Date.now().toString(),projeto='demo-uset'
function valor(v){if(v===null)return{nullValue:null};if(Array.isArray(v))return{arrayValue:{values:v.map(valor)}};if(typeof v==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,valor(x)]))}};return typeof v==='string'?{stringValue:v}:typeof v==='boolean'?{booleanValue:v}:{doubleValue:v}}
async function seed(path,d){const r=await fetch(`http://127.0.0.1:${portas.firestore}/v1/projects/${projeto}/databases/(default)/documents/${path}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:valor(d).mapValue.fields})});if(!r.ok)throw Error(await r.text())}
async function conta(nome,papel,mais={}){const email=`${nome}-${stamp}@aprovacao.test`,app=initializeApp({projectId:projeto,apiKey:'demo-key',storageBucket:`${projeto}.appspot.com`},email);apps.push(app);const auth=getAuth(app),db=getFirestore(app),fn=getFunctions(app,'southamerica-east1'),storage=getStorage(app);connectAuthEmulator(auth,`http://127.0.0.1:${portas.auth}`,{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',portas.firestore);connectFunctionsEmulator(fn,'127.0.0.1',portas.functions);connectStorageEmulator(storage,'127.0.0.1',portas.storage);let c;try{c=await createUserWithEmailAndPassword(auth,email,senha)}catch{c=await signInWithEmailAndPassword(auth,email,senha)}const uid=c.user.uid;await seed(`usuarios/${uid}`,{nome,email,papel,ativo:true,...mais});return{uid,email,db,storage,call:async(n,d)=>(await httpsCallable(fn,n)(d)).data}}
try{
 const orgA=`gestao-org-a-${stamp}`,orgB=`gestao-org-b-${stamp}`,feiraId=`gestao-feira-${stamp}`,modeloId=`gestao-modelo-${stamp}`
 await seed(`organizadoras/${orgA}`,{nome:'Organizadora USET QA',cobranca:'montadora'});await seed(`organizadoras/${orgB}`,{nome:'Outra organizadora QA',cobranca:'organizadora'});await seed(`feiras/${feiraId}`,{nome:'Feira QA Relatórios',organizadoraId:orgA})
 const admin=await conta('gestao-admin','admin'),cliente=await conta('gestao-cliente','expositor',{cadastroCompleto:true,empresa:'Empresa Árvore',modeloId,feiraId,organizadoraId:orgA}),org=await conta('gestao-org','organizadora',{organizadoraId:orgA}),intruso=await conta('gestao-outra','organizadora',{organizadoraId:orgB}),campo=await conta('gestao-produtor','produtor'),cv=await conta('gestao-cv','analista_cv',{feiraIds:[feiraId]})
 const q={piso:{categoria:'Carpete',material:'Carpete',cor:'Azul',codigo:'AZ',areaM2:40,manual:true,origem:'conferencia'},parede:{categoria:'Bagum',material:'Bagum',cor:'Branco',codigo:'',areaM2:7.5,manual:true,origem:'conferencia'}}
 const modelo={nome:'Projeto QA 40 m²',organizadoraIds:[orgA],superficies:[{id:'piso',nome:'Piso / carpete',papel:'piso',tipoElemento:'piso',pecas:['piso']},{id:'parede',nome:'Parede esquerda',papel:'bagum',podeArte:true,pecas:['parede']}],objetos:[{id:'bistro',nome:'Bistrô com 3 banquetas',pecas:['b']}],complementos:[],quantitativos:q,artesMedidas:[{id:'parede',superficieIds:['parede'],nome:'Parede esquerda',confirmada:true,larguraCm:300,alturaCm:250,perfilId:'lona-parede'}]}
 await seed(`modelos/${modeloId}`,modelo)
 const bytes=await readFile(new URL('../dev/qa.local/estande.glb',import.meta.url)),propostaId=`gestao-${stamp}-proposta`,arquivoPersonalizado=await enviarGLBProposta(cliente.storage,cliente.uid,propostaId,new Blob([bytes]))
 await cliente.call('registrarProposta',{id:propostaId,proposta:{cliente:cliente.uid,modeloId,feiraId,organizadoraId:orgA,arquivoPersonalizado,quantidadePersonalizada:1,total:100,itens:[{id:'extra',nome:'Extra QA',total:100,unidade:'peca',quantidade:1,valorUnitario:100}],acabamentos:{parede:{artePendente:true}},areasArte:[{id:'parede',superficieIds:['parede']}],eletrica:{limites:{x0:-4,x1:4,z0:-2,z1:2},pontos:[{id:'e1',x:1,z:1,uso:'Notebook',tensao:'220 V'}]}}})
 for(const c of [cliente,campo,cv])await assert.rejects(c.call('listarPropostasGestao',{}),e=>e.code==='functions/permission-denied')
 for(let i=0;i<42;i++)await seed(`propostas/gestao-${stamp}-outro-${String(i).padStart(2,'0')}`,{cliente:`outro-${i}`,clienteNome:`Cliente ${i}`,modeloId,feiraId,organizadoraId:orgB,total:0,status:'recebida',criadoEm:{seconds:i}})
 const todos=async(c,opcoes={})=>{let cursor=null,lista=[];do{const r=await c.call('listarPropostasGestao',{...opcoes,...(cursor?{cursor}:{})});lista.push(...r.propostas);cursor=r.cursor}while(cursor);return lista}
 let minhas=await todos(org);assert.equal(minhas.length,1);assert.equal(minhas[0].id,propostaId);assert.equal(minhas[0].resumoArtes.contagens.aguardando,1)
 assert.equal((await todos(intruso)).length,42);assert.ok((await todos(intruso)).every(p=>p.organizadoraId===orgB));await assert.rejects(org.call('confirmarQuantitativos',{propostas:[{id:propostaId}]}))
 await admin.call('liberarProposta',{propostaId});await admin.call('decidirProposta',{propostaId,decisao:'aprovada'})
 minhas=await todos(org);assert.equal(minhas[0].estadoProducao,'liberada');assert.equal(agruparQuantidades(propostasValidas(minhas).flatMap(linhasQuantidades)).find(g=>g.categoria==='Carpete').quantidade,40)
 await admin.call('artesProposta',{acao:'iniciar',propostaId});assert.equal((await todos(org))[0].resumoArtes.total,1)
 await seed(`pagamentos/${propostaId}`,{status:'paga',valorCentavos:8000,cliente:cliente.uid,organizadoraId:orgA})
 await assert.rejects(org.call('gerenciarPropostasAdmin',{acao:'excluir',propostaId,motivo:'Desistência'}),e=>e.code==='functions/permission-denied')
 await assert.rejects(admin.call('gerenciarPropostasAdmin',{acao:'excluir',propostaId,motivo:'Desistência'}),e=>e.code==='functions/failed-precondition')
 await admin.call('gerenciarPropostasAdmin',{acao:'excluir',propostaId,motivo:'Desistência da feira',confirmarPendenciaFinanceira:true})
 assert.equal((await todos(org)).length,0);const retiradas=await todos(org,{excluidas:true});assert.equal(retiradas.length,1);assert.equal(retiradas[0].estadoProducao,'excluida');assert.equal(retiradas[0].pagamento.status,'paga');assert.equal(retiradas[0].pagamento.pendenciaCancelamento,true)
 assert.equal((await getDoc(doc(admin.db,'artesPropostas',propostaId))).exists(),true)
 assert.equal((await cliente.call('estadoPersonalizacao',{})).bloqueada,false)
 await assert.rejects(intruso.call('gerenciarPropostasAdmin',{acao:'restaurar',propostaId}),e=>e.code==='functions/permission-denied')
 await admin.call('gerenciarPropostasAdmin',{acao:'restaurar',propostaId})
 minhas=await todos(org);assert.equal(minhas[0].decisaoComercial,'pendente');assert.equal(minhas[0].liberadaEm,undefined);assert.notEqual(minhas[0].estadoProducao,'liberada');assert.equal((await getDoc(doc(admin.db,'pagamentos',propostaId))).data().status,'paga')
 const legado={...minhas[0].manifestoProducao,materiais:minhas[0].manifestoProducao.materiais.map(s=>({...s,quantitativo:null}))}
 await seed(`propostas/${propostaId}`,{...(await getDoc(doc(admin.db,'propostas',propostaId))).data(),manifestoProducao:legado})
 await assert.rejects(admin.call('confirmarQuantitativos',{propostas:[{id:propostaId,modeloVersao:{seconds:22}}]}),e=>e.code==='functions/failed-precondition')
 await admin.call('confirmarQuantitativos',{propostas:[{id:propostaId,modeloVersao:null}]})
 minhas=await todos(org);assert.equal(minhas[0].manifestoProducao.materiais[0].quantitativo.areaM2,40)
 await admin.call('decidirProposta',{propostaId,decisao:'aprovada'})
 await writeFile(new URL('../dev/qa.local/gestao.json',import.meta.url),JSON.stringify({adminEmail:`gestao-admin-${stamp}@aprovacao.test`,senha,propostaId,feiraId,modeloId,clienteEmail:cliente.email}))
 console.log('QA gestão OK: paginação, isolamento entre organizadoras, status das artes, 40 m² de carpete azul, somente admin retira/restaura produção, histórico e pagamento preservados, restauração pendente, conferência versionada de quantidades.');console.log(`Conta visual local: gestao-admin-${stamp}@aprovacao.test`)
}catch(e){console.error(e);process.exitCode=1}finally{await Promise.all(apps.map(deleteApp))}
