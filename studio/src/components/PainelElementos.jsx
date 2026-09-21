import { useMemo, useState } from 'react'
import { listarElementos, TIPOS_ELEMENTO } from '../lib/glb/elementos.js'
import EditorAgrupamento from './EditorAgrupamento.jsx'
import { aplicarGrupos } from '../lib/glb/agrupamento.js'
import { Interruptor } from './Interruptor.jsx'

const icones = { logo: '▧', parede: '▥', piso: '▦', movel: '▤', estrutura: '◇', outro: '◈' }
export default function PainelElementos({ analise, superficies, objetos, recorte,
  setSuperficies, setObjetos, supFoco, objFoco, aoSelecionar, aoAvancado, aoOrganizar, aoDesfazer, aoFocarPartes, complementos = [], setComplementos, aoAgrupar, acabamentos = {}, setAcabamentos }) {
  const [edicao, setEdicao] = useState(null)
  const [anterior, setAnterior] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const lista = useMemo(() => listarElementos(superficies, objetos, analise, recorte), [superficies, objetos, analise, recorte])
  const visiveis = lista.filter(e => (filtro === 'todos' || (filtro === 'revisar' ? !e.revisado : e.tipo === filtro))
    && e.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')))
  const alterar = (e, patch) => {
    const ids = new Set(e.superficies.map(s => s.id))
    setSuperficies(ss => ss.map(s => ids.has(s.id) ? { ...s, ...patch } : s))
  }
  const alterarObjetos = (e, patch) => {
    const ids = new Set(e.objetos.map(o => o.id))
    setObjetos(os => os.map(o => ids.has(o.id) ? { ...o, tipoPreco: o.tipoPreco || o.nome.replace(/\s+\d+$/, ''), ...patch } : o))
  }
  const confirmar = (elementos) => {
    const sups = new Set(elementos.flatMap(e => e.superficies.map(s => s.id)))
    const objs = new Set(elementos.flatMap(e => e.objetos.map(o => o.id)))
    setSuperficies(ss => ss.map(s => sups.has(s.id) ? { ...s, revisado: true } : s))
    setObjetos(os => os.map(o => objs.has(o.id) ? { ...o, revisado: true } : o))
  }
  const fechar = () => { setEdicao(null); aoFocarPartes?.(null); aoSelecionar(null, null) }
  if (edicao) return <EditorAgrupamento elemento={edicao} {...{ lista, superficies, analise }} aoFocar={aoFocarPartes} aoFechar={fechar}
    aoAplicar={grupos => {
      const resultado = aplicarGrupos({ grupos, superficies, objetos, analise, complementos, acabamentos })
      setAnterior({ superficies, objetos, complementos, acabamentos }); setSuperficies(resultado.superficies); setObjetos(resultado.objetos)
      aoAgrupar?.(resultado.superficies); setAcabamentos?.(resultado.acabamentos)
      setComplementos?.(resultado.complementos); setBusca(''); setFiltro('todos'); setMensagem('Agrupamento aplicado. Confira o resultado na lista.'); fechar()
    }} />
  return <div className="elementos-painel">
    {mensagem && <p className="orientacao" role="status">{mensagem}</p>}
    {anterior && <button className="btn btn-sm" onClick={() => {
      setSuperficies(anterior.superficies); setObjetos(anterior.objetos); setComplementos?.(anterior.complementos)
      aoAgrupar?.(anterior.superficies); setAcabamentos?.(anterior.acabamentos)
      setAnterior(null); setMensagem('Agrupamento anterior restaurado.'); fechar()
    }}>Desfazer último agrupamento</button>}
    <div className="orientacao">
      <strong>O que o cliente pode personalizar?</strong>
      <p>Clique no estande ou escolha um elemento abaixo. Confira as opções e confirme.</p>
      <span className="tag">{lista.filter(e => e.revisado).length} de {lista.length} confirmados</span>
    </div>
    <label className="field"><span className="sr-only">Buscar elemento</span>
      <input className="input" placeholder="Buscar parede, piso, móvel…" value={busca} onChange={e => setBusca(e.target.value)} />
    </label>
    <div className="filtros-elementos" aria-label="Filtrar elementos">
      {[['todos', 'Todos'], ['revisar', 'Revisar'], ['parede', 'Paredes'], ['logo', 'Logos'], ['piso', 'Piso'], ['movel', 'Móveis']].map(([id, nome]) =>
        <button className={`chip ${filtro === id ? 'sel' : ''}`} aria-pressed={filtro === id} key={id} onClick={() => setFiltro(id)}>{nome}</button>)}
    </div>
    {visiveis.length > 0 && <button className="btn btn-sm" onClick={() => confirmar(visiveis)}>{visiveis.length === 1 ? 'Confirmar este elemento' : `Confirmar os ${visiveis.length} elementos desta lista`}</button>}
    {!visiveis.length && <p className="muted" role="status">Nenhum elemento neste filtro.</p>}
    {visiveis.map(e => {
      const ativo = e.superficies.some(s => s.id === supFoco) || e.objetos.some(o => o.id === objFoco)
      const personalizavel = e.superficies.some(s => s.podeCor || s.podeArte || s.podeRemover) || e.objetos.some(o => o.podeMover || o.podeGirar)
      return <article className={`elemento-card ${ativo ? 'selecionado' : ''}`} key={e.id}>
        <button className="elemento-titulo" aria-expanded={ativo} onClick={() => aoSelecionar(ativo ? null : e.superficies[0]?.id || null, ativo ? null : e.objetos[0]?.id || null)}>
          <span className="elemento-icone" aria-hidden="true">{icones[e.tipo]}</span>
          <span className="elemento-nome"><strong>{e.nome}</strong><small>{personalizavel ? 'Personalizável' : 'Sem personalização'} · {e.revisado ? 'Confirmado' : 'Revisar'}</small></span>
          <span aria-hidden="true">{ativo ? '−' : '+'}</span>
        </button>
        {ativo && <div className="elemento-opcoes">
          <label className="field"><span className="label">Nome para o cliente</span>
            <input className="input" key={`${e.id}-nome`} defaultValue={e.nome} onBlur={ev => {
              const nome = ev.target.value.trim()
              if (nome && nome !== e.nome) { alterar(e, { nome, nomeManual: true }); alterarObjetos(e, { nome, nomeManual: true }) }
            }} /></label>
          {e.superficies.length > 0 && <label className="field"><span className="label">Este elemento é</span>
            <select className="select" value={e.tipo} onChange={ev => alterar(e, { tipoElemento: ev.target.value, tipoManual: true })}>
              {Object.entries(TIPOS_ELEMENTO).map(([id, nome]) => <option value={id} key={id}>{nome}</option>)}
            </select></label>}
          <Interruptor rotulo="Cliente pode personalizar" ligado={personalizavel} aoMudar={() => {
            alterar(e, { podeCor: !personalizavel, podeArte: !personalizavel && ['parede', 'logo'].includes(e.tipo), podeRemover: !personalizavel && e.tipo === 'logo', permsManuais: true })
            alterarObjetos(e, { podeMover: !personalizavel && e.tipo === 'movel', podeGirar: !personalizavel && e.tipo === 'movel' })
          }} />
          {personalizavel && <div className="permissoes-elemento">
            {e.superficies.length > 0 && <>
              <Interruptor rotulo="Escolher cor" ligado={e.superficies.some(s => s.podeCor)} aoMudar={() => alterar(e, { podeCor: !e.superficies.some(s => s.podeCor), permsManuais: true })} />
              <Interruptor rotulo="Enviar arte" ligado={e.superficies.some(s => s.podeArte)} aoMudar={() => alterar(e, { podeArte: !e.superficies.some(s => s.podeArte), permsManuais: true })} />
              <Interruptor rotulo="Remover do estande" ligado={e.superficies.some(s => s.podeRemover)} aoMudar={() => alterar(e, { podeRemover: !e.superficies.some(s => s.podeRemover), permsManuais: true })} />
            </>}
            {e.objetos.length > 0 && e.tipo === 'movel' && <>
              <Interruptor rotulo="Mover" ligado={e.objetos.some(o => o.podeMover)} aoMudar={() => alterarObjetos(e, { podeMover: !e.objetos.some(o => o.podeMover) })} />
              <Interruptor rotulo="Girar" ligado={e.objetos.some(o => o.podeGirar)} aoMudar={() => alterarObjetos(e, { podeGirar: !e.objetos.some(o => o.podeGirar) })} />
            </>}
          </div>}
          <button className="btn btn-primary" onClick={() => confirmar([e])}>{e.revisado ? '✓ Confirmado' : 'Confirmar elemento'}</button>
          <details><summary>Corrigir agrupamento</summary>
            <p className="dim">Separe os componentes do arquivo ou escolha quais elementos devem ficar juntos.</p>
            <button className="btn btn-sm" onClick={() => { setEdicao(e); aoFocarPartes?.(null) }}>Separar ou juntar partes</button>
          </details>
        </div>}
      </article>
    })}
    <details className="orientacao"><summary>Melhorar identificação do projeto</summary>
      <p>Organiza sugestões pela forma e posição. Preserva nomes, permissões, agrupamentos manuais e vínculos de adicionais já definidos.</p>
      <button className="btn btn-sm" onClick={aoOrganizar}>Atualizar sugestões</button>
      {aoDesfazer && <button className="btn btn-sm" onClick={aoDesfazer}>Desfazer organização</button>}
    </details>
  </div>
}
