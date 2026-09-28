import { createContext, useContext, useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from './AuthContext.jsx'
import { NAPAS, combinarNapas } from '../lib/napas.js'

const Ctx=createContext({catalogo:NAPAS,erro:'',carregando:false})
export function NapasProvider({children}) {
  const {user,perfil}=useAuth()
  const [estado,setEstado]=useState({catalogo:NAPAS,erro:'',carregando:true})
  useEffect(()=>{
    if(!user||!perfil||perfil.ativo===false){setEstado({catalogo:NAPAS,erro:'',carregando:false});return}
    setEstado({catalogo:NAPAS,erro:'',carregando:true})
    return onSnapshot(collection(db,'acabamentos'),s=>setEstado({catalogo:combinarNapas(s.docs.map(d=>({...d.data(),id:d.id}))),erro:'',carregando:false}),
      ()=>setEstado({catalogo:[],erro:'Não foi possível consultar os acabamentos disponíveis. Recarregue a página para tentar novamente.',carregando:false}))
  },[user?.uid,perfil?.ativo,perfil?.papel])
  return <Ctx.Provider value={estado}>{children}</Ctx.Provider>
}
export const useNapas=()=>useContext(Ctx)
