import { useCallback, useState } from 'react'

export function useHistorico(inicial) {
  const [h, setH] = useState({ atual: inicial, antes: [], depois: [] })
  const mudar = useCallback((campo, valor) => setH(h => {
    const proximo = typeof valor === 'function' ? valor(h.atual[campo]) : valor
    if (proximo === h.atual[campo]) return h
    return { atual: { ...h.atual, [campo]: proximo }, antes: [...h.antes.slice(-29), h.atual], depois: [] }
  }), [])
  const restaurar = useCallback(atual => setH({ atual, antes: [], depois: [] }), [])
  const desfazer = () => setH(h => !h.antes.length ? h : { atual: h.antes.at(-1), antes: h.antes.slice(0, -1), depois: [h.atual, ...h.depois] })
  const refazer = () => setH(h => !h.depois.length ? h : { atual: h.depois[0], antes: [...h.antes, h.atual], depois: h.depois.slice(1) })
  return { ...h.atual, mudar, restaurar, desfazer, refazer, podeDesfazer: !!h.antes.length, podeRefazer: !!h.depois.length }
}
