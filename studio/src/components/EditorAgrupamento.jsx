import { useEffect, useMemo, useState } from 'react'
import { sugerirPartes, chavesDoElemento } from '../lib/glb/agrupamento.js'

export default function EditorAgrupamento({ elemento, lista, superficies, analise, aoAplicar, aoFechar, aoFocar }) {
  useEffect(() => () => aoFocar?.(null), [aoFocar])
  const sugeridas = useMemo(() => sugerirPartes(elemento, superficies, analise), [elemento, superficies, analise])
  const [detalhado, setDetalhado] = useState(false)
  const partes = detalhado ? chavesDoElemento(elemento).map((k, i) => ({ nome: `Parte ${i + 1}`, tipo: elemento.tipo, chaves: [k] })) : sugeridas
  const [selecionadas, setSelecionadas] = useState([])
  const [unir, setUnir] = useState(false)
  const [outros, setOutros] = useState([])
  const [erro, setErro] = useState('')
  const aplicar = grupos => { try { aoAplicar(grupos) } catch (e) { setErro(e.message) } }
  const alternar = i => {
    const s = selecionadas.includes(i) ? selecionadas.filter(x => x !== i) : [...selecionadas, i]
    setSelecionadas(s); aoFocar?.(s.flatMap(i => partes[i].chaves))
  }
  return <section className="elementos-painel" aria-label="Corrigir agrupamento">
    <div className="orientacao"><strong>Separar ou juntar partes</strong><p>{elemento.nome}</p>
      <p>Marque as partes para destacá-las no estande. A alteração só é aplicada ao usar um dos botões abaixo.</p></div>
    <button className="btn btn-sm" onClick={aoFechar}>Voltar sem alterar</button>
    <div className="filtros-elementos"><button className={`chip ${!unir ? 'sel' : ''}`} onClick={() => setUnir(false)}>Separar este elemento</button>
      <button className={`chip ${unir ? 'sel' : ''}`} onClick={() => setUnir(true)}>Juntar com outro elemento</button></div>
    {!unir ? <>
      <p className="dim">{partes.length} partes {detalhado ? 'individuais' : 'sugeridas pelo arquivo original'}.</p>
      <button className="btn btn-sm" onClick={() => { setDetalhado(!detalhado); setSelecionadas([]); aoFocar?.(null) }}>{detalhado ? 'Voltar aos componentes' : 'Ver malhas individuais'}</button>
      {partes.map((g, i) => <label className="elemento-card elemento-titulo" key={i}>
        <input type="checkbox" checked={selecionadas.includes(i)} onChange={() => alternar(i)} />
        <span className="elemento-nome"><strong>{g.nome}</strong><small>Parte {i + 1} · {g.chaves.length} malhas</small></span>
      </label>)}
      {partes.length > 1 ? <>
        <button className="btn btn-primary" onClick={() => aplicar(partes)}>Separar em {partes.length} elementos</button>
        <button className="btn" disabled={!selecionadas.length || selecionadas.length === partes.length} onClick={() => {
          const marcadas = partes.filter((_, i) => selecionadas.includes(i)), resto = partes.filter((_, i) => !selecionadas.includes(i))
          aplicar([{ nome: marcadas[0].nome, tipo: marcadas[0].tipo, chaves: marcadas.flatMap(p => p.chaves) },
            { nome: elemento.nome, tipo: elemento.tipo, chaves: resto.flatMap(p => p.chaves) }])
        }}>Destacar somente a seleção</button>
      </> : <p className="dim">Este elemento já é uma parte independente. Para juntar, escolha outro elemento na aba acima.</p>}
    </> : <>
      {lista.filter(e => e.id !== elemento.id && e.tipo === elemento.tipo).map(e => <label className="elemento-card elemento-titulo" key={e.id}>
        <input type="checkbox" checked={outros.includes(e.id)} onChange={() => {
          const ids = outros.includes(e.id) ? outros.filter(id => id !== e.id) : [...outros, e.id]
          setOutros(ids); aoFocar?.([elemento, ...lista.filter(e => ids.includes(e.id))].flatMap(chavesDoElemento))
        }} /><span>{e.nome}</span>
      </label>)}
      <button className="btn btn-primary" disabled={!outros.length} onClick={() => aplicar([{ nome: elemento.nome, tipo: elemento.tipo,
        chaves: [...new Set([elemento, ...lista.filter(e => outros.includes(e.id))].flatMap(chavesDoElemento))] }])}>Juntar {outros.length + 1} elementos</button>
    </>}
    {erro && <p role="alert" className="erro-inline">{erro}</p>}
  </section>
}
