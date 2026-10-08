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
 const feiraId=`qa-feira-${stamp}`,outra=`qa-outra-${stamp}`,modeloId=`qa-modelo-${stamp}`
 await seed(`feiras/${feiraId}`,{nome:'Feira operacional QA'});await seed(`feiras/${outra}`,{nome:'Outra feira QA'})
 const admin=await conta('admin','admin'),cliente=await conta('cliente','expositor',{cadastroCompleto:true,modeloId,feiraId}),gestor=await conta('gestor','gerente_operacional',{feiraIds:[feiraId]}),cv=await conta('cv','analista_cv',{feiraIds:[feiraId]}),campo=await conta('campo','equipe_producao',{feiraIds:[feiraId],equipeIds:[]}),intruso=await conta('intruso','analista_operacional',{feiraIds:[outra]})
 const modelo={nome:'Padrão QA',superficies:[{id:'parede',nome:'Parede esquerda',podeArte:true,papel:'bagum',pecas:['p']}],objetos:[{id:'bistro',nome:'Bistrô padrão',pecas:['b']}],complementos:[],artesMedidas:[{id:'parede',nome:'Parede esquerda',confirmada:true,larguraCm:300,alturaCm:250,perfilId:'lona-parede'}]}
 await seed(`modelos/${modeloId}`,modelo)
 const bytes=await readFile(new URL('../dev/qa.local/estande.glb',import.meta.url))
 async function proposta(sufixo){
   const id=`qa-operacao-${stamp}-${sufixo}`
   const arquivoPersonalizado=await enviarGLBProposta(cliente.storage,cliente.uid,id,new Blob([bytes]))
   const caminho=arquivoPersonalizado.caminho
   // Reproduz o erro anterior: a leitura antes do registro é proibida.
   await assert.rejects(getDownloadURL(ref(cliente.storage,caminho)),e=>e.code==='storage/unauthorized')
   await cliente.call('registrarProposta',{id,proposta:{cliente:cliente.uid,modeloId,feiraId,arquivoPersonalizado,quantidadePersonalizada:1,total:0,itens:[],acabamentos:{parede:{artePendente:true}},areasArte:[{id:'parede',superficieIds:['parede']}]}})
   const salva=(await getDoc(doc(cliente.db,'propostas',id))).data()
   assert.equal(salva.arquivoPersonalizado.url,arquivoPersonalizado.url)
   assert.ok(!salva.arquivoPersonalizado.url.includes('token='))
   assert.equal((await getBytes(ref(cliente.storage,caminho))).byteLength,bytes.length)
   return{id,caminho}
 }
 const p=await proposta('1'),nova=await proposta('2')
 assert.equal((await gestor.call('operacao',{acao:'listar'})).ordens.length,0)
 await assert.rejects(gestor.call('decidirProposta',{propostaId:p.id,decisao:'aprovada'}))
 const {ordemId}=await admin.call('decidirProposta',{propostaId:p.id,decisao:'aprovada'})
 assert.equal((await cliente.call('estadoPersonalizacao',{})).bloqueada,true);await assert.rejects(proposta('bloqueada'),e=>e.code==='functions/failed-precondition')
 const ordem=(await getDoc(doc(gestor.db,'ordensProducao',ordemId))).data();assert.equal(ordem.manifesto.moveis[0].nome,'Bistrô padrão');assert.equal(ordem.revisao,1);assert.equal(ordem.total,undefined)
 await assert.rejects(getDoc(doc(intruso.db,'ordensProducao',ordemId)));await assert.rejects(getDoc(doc(campo.db,'ordensProducao',ordemId)));await assert.rejects(getDoc(doc(cv.db,'propostas',p.id)))
 const equipe=await gestor.call('operacao',{acao:'equipe',nome:'Montagem QA',especialidade:'montagem',feiraIds:[feiraId],membros:[campo.uid],responsavelUid:campo.uid})
 await gestor.call('operacao',{acao:'vincular',ordemId,revisao:1,equipeIds:[equipe.id]})
 assert.equal((await getDoc(doc(campo.db,'ordensProducao',ordemId))).exists(),true)
 const novoAcesso=await admin.call('operacao',{acao:'cadastroAcesso',nome:'Analista cadastrado',email:'novo-'+stamp+'@operacao.test',papel:'analista_operacional',feiraIds:[feiraId]});assert.ok(novoAcesso.convite);assert.equal((await getDoc(doc(admin.db,'usuarios',novoAcesso.uid))).data().papel,'analista_operacional')
 await admin.call('operacao',{acao:'cadastroAcesso',nome:'Campo atualizado',email:campo.email,papel:'equipe_producao',feiraIds:[feiraId],ativo:false});await assert.rejects(getDoc(doc(campo.db,'ordensProducao',ordemId)))
 await admin.call('operacao',{acao:'cadastroAcesso',nome:'Campo atualizado',email:campo.email,papel:'equipe_producao',feiraIds:[feiraId],ativo:true});assert.equal((await getDoc(doc(campo.db,'ordensProducao',ordemId))).exists(),true)
 assert.ok((await getBytes(ref(campo.storage,p.caminho))).byteLength>0)
 await cv.call('artesProposta',{acao:'iniciar',propostaId:p.id});assert.equal((await getDoc(doc(cv.db,'artesPropostas',p.id,'areas','parede'))).data().nome,'Parede esquerda')
 await seed(`artesPropostas/${p.id}/areas/parede`,{id:'parede',nome:'Parede esquerda',confirmada:true,status:'recebida',revisao:0,versao:1,larguraCm:300,alturaCm:250,perfilId:'lona-parede',arquivo:{caminho:'arte-final-qa'}})
 await assert.rejects(cv.call('artesProposta',{acao:'impressao',propostaId:p.id,areaId:'parede',revisao:0,versao:1,status:'em_impressao'}))
 const prova=await cv.call('artesProposta',{acao:'reservar',propostaId:p.id,areaId:'parede',revisao:0,versao:1,tipo:'prova',bytes:5,mime:'application/pdf',nome:'Prova.pdf'})
 await uploadBytes(ref(cv.storage,prova.caminho),new TextEncoder().encode('%PDF-'),{contentType:'application/pdf'})
 await cv.call('artesProposta',{acao:'prova',propostaId:p.id,areaId:'parede',revisao:0,versao:1,uploadId:prova.uploadId})
 const areaAtual=(await getDoc(doc(cliente.db,'artesPropostas',p.id,'areas','parede'))).data()
 await cliente.call('artesProposta',{acao:'responder',propostaId:p.id,areaId:'parede',revisao:0,versao:1,provaId:areaAtual.prova.id,aprovar:true})
 await cv.call('artesProposta',{acao:'impressao',propostaId:p.id,areaId:'parede',revisao:0,versao:1,status:'em_impressao'})
 await cv.call('artesProposta',{acao:'impressao',propostaId:p.id,areaId:'parede',revisao:0,versao:1,status:'impressa'})
 assert.equal((await getDoc(doc(campo.db,'artesPropostas',p.id,'areas','parede'))).data().status,'impressa')
 await assert.rejects(gestor.call('artesProposta',{acao:'configurar',propostaId:p.id,areaId:'parede',revisao:0,versao:0,larguraCm:300,alturaCm:250,perfilId:'lona-parede',sangriaMm:3,margemMm:10}))
 const anexo=await gestor.call('operacao',{acao:'reservarAnexo',tipo:'ordensProducao',parentId:ordemId,nome:'Instrução.pdf',bytes:5,mime:'application/pdf'})
 await assert.rejects(uploadBytes(ref(intruso.storage,anexo.caminho),new TextEncoder().encode('%PDF-'),{contentType:'application/pdf'}))
 await uploadBytes(ref(gestor.storage,anexo.caminho),new TextEncoder().encode('%PDF-'),{contentType:'application/pdf'});await gestor.call('operacao',{acao:'anexar',tipo:'ordensProducao',parentId:ordemId,uploadId:anexo.uploadId});assert.equal((await getBytes(ref(campo.storage,anexo.caminho))).byteLength,5)
 await assert.rejects(gestor.call('operacao',{acao:'anexar',tipo:'ordensProducao',parentId:ordemId,uploadId:anexo.uploadId}))
 const criada=await campo.call('operacao',{acao:'pendencia',ordemId,revisao:1,equipeId:equipe.id,descricao:'Montar bistrô'})
 await campo.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:criada.id,editar:true,descricao:'Montar bistrô revisado',equipeId:equipe.id,prioridade:'alta',responsavel:'Encarregado QA'})
 assert.equal((await getDoc(doc(campo.db,'ordensProducao',ordemId,'pendencias',criada.id))).data().responsavel,'Encarregado QA')
 const produtor=await conta('produtor','produtor',{feiraIds:[feiraId]}),atendimento=await conta('atendimento','atendimento_comercial',{feiraIds:[feiraId]}),analista=await conta('analista','analista_projeto',{feiraIds:[feiraId]}),mob=await conta('mobil','mobiliario',{feiraIds:[feiraId]})
 await assert.rejects(getDoc(doc(produtor.db,'ordensProducao',ordemId)))
 await gestor.call('operacao',{acao:'atribuirResponsaveis',ordemId,revisao:1,produtorIds:[produtor.uid],atendimentoIds:[atendimento.uid]})
 assert.ok((await getDoc(doc(produtor.db,'ordensProducao',ordemId))).exists());assert.ok((await getBytes(ref(produtor.storage,p.caminho))).byteLength>0)
 await assert.rejects(analista.call('operacao',{acao:'pendencia',ordemId,revisao:1,equipeId:equipe.id,descricao:'Analista não abre'}))
 await analista.call('operacao',{acao:'notaAnalista',ordemId,revisao:1,nota:'Conferir montagem com o projeto aprovado'})
 const solicitacao=await atendimento.call('operacao',{acao:'pendencia',ordemId,revisao:1,equipeId:equipe.id,descricao:'Pedido da organizadora',origem:'organizadora'})
 await assert.rejects(produtor.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:solicitacao.id,status:'aberta'}))
 await atendimento.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:solicitacao.id,status:'recusada',nota:'Fora do escopo contratado'})
 await assert.rejects(atendimento.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:criada.id,status:'em_execucao'}))
 await assert.rejects(mob.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:criada.id,status:'em_execucao'}))
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH9sAAAAASUVORK5CYII=','base64')
 const foto=await campo.call('operacao',{acao:'reservarFotoPendencia',ordemId,revisao:1,id:criada.id,fase:'abertura',bytes:png.length,mime:'image/png',nome:'Abertura.png'})
 await assert.rejects(uploadBytes(ref(intruso.storage,foto.caminho),png,{contentType:'image/png'}));await uploadBytes(ref(campo.storage,foto.caminho),png,{contentType:'image/png'})
 await campo.call('operacao',{acao:'anexarFotoPendencia',ordemId,revisao:1,id:criada.id,fase:'abertura',uploadId:foto.uploadId})
 assert.equal((await getBytes(ref(produtor.storage,foto.caminho))).byteLength,png.length)
 await assert.rejects(uploadBytes(ref(campo.storage,foto.caminho),png,{contentType:'image/png'}))
 await assert.rejects(campo.call('operacao',{acao:'anexarFotoPendencia',ordemId,revisao:1,id:criada.id,fase:'abertura',uploadId:foto.uploadId}))
 await produtor.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:criada.id,status:'em_execucao'})
 const fim=await produtor.call('operacao',{acao:'reservarFotoPendencia',ordemId,revisao:1,id:criada.id,fase:'conclusao',bytes:png.length,mime:'image/png',nome:'Execução.png'})
 await uploadBytes(ref(produtor.storage,fim.caminho),png,{contentType:'image/png'});await produtor.call('operacao',{acao:'anexarFotoPendencia',ordemId,revisao:1,id:criada.id,fase:'conclusao',uploadId:fim.uploadId})
 await produtor.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:criada.id,status:'aguardando_validacao',nota:'Montado conforme projeto'})
 await assert.rejects(produtor.call('operacao',{acao:'concluirEstande',ordemId,revisao:1}))
 await gestor.call('operacao',{acao:'validarLote',ordemId,revisao:1,ids:[criada.id]})
 const concluida=(await getDoc(doc(gestor.db,'ordensProducao',ordemId,'pendencias',criada.id))).data();assert.equal(concluida.executadoPor,produtor.uid);assert.equal(concluida.validadoPor,gestor.uid);assert.equal(concluida.fotosConclusao.length,1)
 await assert.rejects(gestor.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:criada.id,status:'aberta'}))
 const relatorio=await atendimento.call('operacao',{acao:'relatorio',feiraId});assert.ok(relatorio.linhas.some(a=>a.id===criada.id));assert.equal((await intruso.call('operacao',{acao:'relatorio',feiraId})).linhas.length,0)
 await produtor.call('operacao',{acao:'concluirEstande',ordemId,revisao:1,nota:'Pronto para entrega'});assert.equal((await getDoc(doc(gestor.db,'ordensProducao',ordemId))).data().montagemStatus,'aguardando_validacao')
 await gestor.call('operacao',{acao:'concluirEstande',ordemId,revisao:1});assert.equal((await getDoc(doc(gestor.db,'ordensProducao',ordemId))).data().montagemStatus,'concluida')
 await gestor.call('operacao',{acao:'concluirEstande',ordemId,revisao:1,reabrir:true,nota:'Ajuste solicitado'})
 await gestor.call('operacao',{acao:'configurarValidacao',ordemId,revisao:1,automatica:true})
 const automatica=await produtor.call('operacao',{acao:'pendencia',ordemId,revisao:1,equipeId:equipe.id,descricao:'Serviço com validação automática'})
 await produtor.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:automatica.id,status:'em_execucao'});await produtor.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:automatica.id,status:'aguardando_validacao'})
 assert.equal((await getDoc(doc(gestor.db,'ordensProducao',ordemId,'pendencias',automatica.id))).data().status,'concluida')
 await gestor.call('operacao',{acao:'configurarValidacao',ordemId,revisao:1,automatica:false})
 await seed(`ordensProducao/${ordemId}/pendencias/tarefa`,{descricao:'Conferir piso',equipeId:equipe.id,status:'aguardando_validacao',revisao:1})
 await assert.rejects(campo.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:'tarefa',status:'concluida'}));await gestor.call('operacao',{acao:'pendencia',ordemId,revisao:1,id:'tarefa',status:'concluida'})
 await assert.rejects(admin.call('decidirProposta',{propostaId:nova.id,decisao:'aprovada'}));await admin.call('decidirProposta',{propostaId:nova.id,decisao:'aprovada',confirmarSubstituicao:true})
 assert.equal((await getDoc(doc(gestor.db,'ordensProducao',ordemId))).data().revisao,2)
 await assert.rejects(getBytes(ref(campo.storage,p.caminho)));await assert.rejects(cv.call('artesProposta',{acao:'iniciar',propostaId:p.id}))
 await assert.rejects(gestor.call('operacao',{acao:'pendencia',ordemId,revisao:2,id:'tarefa',status:'aberta'}))
 await admin.call('decidirProposta',{propostaId:nova.id,decisao:'recusada',motivo:'Aguardando nova configuração'})
 await assert.rejects(getDoc(doc(campo.db,'ordensProducao',ordemId)));await assert.rejects(getBytes(ref(campo.storage,nova.caminho)))
 assert.equal((await cliente.call('estadoPersonalizacao',{})).bloqueada,false)
 const nativo=await campo.call('notificacoesUsuario',{acao:'registrarNativo',token:'a'.repeat(120),plataforma:'android'});assert.match(nativo.id,/^[a-f0-9]{64}$/);await campo.call('notificacoesUsuario',{acao:'desativar',id:nativo.id})
 console.log('QA operação OK: bloqueio comercial, perfis atribuídos, fotos privadas/imutáveis, execução e validação separadas, lote, relatórios isolados, montagem, validação automática, aprovação, manifesto completo, isolamento por feira/equipe, CV sem valores, prova enviada por CV, aprovação pelo cliente e impressão consultável no campo, anexos privados e imutáveis, validação restrita, revisão/suspensão revogando acesso e registro de dispositivo Android.')
}finally{await Promise.all(apps.map(deleteApp))}
