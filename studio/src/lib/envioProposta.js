import {ref,uploadBytes} from 'firebase/storage'

// Antes do registro, o cliente pode enviar o GLB, mas ainda não pode lê-lo.
// A URL é uma referência privada; o leitor usa a sessão Firebase, sem token público.
export async function enviarGLBProposta(storage,uid,id,glb) {
  const caminho=`propostas/${uid}/${id}/estande.glb`
  const destino=ref(storage,caminho)
  await uploadBytes(destino,glb,{contentType:'model/gltf-binary'})
  return {caminho,url:`https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(destino.bucket)}/o/${encodeURIComponent(caminho)}?alt=media`,bytes:glb.size,nomeOriginal:'estande-personalizado.glb'}
}
