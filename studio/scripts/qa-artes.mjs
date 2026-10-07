// Testes integrados exclusivamente contra o projeto local demo-uset.
import assert from 'node:assert/strict'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from 'firebase/functions'
import {
  getStorage,
  connectStorageEmulator,
  ref,
  uploadBytes,
  getBytes,
} from 'firebase/storage'
import { readFile } from 'node:fs/promises'
import { getDownloadURL } from 'firebase/storage'
const apps = [],
  senha = 'TesteComercial2026!'
async function conta(email) {
  const app = initializeApp(
    {
      projectId: 'demo-uset',
      apiKey: 'demo-key',
      storageBucket: 'demo-uset.appspot.com',
    },
    email,
  )
  apps.push(app)
  const auth = getAuth(app),
    db = getFirestore(app),
    fn = getFunctions(app, 'southamerica-east1'),
    storage = getStorage(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9198', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8185)
  connectFunctionsEmulator(fn, '127.0.0.1', 5001)
  connectStorageEmulator(storage, '127.0.0.1', 9298)
  let u
  try {
    u = await createUserWithEmailAndPassword(auth, email, senha)
  } catch (e) {
    if (e.code !== 'auth/email-already-in-use') throw e
    u = await signInWithEmailAndPassword(auth, email, senha)
  }
  return { uid: u.user.uid, auth, db, fn, storage }
}
function valor(v) {
  if (v === null) return { nullValue: null }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(valor) } }
  if (typeof v === 'object')
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v).map(([k, x]) => [k, valor(x)]),
        ),
      },
    }
  return typeof v === 'string'
    ? { stringValue: v }
    : typeof v === 'boolean'
      ? { booleanValue: v }
      : { doubleValue: v }
}
async function seed(path, data) {
  const r = await fetch(
    `http://127.0.0.1:8185/v1/projects/demo-uset/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: valor(data).mapValue.fields }),
    },
  )
  if (!r.ok) throw Error(await r.text())
}

const {createHash}=await import('node:crypto')
const {especificacaoEmPdf}=await import('../src/lib/producao/core/especificacaoPdf.js')
const {PERFIS_PADRAO}=await import('../src/lib/producao/perfis.js')
const propostaId=`artes-qa-${Date.now()}`
const admin=await conta('admin@artes.test'),org=await conta('org@artes.test'),outra=await conta('outra@artes.test'),cliente=await conta(`cliente-${Date.now()}@artes.test`),outro=await conta('outro@artes.test')
await seed(`usuarios/${admin.uid}`,{papel:'admin',nome:'Equipe USET',ativo:true})
for(const c of [org,outra])await seed(`usuarios/${c.uid}`,{papel:'organizadora',nome:'Organizadora QA',organizadoraId:c.uid,ativo:true})
for(const c of [cliente,outro])await seed(`usuarios/${c.uid}`,{papel:'expositor',nome:c===cliente?'Empresa Demonstração':'Outra Empresa',email:c===cliente?'cliente@artes.test':'outro@artes.test',contatoNome:'Contato QA',ativo:true,cadastroCompleto:true,modeloId:'artes-modelo',organizadoraId:c===cliente?org.uid:outra.uid,feiraId:'artes-feira'})
await seed('modelos/artes-modelo',{nome:'Projeto com arte',superficies:[{id:'parede',nome:'Parede esquerda',podeArte:true}],organizadoraIds:[org.uid],artesMedidas:[{id:'parede',nome:'Parede esquerda',larguraCm:275,alturaCm:275,perfilId:'lona-parede'}]})
await seed(`propostas/${propostaId}`,{cliente:cliente.uid,clienteNome:'Empresa Demonstração',modeloId:'artes-modelo',modeloNome:'Estande de demonstração',organizadoraId:org.uid,feiraId:'artes-feira',acabamentos:{parede:{artePendente:true}},areasArte:[{id:'parede',nome:'Parede esquerda',larguraCm:275,alturaCm:275,perfilId:'lona-parede'}]})
const call=async(c,n,d)=>(await httpsCallable(c.fn,n,{timeout:60000})(d)).data
const arte=(c,acao,d={})=>call(c,'artesProposta',{propostaId,areaId:'parede',revisao:1,versao:0,acao,...d})
const ler=async()=> (await getDoc(doc(cliente.db,`artesPropostas/${propostaId}/areas/parede`))).data()
await assert.rejects(arte(outra,'iniciar'))
await assert.rejects(arte(outro,'iniciar'))
await arte(cliente,'iniciar')
assert.equal((await ler()).confirmada,false)
await assert.rejects(arte(cliente,'reservar',{tipo:'arte',bytes:50,mime:'application/pdf',nome:'arquivo.pdf',revisao:0}))
await assert.rejects(arte(org,'configurar',{revisao:0,larguraCm:275,alturaCm:275,perfilId:'lona-parede',sangriaMm:100,margemMm:100}))
await arte(admin,'configurar',{revisao:0,larguraCm:275,alturaCm:275,perfilId:'lona-parede',sangriaMm:100,margemMm:100})
assert.equal((await ler()).revisao,1)
const pdf=especificacaoEmPdf({peca:{larguraCm:275,alturaCm:275,rotulo:'Arte QA'},perfil:PERFIS_PADRAO[0],politica:{sangriaMinimaMm:0}})
const hash=createHash('sha256').update(pdf).digest('hex')
async function upload(c,tipo,versao=0,revisao=1){
  const r=await arte(c,'reservar',{tipo,versao,revisao,bytes:pdf.length,mime:'application/pdf',nome:tipo==='arte'?'arte-final.pdf':'prova.pdf'})
  await uploadBytes(ref(c.storage,r.caminho),pdf,{contentType:'application/pdf'})
  return r
}
const r=await upload(cliente,'arte')
await assert.rejects(uploadBytes(ref(cliente.storage,r.caminho),pdf,{contentType:'application/pdf'}))
await assert.rejects(getBytes(ref(outro.storage,r.caminho)))
await assert.rejects(getBytes(ref(outra.storage,r.caminho)))
await assert.rejects(arte(cliente,'enviar',{uploadId:r.uploadId,relatorio:{veredicto:'aprovado',achados:[],hash:'errado'}}))
await arte(cliente,'enviar',{uploadId:r.uploadId,relatorio:{veredicto:'aprovado',escalaFator:1,achados:[],hash}})
assert.equal((await ler()).status,'recebida')
await assert.rejects(arte(admin,'impressao',{versao:1,status:'em_impressao'}))
const prova=await upload(admin,'prova',1)
await arte(admin,'prova',{versao:1,uploadId:prova.uploadId})
await assert.rejects(arte(cliente,'responder',{versao:1,provaId:'antiga',aprovar:true}))
await assert.rejects(arte(org,'responder',{versao:1,provaId:prova.uploadId,aprovar:true}))
await arte(cliente,'responder',{versao:1,provaId:prova.uploadId,aprovar:false,motivo:'Ajustar texto'})
assert.equal((await ler()).status,'reprovada')
const r2=await upload(cliente,'arte',1)
await arte(cliente,'enviar',{versao:1,uploadId:r2.uploadId,relatorio:{veredicto:'aprovado',escalaFator:1,achados:[],hash}})
assert.equal((await ler()).versao,2)
assert.equal((await ler()).prova,null)
const prova2=await upload(admin,'prova',2)
await arte(admin,'prova',{versao:2,uploadId:prova2.uploadId})
await arte(cliente,'responder',{versao:2,provaId:prova2.uploadId,aprovar:true})
assert.equal((await ler()).status,'aprovada')
await arte(admin,'impressao',{versao:2,status:'em_impressao'})
await arte(admin,'impressao',{versao:2,status:'impressa'})
await assert.rejects(arte(admin,'configurar',{versao:2,larguraCm:275,alturaCm:275,perfilId:'lona-parede',sangriaMm:100,margemMm:100}))
await assert.rejects(updateDoc(doc(cliente.db,`artesPropostas/${propostaId}/areas/parede`),{status:'aprovada'}))
await assert.rejects(getDoc(doc(outro.db,`artesPropostas/${propostaId}`)))
await assert.rejects(getDoc(doc(outra.db,`artesPropostas/${propostaId}`)))
assert.ok((await getDoc(doc(org.db,`artesPropostas/${propostaId}`))).exists())
console.log('Artes: isolamento, gabarito, arquivos imutáveis, versões, prova e impressão verificados.')
const chat=(c,acao,d={})=>call(c,'conversaCliente',{clienteId:cliente.uid,acao,...d})
await assert.rejects(chat(outra,'iniciar'))
await assert.rejects(chat(outro,'iniciar'))
await chat(cliente,'iniciar')
await chat(cliente,'enviar',{texto:'Como preparo a arte?',mensagemId:'mensagem-cliente-qa',propostaId})
await chat(cliente,'enviar',{texto:'Mesmo envio repetido',mensagemId:'mensagem-cliente-qa'})
assert.equal((await getDocs(collection(admin.db,`conversas/${cliente.uid}/mensagens`))).size,1)
await assert.rejects(setDoc(doc(cliente.db,`conversas/${cliente.uid}/mensagens/falso`),{papel:'admin',texto:'Aprovado'}))
await assert.rejects(getDoc(doc(outra.db,`conversas/${cliente.uid}`)))
await chat(org,'enviar',{texto:'A USET confirma as medidas e libera o gabarito.',mensagemId:'mensagem-organizadora-qa'})
const conversa=(await getDoc(doc(cliente.db,`conversas/${cliente.uid}`))).data()
assert.equal(conversa.pendenteCliente,true)
await chat(cliente,'ler',{ultimaEm:1})
assert.equal((await getDoc(doc(cliente.db,`conversas/${cliente.uid}`))).data().pendenteCliente,true)
await chat(cliente,'ler',{ultimaEm:conversa.ultimaEm.toMillis()})
assert.equal((await getDoc(doc(cliente.db,`conversas/${cliente.uid}`))).data().pendenteCliente,false)
console.log('Chat: identidades, contexto, isolamento, idempotência e leitura da mensagem atual verificados.')

// Push is intentionally simulated by the Functions emulator: no external messages.
const {createECDH,randomBytes}=await import('node:crypto')
const ec=createECDH('prime256v1');ec.generateKeys()
const endpoint=`https://fcm.googleapis.com/fcm/send/qa-${Date.now()}`
const push=async(c,acao,d={})=>call(c,'notificacoesUsuario',{acao,...d})
const k1=await push(cliente,'chave'),k2=await push(admin,'chave');assert.equal(k1.publicKey,k2.publicKey)
await assert.rejects(push(cliente,'registrar',{subscription:{endpoint:'https://localhost/secret',keys:{}}}))
const device=await push(cliente,'registrar',{subscription:{endpoint,keys:{p256dh:ec.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}}})
await push(cliente,'teste')
const avisos=async c=>(await getDocs(query(collection(c.db,'notificacoes'),where('destinatario','==',c.uid)))).docs
let lista=await avisos(cliente);assert.ok(lista.some(d=>d.data().tipo==='teste'))
const aviso=lista.find(d=>d.data().tipo==='teste')
await assert.rejects(getDoc(doc(outro.db,'notificacoes',aviso.id)))
await assert.rejects(push(outro,'ler',{ids:[aviso.id]}))
await push(cliente,'ler',{ids:[aviso.id]});assert.equal((await getDoc(doc(cliente.db,'notificacoes',aviso.id))).data().lida,true)
await assert.rejects(setDoc(doc(cliente.db,'notificacoes','forjado'),{destinatario:cliente.uid,titulo:'falso'}))
await assert.rejects(getDoc(doc(cliente.db,'dispositivosPush',device.id)))
await assert.rejects(getDoc(doc(cliente.db,'configuracaoPrivada','webpush')))
const adminAvisos=await avisos(admin),orgAvisos=await avisos(org),outraAvisos=await avisos(outra)
assert.equal(adminAvisos.filter(d=>d.data().cliente===cliente.uid&&d.data().tipo==='mensagem_nova').length,1)
assert.equal(orgAvisos.filter(d=>d.data().cliente===cliente.uid&&d.data().tipo==='mensagem_nova').length,1)
assert.equal(outraAvisos.filter(d=>d.data().cliente===cliente.uid).length,0)
await assert.rejects(call(org,'liberarProposta',{propostaId}))
await call(admin,'liberarProposta',{propostaId});await call(admin,'liberarProposta',{propostaId})
assert.equal((await avisos(cliente)).filter(d=>d.data().propostaId===propostaId&&d.data().tipo==='proposta_liberada').length,1)
await push(cliente,'desativar',{id:device.id})
console.log('Notificações: VAPID persistente, cadastro de dispositivo, inbox isolada, leitura, segredo privado, destinatários e deduplicação verificados. Push externo não é enviado nos emuladores.')

const novoId=`pacote-qa-${Date.now()}`,modeloId=`pacote-${Date.now()}`
const superficies=[{id:'p1',nome:'Parede 1',podeArte:true,papel:'lona'},{id:'p2',nome:'Parede 2',podeArte:true,papel:'lona'},{id:'logo',nome:'Logo',podeArte:true,tipoElemento:'logo'}]
await seed(`modelos/${modeloId}`,{nome:'Pacote com 9 m²',superficies,organizadoraIds:[org.uid],precos:{lona:{valor:100,unidade:'m2'},metragensArte:{p1:6,p2:6},arteInclusa:{ativo:true,limiteM2:9,itens:['p1','p2']}},artesMedidas:[{id:'p1',nome:'Parede 1',larguraCm:300,alturaCm:200,perfilId:'lona-parede',confirmada:true,sangriaMm:5,margemMm:10},{id:'p2',nome:'Parede 2',larguraCm:300,alturaCm:200,perfilId:'lona-parede',confirmada:true,sangriaMm:5,margemMm:10},{id:'logo',nome:'Logo',larguraCm:100,alturaCm:30,semGabarito:true,confirmada:true}]})
await seed(`usuarios/${cliente.uid}`,{papel:'expositor',nome:'Empresa QA',ativo:true,cadastroCompleto:true,modeloId,organizadoraId:org.uid,feiraId:'artes-feira'})
const caminho=`propostas/${cliente.uid}/${novoId}/estande.glb`
const json=Buffer.from('{"asset":{"version":"2.0"}}  '),glb=Buffer.alloc(20+json.length);glb.write('glTF');glb.writeUInt32LE(2,4);glb.writeUInt32LE(glb.length,8);glb.writeUInt32LE(json.length,12);glb.write('JSON',16);json.copy(glb,20)
await uploadBytes(ref(cliente.storage,caminho),glb,{contentType:'model/gltf-binary'})
await call(cliente,'registrarProposta',{id:novoId,proposta:{modeloId,cliente:cliente.uid,organizadoraId:org.uid,feiraId:'artes-feira',total:0,quantidadePersonalizada:3,arquivoPersonalizado:{caminho},itens:[],acabamentos:{p1:{artePendente:true},p2:{artePendente:true},logo:{artePendente:true}},areasArte:superficies.map(s=>({id:s.id,superficieIds:[s.id],confirmada:true,larguraCm:1,alturaCm:1}))}})
const enviada=(await getDoc(doc(cliente.db,'propostas',novoId))).data();assert.equal(enviada.total,300);assert.equal(enviada.franquia.extraM2,3)
const novo=(c,acao,d={})=>call(c,'artesProposta',{propostaId:novoId,acao,...d})
await novo(cliente,'iniciar')
const areaPronta=(await getDoc(doc(cliente.db,`artesPropostas/${novoId}/areas/p1`))).data();assert.equal(areaPronta.confirmada,true);assert.equal(areaPronta.larguraCm,300);assert.equal(areaPronta.sangriaMm,5)
assert.equal((await getDoc(doc(cliente.db,`artesPropostas/${novoId}/areas/logo`))).data().semGabarito,true)
await assert.rejects(novo(admin,'logoPronto',{areaId:'logo',versao:0,revisao:0}))
const eps=Buffer.from('%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 100 30\nshowpage')
const apoio=await novo(cliente,'reservarApoio',{categoria:'logo',nome:'marca.eps',bytes:eps.length,mime:'application/postscript'})
await uploadBytes(ref(cliente.storage,apoio.caminho),eps,{contentType:'application/postscript'})
await assert.rejects(uploadBytes(ref(cliente.storage,apoio.caminho),eps,{contentType:'application/postscript'}))
await novo(cliente,'enviarApoio',{uploadId:apoio.uploadId});await novo(cliente,'enviarApoio',{uploadId:apoio.uploadId})
assert.equal((await getDocs(collection(cliente.db,`artesPropostas/${novoId}/apoio`))).size,1)
await assert.rejects(getBytes(ref(outra.storage,apoio.caminho)))
await novo(admin,'logoPronto',{areaId:'logo',versao:0,revisao:0})
const logo=(await getDoc(doc(cliente.db,`artesPropostas/${novoId}/areas/logo`))).data();assert.equal(logo.apoio[0].arquivo.hash,createHash('sha256').update(eps).digest('hex'))
const rp=await novo(admin,'reservar',{areaId:'logo',versao:1,revisao:0,tipo:'prova',bytes:pdf.length,mime:'application/pdf',nome:'logo-prova.pdf'})
await uploadBytes(ref(admin.storage,rp.caminho),pdf,{contentType:'application/pdf'})
await novo(admin,'prova',{areaId:'logo',versao:1,revisao:0,uploadId:rp.uploadId})
await novo(cliente,'responder',{areaId:'logo',versao:1,revisao:0,aprovar:true,provaId:rp.uploadId})
assert.equal((await getDoc(doc(cliente.db,`artesPropostas/${novoId}/areas/logo`))).data().status,'aprovada')
console.log('Pacote e produção: cobrança de 3 m² calculada pelo servidor, medidas herdadas, logo sem gabarito, apoio EPS privado/imutável e prova do logo aprovada.')
await Promise.all(apps.map(deleteApp))
