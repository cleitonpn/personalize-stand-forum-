import { Timestamp } from 'firebase/firestore'
import { executarComercial } from './comercial.js'

export const mesmaVersao = (a,b) => (a?.seconds||0)===(b?.seconds||0) && (a?.nanoseconds||0)===(b?.nanoseconds||0)

/** Impede que um editor aberto apague preços ou vínculos salvos em outra tela. */
export async function salvarModelo(modelo, patch) {
  const resultado=await executarComercial('salvarProjetoAdmin',{id:modelo.id,patch,versao:{seconds:modelo.atualizadoEm?.seconds||0,nanoseconds:modelo.atualizadoEm?.nanoseconds||0}})
  const atualizadoEm=new Timestamp(resultado.atualizadoEm.seconds,resultado.atualizadoEm.nanoseconds)
  return {...modelo,...patch,atualizadoEm}
}
