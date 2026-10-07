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
await Promise.all(apps.map(deleteApp))
