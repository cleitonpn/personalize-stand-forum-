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
async function conta(nome,papel,mais={}){const email=`${nome}-${stamp}@aprovacao.test`,app=initializeApp({projectId:projeto,apiKey:'demo-key',storageBucket:`${projeto}.appspot.com`},email);apps.push(app);const auth=getAuth(app),db=getFirestore(app),fn=getFunctions(app,'southamerica-east1'),storage=getStorage(app);connectAuthEmulator(auth,`http://127.0.0.1:${portas.auth}`,{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',portas.firestore);connectFunctionsEmulator(fn,'127.0.0.1',portas.functions);connectStorageEmulator(storage,'127.0.0.1',portas.storage);let c;try{c=await createUserWithEmailAndPassword(auth,email,senha)}catch{c=await signInWithEmailAndPassword(auth,email,senha)}const uid=c.user.uid;await seed(`usuarios/${uid}`,{nome,email,papel,ativo:true,...mais});return{uid,email,db,storage,call:async(n,d)=>(await httpsCallable(fn,n)(d)).data}}
try{
 const feiraId=`qa-feira-${stamp}`,outra=`qa-outra-${stamp}`,modeloId=`qa-modelo-${stamp}`
 await seed(`feiras/${feiraId}`,{nome:'Feira de integração QA'});await seed(`feiras/${outra}`,{nome:'Outra feira QA'})
 const admin=await conta('admin','admin'),cliente=await conta('cliente','expositor',{cadastroCompleto:true,modeloId,feiraId}),cv=await conta('cv','analista_cv',{feiraIds:[feiraId]}),campo=await conta('campo','produtor',{feiraIds:[feiraId]}),intruso=await conta('cv-outra','analista_cv',{feiraIds:[outra]})
 const modelo={nome:'Padrão QA',superficies:[{id:'parede',nome:'Parede esquerda',podeArte:true,papel:'bagum',pecas:['p']}],objetos:[{id:'bistro',nome:'Bistrô padrão',pecas:['b']}],complementos:[],artesMedidas:[{id:'parede',nome:'Parede esquerda',confirmada:true,larguraCm:300,alturaCm:250,perfilId:'lona-parede'}]}
 await seed(`modelos/${modeloId}`,modelo)
 const bytes=await readFile(new URL('../dev/qa.local/estande.glb',import.meta.url))
 async function proposta(sufixo){
   const id=`qa-aprovacao-${stamp}-${sufixo}`
   const arquivoPersonalizado=await enviarGLBProposta(cliente.storage,cliente.uid,id,new Blob([bytes]))
   const caminho=arquivoPersonalizado.caminho
   await assert.rejects(getDownloadURL(ref(cliente.storage,caminho)),e=>e.code==='storage/unauthorized')
   await cliente.call('registrarProposta',{id,proposta:{cliente:cliente.uid,modeloId,feiraId,arquivoPersonalizado,quantidadePersonalizada:1,total:0,itens:[],acabamentos:{parede:{artePendente:true}},areasArte:[{id:'parede',superficieIds:['parede']}]}})
   const salva=(await getDoc(doc(cliente.db,'propostas',id))).data()
   assert.equal(salva.arquivoPersonalizado.url,arquivoPersonalizado.url)
   assert.ok(!salva.arquivoPersonalizado.url.includes('token='))
   assert.equal((await getBytes(ref(cliente.storage,caminho))).byteLength,bytes.length)
   return{id,caminho}
 }
 const p=await proposta('1'),nova=await proposta('2')
 await assert.rejects(campo.call('decidirProposta',{propostaId:p.id,decisao:'aprovada'}))
 assert.equal((await cv.call('listarArtesEquipe',{})).propostas.length,0)
 const {ordemId}=await admin.call('decidirProposta',{propostaId:p.id,decisao:'aprovada'})
 assert.equal((await cliente.call('estadoPersonalizacao',{})).bloqueada,true)
 await assert.rejects(proposta('bloqueada'),e=>e.code==='functions/failed-precondition')
 const ordem=(await getDoc(doc(admin.db,'ordensProducao',ordemId))).data()
 assert.equal(ordem.manifesto.moveis[0].nome,'Bistrô padrão');assert.equal(ordem.revisao,1);assert.equal(ordem.total,undefined)
 for(const campo of ['blocoId','equipeIds','produtorIds','atendimentoIds'])assert.equal(ordem[campo],undefined)
 await assert.rejects(getDoc(doc(campo.db,'ordensProducao',ordemId)))
 await assert.rejects(getDoc(doc(intruso.db,'ordensProducao',ordemId)))
 await assert.rejects(getDoc(doc(cv.db,'propostas',p.id)))
 const lista=(await cv.call('listarArtesEquipe',{})).propostas
 assert.ok(lista.some(x=>x.id===p.id));assert.ok(lista.every(x=>!('total' in x)&&!('equipeIds' in x)))
 assert.ok(!(await intruso.call('listarArtesEquipe',{})).propostas.some(x=>x.id===p.id))
 await assert.rejects(campo.call('listarArtesEquipe',{}))
 assert.equal((await getBytes(ref(cv.storage,p.caminho))).byteLength,bytes.length)
 await assert.rejects(getBytes(ref(campo.storage,p.caminho)))
 for(const acao of ['listar','equipe','vincular','atribuirBloco','cadastroAcesso','pendencia','concluirEstande','relatorio']){
   await assert.rejects(admin.call('operacao',{acao,ordemId,revisao:1}),e=>e.code==='functions/failed-precondition')
 }
 await assert.rejects(admin.call('notificacoesUsuario',{acao:'registrarNativo',plataforma:'android',token:'a'.repeat(100)}),e=>e.code==='functions/failed-precondition')
 const legadoId=`qa-legado-${stamp}`
 await seed(`equipesOperacionais/${legadoId}`,{nome:'Equipe preservada',feiraIds:[feiraId]})
 await seed(`blocosOperacionais/${legadoId}`,{nome:'Bloco preservado',feiraId})
 await seed(`ordensProducao/${ordemId}/pendencias/${legadoId}`,{descricao:'Registro preservado',status:'aberta',revisao:1})
 assert.ok((await getDoc(doc(admin.db,'equipesOperacionais',legadoId))).exists())
 await assert.rejects(getDoc(doc(campo.db,'equipesOperacionais',legadoId)))
 await assert.rejects(getDoc(doc(campo.db,'blocosOperacionais',legadoId)))
 await assert.rejects(getDoc(doc(campo.db,'ordensProducao',ordemId,'pendencias',legadoId)))
 const path=`operacao/ordensProducao/${ordemId}/${legadoId}`
 await seed(`uploadsOperacionais/${legadoId}`,{uid:admin.uid,tipo:'ordensProducao',parentId:ordemId,usado:false,bytes:5,mime:'application/pdf',expiraEm:null})
 await assert.rejects(uploadBytes(ref(admin.storage,path),new TextEncoder().encode('%PDF-'),{contentType:'application/pdf'}))
 const arte=(c,acao,d={})=>c.call('artesProposta',{acao,propostaId:p.id,areaId:'parede',...d})
 await arte(cliente,'iniciar')
 const areaRef=doc(cliente.db,'artesPropostas',p.id,'areas','parede')
 const ler=async()=>(await getDoc(areaRef)).data()
 let area=await ler()
 if(!area.confirmada){await arte(cv,'configurar',{versao:area.versao,revisao:area.revisao,larguraCm:300,alturaCm:250,perfilId:'lona-parede',sangriaMm:100,margemMm:100});area=await ler()}
 const {especificacaoEmPdf}=await import('../src/lib/producao/core/especificacaoPdf.js')
 const {PERFIS_PADRAO}=await import('../src/lib/producao/perfis.js')
 const {createHash}=await import('node:crypto')
 const pdf=especificacaoEmPdf({peca:{larguraCm:300,alturaCm:250,rotulo:'Parede QA'},perfil:PERFIS_PADRAO[0],politica:{sangriaMinimaMm:0}})
 const hash=createHash('sha256').update(pdf).digest('hex')
 const upload=async(c,tipo)=>{const a=await ler(),r=await arte(c,'reservar',{tipo,versao:a.versao,revisao:a.revisao,bytes:pdf.length,mime:'application/pdf',nome:`${tipo}.pdf`});await uploadBytes(ref(c.storage,r.caminho),pdf,{contentType:'application/pdf'});return r}
 const envio=await upload(cliente,'arte')
 await arte(cliente,'enviar',{versao:area.versao,revisao:area.revisao,uploadId:envio.uploadId,relatorio:{veredicto:'aprovado',escalaFator:1,achados:[],hash}})
 assert.equal((await ler()).status,'recebida')
 const prova=await upload(cv,'prova');area=await ler()
 await arte(cv,'prova',{versao:area.versao,revisao:area.revisao,uploadId:prova.uploadId})
 await arte(cliente,'responder',{versao:area.versao,revisao:area.revisao,provaId:prova.uploadId,aprovar:true})
 await arte(cv,'impressao',{versao:area.versao,revisao:area.revisao,status:'em_impressao'})
 await arte(cv,'impressao',{versao:area.versao,revisao:area.revisao,status:'impressa'})
 assert.equal((await ler()).status,'impressa')
 await assert.rejects(arte(campo,'iniciar'))
 await assert.rejects(arte(intruso,'iniciar'))
 // A nova revisão conserva a distribuição histórica sem voltar a gerenciá-la.
 await seed(`ordensProducao/${ordemId}`,{...ordem,equipeIds:[legadoId],blocoId:legadoId})
 await assert.rejects(admin.call('decidirProposta',{propostaId:nova.id,decisao:'aprovada'}))
 await admin.call('decidirProposta',{propostaId:nova.id,decisao:'aprovada',confirmarSubstituicao:true})
 const revisada=(await getDoc(doc(admin.db,'ordensProducao',ordemId))).data()
 assert.equal(revisada.revisao,2);assert.deepEqual(revisada.equipeIds,[legadoId]);assert.equal(revisada.blocoId,legadoId)
 assert.ok((await getDoc(doc(admin.db,'ordensProducao',ordemId,'revisoes','1'))).exists())
 assert.ok((await getDoc(doc(admin.db,'ordensProducao',ordemId,'pendencias',legadoId))).exists())
 await admin.call('decidirProposta',{propostaId:nova.id,decisao:'recusada',motivo:'Solicitar revisão comercial'})
 assert.equal((await cliente.call('estadoPersonalizacao',{})).bloqueada,false)
 await assert.rejects(getDoc(doc(cv.db,'ordensProducao',ordemId)))
 await proposta('apos-suspensao')
 console.log('QA aprovação OK: GLB e manifesto, bloqueio comercial, isolamento CV, arte/prova/impressão, recusa do APK antigo, regras dos arquivos legados, suspensão, revisões e registros históricos preservados.')
}finally{await Promise.all(apps.map(deleteApp))}
