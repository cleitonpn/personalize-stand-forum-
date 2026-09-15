import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, storage } from './firebase.js'

export async function enviarArte(f) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) throw new Error('Escolha uma imagem PNG, JPG ou WebP.')
  if (f.size >= 25 * 1024 * 1024) throw new Error('A imagem precisa ter menos de 25 MB.')
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Entre novamente para enviar sua arte.')
  const caminho = `artes/${uid}/${crypto.randomUUID()}-${f.name.replace(/[^\w.-]/g, '_')}`
  const arquivo = ref(storage, caminho)
  await uploadBytes(arquivo, f, { contentType: f.type })
  return { arte: await getDownloadURL(arquivo), caminhoArte: caminho, nomeArte: f.name }
}
