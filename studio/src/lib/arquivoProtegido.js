import { getBlob, ref } from 'firebase/storage'
import { storage } from './firebase.js'

// URLs antigas servem como identificador. A leitura usa a sessão e as regras,
// sem depender de links públicos permanentes do Firebase Storage.
export function ehArquivoFirebase(url) {
  if (typeof url !== 'string') return false
  try {
    const u = new URL(url)
    return (
      u.hostname === 'firebasestorage.googleapis.com' ||
      (u.hostname === '127.0.0.1' && u.pathname.startsWith('/v0/b/'))
    )
  } catch {
    return false
  }
}
export async function blobProtegido(url) {
  if (ehArquivoFirebase(url)) {
    // O SDK conectado ao emulador não reconhece URLs com host de produção.
    // gs:// preserva bucket/caminho e continua usando sessão e regras do SDK.
    const u=new URL(url),m=u.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/)
    return getBlob(ref(storage,m?`gs://${decodeURIComponent(m[1])}/${decodeURIComponent(m[2])}`:url),200*1024*1024)
  }
  const resposta = await fetch(url)
  if (!resposta.ok) throw Error('Não foi possível baixar o arquivo.')
  return resposta.blob()
}
