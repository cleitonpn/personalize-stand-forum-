import { useEffect, useState } from 'react'
import { pecaDoCache } from './Viewer.jsx'
import { miniatura } from '../lib/miniaturas.js'

export default function Miniatura({ cena, elemento, opcao, numero }) {
  const personalizada = opcao?.miniatura || elemento?.superficies?.[0]?.miniatura
  const [url,setUrl] = useState(null)
  const chave = opcao?.arquivo?.url || `${cena?.uuid}:${elemento?.id}`
  useEffect(() => {
    let vivo = true
    setUrl(null)
    if (personalizada) return
    const timer = setTimeout(async () => {
      try {
        const objeto = opcao ? await pecaDoCache(opcao.arquivo.url) : cena
        const chaves = elemento && [...elemento.superficies.flatMap(s => s.pecas),...elemento.objetos.flatMap(o => o.pecas)]
        if (vivo && objeto) setUrl(miniatura(objeto,chaves,chave))
      } catch { /* Nome e numeração continuam disponíveis sem WebGL. */ }
    },0)
    return () => { vivo=false; clearTimeout(timer) }
  },[chave,personalizada])
  return <span className="miniatura-cliente">
    {(personalizada || url) ? <img src={personalizada || url} alt="" loading="lazy" /> : <span aria-hidden="true">◇</span>}
    {numero != null && <b>{numero}</b>}
  </span>
}
