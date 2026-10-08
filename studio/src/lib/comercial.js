import { collection, getDocs, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions, db } from './firebase.js'

export const executarComercial = async (nome, dados) =>
  (await httpsCallable(functions, nome, {timeout:300000})(dados)).data

export async function listarPropostasGestao(opcoes={}){
  let cursor=null,lista=[]
  do{const r=await executarComercial('listarPropostasGestao',{...opcoes,...(cursor?{cursor}:{})});lista.push(...r.propostas);cursor=r.cursor}while(cursor)
  return lista.sort((a,b)=>(b.criadoEm?._seconds??b.criadoEm?.seconds??0)-(a.criadoEm?._seconds??a.criadoEm?.seconds??0))
}

export async function listarComercial(nome, perfil) {
  const base = collection(db, nome)
  const q =
    perfil.papel === 'admin'
      ? base
      : query(
          base,
          where(
            nome === 'modelos' ? 'organizadoraIds' : 'organizadoraId',
            nome === 'modelos' ? 'array-contains' : '==',
            perfil.organizadoraId,
          ),
        )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter(d => !['feiras','organizadoras'].includes(nome) || !d.excluidaEm)
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0))
}
