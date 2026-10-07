import { collection, getDocs, query, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { functions, db } from './firebase.js'

export const executarComercial = async (nome, dados) =>
  (await httpsCallable(functions, nome, {timeout:300000})(dados)).data

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
    .sort((a, b) => (b.criadoEm?.seconds || 0) - (a.criadoEm?.seconds || 0))
}
