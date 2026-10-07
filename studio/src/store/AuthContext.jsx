import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase.js'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erroPerfil,setErroPerfil]=useState('')
  const leitura=useRef(0)

  const lerPerfil = async (u) => {
    const pedido=++leitura.current
    setCarregando(true);setErroPerfil('');setPerfil(null)
    if (!u) { setCarregando(false);return }
    try {
      const snap = await getDoc(doc(db, 'usuarios', u.uid))
      if(pedido!==leitura.current)return
      if(snap.exists())setPerfil(snap.data())
      else setErroPerfil('Seu acesso ainda não foi cadastrado pela equipe da USET. Entre em contato para vincular seu projeto.')
    } catch {
      if(pedido===leitura.current)setErroPerfil('Não foi possível consultar seu acesso. Verifique a conexão e tente novamente.')
    } finally {if(pedido===leitura.current)setCarregando(false)}
  }

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u)
    // O papel do usuário (admin / expositor) vive em /usuarios/{uid}.
    // As regras do Firestore leem esse mesmo documento — o app nunca decide
    // permissão sozinho, só espelha o que o servidor já garante.
    await lerPerfil(u)
  }), [])

  const value = useMemo(() => ({
    user, perfil, carregando,erroPerfil,
    ehAdmin: perfil?.papel === 'admin',
    ehOrganizadora: perfil?.papel === 'organizadora',
    entrar: (email, senha) => signInWithEmailAndPassword(auth, email, senha),
    recarregarPerfil: () => lerPerfil(auth.currentUser),
    sair: () => signOut(auth),
  }), [user, perfil, carregando,erroPerfil])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth fora do AuthProvider')
  return c
}
