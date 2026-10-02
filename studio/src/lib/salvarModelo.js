import { doc, runTransaction, Timestamp } from 'firebase/firestore'
import { db } from './firebase.js'

export const mesmaVersao = (a,b) => (a?.seconds||0)===(b?.seconds||0) && (a?.nanoseconds||0)===(b?.nanoseconds||0)

/** Impede que um editor aberto apague preços ou vínculos salvos em outra tela. */
export async function salvarModelo(modelo, patch) {
  const atualizadoEm=Timestamp.now()
  await runTransaction(db, async tx=>{
    const ref=doc(db,'modelos',modelo.id), atual=await tx.get(ref)
    if(!atual.exists()) throw Error('O projeto foi removido.')
    if(!mesmaVersao(atual.data().atualizadoEm,modelo.atualizadoEm)) throw Error('Este projeto mudou em outra tela. Recarregue a página antes de salvar para preservar essas alterações.')
    tx.update(ref,{...patch,atualizadoEm})
  })
  return {...modelo,...patch,atualizadoEm}
}
