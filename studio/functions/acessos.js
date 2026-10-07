const { getFirestore } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')

async function revogarLinks(arquivo) {
  // O emulador conserva downloadTokens numa lista separada e não a remove
  // pelo PATCH GCS. Seu endpoint de tokens é necessário apenas no teste local.
  const host = (process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST || '').replace(/^https?:\/\//,'')
  if (host) {
    const [metadata] = await arquivo.getMetadata()
    const antigos = (metadata.metadata?.firebaseStorageDownloadTokens || '').split(',').filter(Boolean)
    for (const token of antigos) {
      const resposta = await fetch(`http://${host}/v0/b/${encodeURIComponent(arquivo.bucket.name)}/o/${encodeURIComponent(arquivo.name)}?delete_token=${encodeURIComponent(token)}`, { method:'POST',headers:{Authorization:'Bearer owner'} })
      if (!resposta.ok) throw Error('O emulador não revogou o link do arquivo.')
    }
    // O emulador gera outro token ao remover o último; confirmar que os
    // tokens anteriores desapareceram, em vez de exigir ausência total.
    const [atual] = await arquivo.getMetadata()
    const tokens=(atual.metadata?.firebaseStorageDownloadTokens||'').split(',')
    if(antigos.some(t=>tokens.includes(t)))throw Error('O emulador conservou um link antigo.')
    return
  } else {
    await arquivo.setMetadata({metadata:{firebaseStorageDownloadTokens:null}})
  }
  const [atual] = await arquivo.getMetadata()
  if (atual.metadata?.firebaseStorageDownloadTokens) throw Error('O arquivo ainda possui links permanentes de download.')
}

function caminhosModelo(dados, lista = new Set()) {
  if (!dados || typeof dados !== 'object') return lista
  if (
    typeof dados.caminho === 'string' &&
    /^modelos\/[^/]+$/.test(dados.caminho)
  )
    lista.add(dados.caminho)
  for (const v of Object.values(dados))
    if (v && typeof v === 'object') caminhosModelo(v, lista)
  return lista
}
function mapear(modelos) {
  const acessos = new Map()
  for (const m of modelos.docs)
    for (const caminho of caminhosModelo(m.data())) {
      if (!acessos.has(caminho))
        acessos.set(caminho, {
          modeloIds: new Set(),
          organizadoraIds: new Set(),
        })
      const a = acessos.get(caminho)
      a.modeloIds.add(m.id)
      for (const id of m.data().organizadoraIds || []) a.organizadoraIds.add(id)
    }
  return acessos
}
async function sincronizarArquivos() {
  const db = getFirestore(),
    [modelos, antigos] = await Promise.all([
      db.collection('modelos').get(),
      db.collection('arquivosModelo').get(),
    ])
  const caminhos = [
    ...new Set([
      ...mapear(modelos).keys(),
      ...antigos.docs.map((a) => `modelos/${a.id}`),
    ]),
  ]
  for (let inicio = 0; inicio < caminhos.length; inicio += 300) {
    const lote = caminhos.slice(inicio, inicio + 300)
    // Releitura transacional impede um evento atrasado de restabelecer acesso
    // que um admin acabou de remover em outra alteração.
    await db.runTransaction(async (tx) => {
      const atuais = mapear(await tx.get(db.collection('modelos')))
      for (const caminho of lote) {
        const a = atuais.get(caminho),
          ref = db.doc(`arquivosModelo/${caminho.slice(8)}`)
        if (a)
          tx.set(ref, {
            modeloIds: [...a.modeloIds],
            organizadoraIds: [...a.organizadoraIds],
          })
        else tx.delete(ref)
      }
    })
    for (const caminho of lote)
      try {
        await revogarLinks(getStorage().bucket().file(caminho))
      } catch (e) {
        if (Number(e.code) !== 404) throw e
      }
  }
  return { arquivos: caminhos.length }
}
async function migrarPropostas() {
  const db = getFirestore(),
    snap = await db.collection('propostas').get()
  let arquivos = 0
  for (const p of snap.docs) {
    const d = p.data(),
      caminho = `propostas/${d.cliente}/${p.id}/estande.glb`
    if (d.arquivoPersonalizado?.caminho !== caminho) continue
    try {
      await revogarLinks(getStorage().bucket().file(caminho))
      arquivos++
    } catch (e) {
      if (Number(e.code) !== 404) throw e
    }
  }
  return { propostasProtegidas: arquivos }
}
module.exports = { sincronizarArquivos, migrarPropostas, revogarLinks }
