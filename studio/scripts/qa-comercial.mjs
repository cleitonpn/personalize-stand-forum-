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
  serverTimestamp,
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
const admin = await conta('admin@comercial.test'),
  org = await conta('org@comercial.test'),
  outra = await conta('outra@comercial.test'),
  cliente = await conta('cliente@comercial.test')
await seed(`usuarios/${admin.uid}`, {
  nome: 'Admin Comercial',
  papel: 'admin',
  ativo: true,
})
for (const c of [org, outra]) {
  await seed(`usuarios/${c.uid}`, {
    nome: c === org ? 'Organizadora A' : 'Organizadora B',
    papel: 'organizadora',
    organizadoraId: c.uid,
    ativo: true,
  })
  await seed(`organizadoras/${c.uid}`, {
    nome: c === org ? 'Organizadora A' : 'Organizadora B',
    cobranca: 'montadora',
    ativo: true,
  })
}
await seed('modelos/comercial-a', {
  nome: 'Projeto A',
  organizadoraIds: [org.uid],
})
await seed('modelos/comercial-b', {
  nome: 'Projeto B',
  organizadoraIds: [outra.uid],
})
await seed('feiras/comercial-feira', {
  nome: 'Feira A',
  organizadoraId: org.uid,
  modeloIds: ['comercial-a'],
  ativo: true,
})
await seed(`usuarios/${cliente.uid}`, {
  nome: 'Empresa QA',
  empresa: 'Empresa QA',
  email: 'cliente@comercial.test',
  papel: 'expositor',
  ativo: true,
  modeloId: 'comercial-a',
  organizadoraId: org.uid,
  feiraId: 'comercial-feira',
  cadastroCompleto: false,
  localizacao: '',
  localizacaoPendente: true,
})
const call = (c, n, d) => {
  console.log('Verificando', n, c === admin ? 'admin' : 'organizador')
  return httpsCallable(c.fn, n, { timeout: 20000 })(d)
}
await assert.rejects(
  call(org, 'cadastrarExpositor', {
    nome: 'Não autorizado',
    email: 'negado@teste.com',
    feiraId: 'comercial-feira',
    modeloId: 'comercial-a',
  }),
)
const nova = await call(admin, 'cadastrarExpositor', {
  nome: 'Nova empresa',
  email: `nova${Date.now()}@teste.com`,
  feiraId: 'comercial-feira',
  modeloId: 'comercial-a',
})
assert.ok(nova.data.uid)
assert.equal(nova.data.emailPendente, true)
assert.ok(nova.data.convite)
const novaOrg = await call(admin, 'cadastrarOrganizadora', {
  nome: 'Organizadora cadastrada',
  email: `nova-org${Date.now()}@teste.com`,
  cobranca: 'organizadora',
})
assert.ok(novaOrg.data.uid)
await assert.rejects(
  call(org, 'salvarFeira', {
    nome: 'Feira indevida',
    organizadoraId: org.uid,
    modeloIds: ['comercial-b'],
  }),
)
await call(admin, 'salvarFeira', {
  id: 'comercial-feira',
  nome: 'Feira A',
  organizadoraId: org.uid,
  modeloIds: ['comercial-a'],
})
assert.ok((await getDoc(doc(org.db, 'modelos', 'comercial-a'))).exists())
await assert.rejects(getDoc(doc(org.db, 'modelos', 'comercial-b')))
await assert.rejects(
  updateDoc(doc(org.db, 'modelos', 'comercial-a'), { nome: 'Alterado' }),
)
const modelos = await getDocs(
  query(
    collection(org.db, 'modelos'),
    where('organizadoraIds', 'array-contains', org.uid),
  ),
)
assert.equal(modelos.size, 1)
await assert.rejects(getDocs(collection(org.db, 'modelos')))
await assert.rejects(getDoc(doc(outra.db, 'usuarios', cliente.uid)))
await assert.rejects(
  updateDoc(doc(org.db, 'usuarios', cliente.uid), { papel: 'admin' }),
)
await assert.rejects(
  updateDoc(doc(cliente.db, 'usuarios', cliente.uid), {
    organizadoraId: outra.uid,
  }),
)
await assert.rejects(
  updateDoc(doc(org.db, 'usuarios', cliente.uid), {
    localizacao: '',
    localizacaoPendente: false,
  }),
)
await updateDoc(doc(org.db, 'usuarios', cliente.uid), {
  localizacao: 'Pavilhão A, estande 42',
  localizacaoPendente: false,
})
await updateDoc(doc(cliente.db, 'usuarios', cliente.uid), {
  contatoNome: 'Responsável QA',
  telefone: '11999999999',
  cargo: 'Comercial',
  localizacao: '',
  localizacaoPendente: true,
  cadastroCompleto: true,
})
const propostaId = 'comercial-proposta-' + Date.now()
const p = {
  cliente: cliente.uid,
  clienteNome: 'Empresa QA',
  clienteEmail: 'cliente@comercial.test',
  arquivoPersonalizado:{caminho:`propostas/${cliente.uid}/${propostaId}/estande.glb`},
  organizadoraId: org.uid,
  feiraId: 'comercial-feira',
  modeloId: 'comercial-a',
  total: 100,
  quantidadePersonalizada: 2,
  criadoEm: serverTimestamp(),
}
await assert.rejects(
  setDoc(doc(cliente.db, 'propostas', 'fraude-org'), {
    ...p,
    organizadoraId: outra.uid,
  }),
)
await setDoc(doc(cliente.db, 'propostas', propostaId), p)
await assert.rejects(getDoc(doc(outra.db, 'propostas', propostaId)))
assert.ok((await getDoc(doc(org.db, 'propostas', propostaId))).exists())
await assert.rejects(
  updateDoc(doc(org.db, 'propostas', propostaId), { total: 0 }),
)
await assert.rejects(
  updateDoc(doc(cliente.db, 'propostas', propostaId), { total: 0 }),
)
await assert.rejects(
  call(org, 'prepararPagamento', {
    propostaId: propostaId,
    valorCentavos: 10000,
  }),
)
await call(admin, 'prepararPagamento', {
  propostaId: propostaId,
  valorCentavos: 15000,
})
assert.equal(
  (await getDoc(doc(org.db, 'pagamentos', propostaId))).data().valorCentavos,
  15000,
)
await assert.rejects(getDoc(doc(outra.db, 'pagamentos', propostaId)))
await assert.rejects(
  setDoc(doc(cliente.db, 'pagamentos', propostaId), { status: 'pago' }),
)
await seed(`organizadoras/${org.uid}`, {
  nome: 'Organizadora A',
  cobranca: 'organizadora',
  ativo: true,
})
await assert.rejects(
  call(admin, 'prepararPagamento', {
    propostaId: propostaId,
    valorCentavos: 10000,
  }),
)
await seed(`organizadoras/${org.uid}`, {
  nome: 'Organizadora A',
  cobranca: 'montadora',
  ativo: true,
})
await assert.rejects(getDocs(collection(org.db, 'emailsSaida')))
const emails = await getDocs(collection(admin.db, 'emailsSaida'))
assert.ok(emails.docs.every((e) => e.data().status === 'pendente_integracao'))
await uploadBytes(
  ref(admin.storage, 'modelos/comercial.glb'),
  new Uint8Array([1, 2, 3]),
  { contentType: 'model/gltf-binary' },
)
await seed('arquivosModelo/comercial.glb', {
  modeloIds: ['comercial-a'],
  organizadoraIds: [org.uid],
})
assert.equal(
  (await getBytes(ref(org.storage, 'modelos/comercial.glb'))).byteLength,
  3,
)
await assert.rejects(getBytes(ref(outra.storage, 'modelos/comercial.glb')))
await updateDoc(doc(admin.db, 'usuarios', org.uid), { ativo: false })
await assert.rejects(getDoc(doc(org.db, 'modelos', 'comercial-a')))
await updateDoc(doc(admin.db, 'usuarios', org.uid), { ativo: true })
const glbReal = await readFile(
  new URL('../dev/qa.local/estande.glb', import.meta.url),
)
await uploadBytes(
  ref(admin.storage, 'modelos/comercial-estande-real.glb'),
  glbReal,
  { contentType: 'model/gltf-binary' },
)
const url = await getDownloadURL(
  ref(admin.storage, 'modelos/comercial-estande-real.glb'),
)
await updateDoc(doc(admin.db, 'modelos', 'comercial-a'), {
  arquivo: {
    caminho: 'modelos/comercial-estande-real.glb',
    url,
    bytes: glbReal.length,
  },
})
await call(admin, 'sincronizarAcessosArquivos', {})
const respostaPublica = await fetch(url)
console.log('Status do link revogado:', respostaPublica.status)
assert.ok([400,401,403,404].includes(respostaPublica.status),'Link antigo de GLB não pode permanecer público depois da migração.')
assert.equal(
  (await getBytes(ref(org.storage, 'modelos/comercial-estande-real.glb')))
    .byteLength,
  glbReal.length,
)
await assert.rejects(
  getBytes(ref(outra.storage, 'modelos/comercial-estande-real.glb')),
)
console.log(
  'Comercial: cadastros por backend, isolamento entre organizadoras, projeto somente leitura, onboarding, localização, propostas imutáveis, aprovação de pagamentos e fila privada de e-mail verificados.',
)
await Promise.all(apps.map(deleteApp))
