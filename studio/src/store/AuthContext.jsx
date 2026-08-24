import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase.js'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u)
    if (u) {
      // O papel do usuário (admin / expositor) vive em /usuarios/{uid}.
      // As regras do Firestore leem esse mesmo documento — o app nunca decide
      // permissão sozinho, só espelha o que o servidor já garante.
      try {
        const snap = await getDoc(doc(db, 'usuarios', u.uid))
        setPerfil(snap.exists() ? snap.data() : { papel: 'expositor' })
      } catch {
        setPerfil({ papel: 'expositor' })
      }
    } else {
      setPerfil(null)
    }
    setCarregando(false)
  }), [])

  const value = useMemo(() => ({
    user, perfil, carregando,
    ehAdmin: perfil?.papel === 'admin',
    entrar: (email, senha) => signInWithEmailAndPassword(auth, email, senha),
    sair: () => signOut(auth),
  }), [user, perfil, carregando])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}
