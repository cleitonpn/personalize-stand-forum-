import { useMemo, useRef, useState } from 'react'
import { listarElementos, limitarTransformacao } from '../lib/glb/elementos.js'
import { limitesDoEstande } from '../lib/glb/nomes.js'
import { fmtBRL } from '../lib/glb/precos.js'
import { opcoesAtivas, superficiesEscondidas } from '../lib/glb/complementos.js'
import { CORES } from '../lib/cores.js'
import { enviarArte } from '../lib/artes.js'
import EscolhaComplemento from './EscolhaComplemento.jsx'

export default function PainelExpositor({ analise, superficies, acabamentos, setAcabamentos,
  supFoco, setSupFoco, recorte, orcamento, complementos = [], escolhas, setEscolhas,
  objetos = [], setObjetos, objFoco, setObjFoco, objSel, setObjSel,
  enviarArquivo = enviarArte, aoEnviarArte }) {
  const [filtro, setFiltro] = useState('todos')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const arquivo = useRef(null)
  const destinosArte = useRef([])
  const escondidas = useMemo(() => superficiesEscondidas(opcoesAtivas(complementos, escolhas)), [complementos, escolhas])
  const lista = useMemo(() => listarElementos(superficies, objetos || [], analise, recorte), [superficies, objetos, analise, recorte])
  const disponiveis = lista.filter(e => e.superficies.some(s => !escondidas.has(s.id) && (s.podeCor || s.podeArte))
    || e.objetos.some(o => (o.podeMover || o.podeGirar) && !o.pecas.every(k => superficies.some(s => escondidas.has(s.id) && s.pecas.includes(k))))
    || complementos.some(g => e.superficies.some(s => s.id === g.ancora)))
  const atual = disponiveis.find(e => e.superficies.some(s => s.id === supFoco) || e.objetos.some(o => o.id === objFoco))
  const selecionar = e => { setSupFoco(e.superficies[0]?.id || null); setObjFoco(e.objetos[0]?.id || null); setObjSel(null); setErro('') }
  const voltar = () => { setSupFoco(null); setObjFoco(null); setObjSel(null) }
  const aplicar = (ids, patch) => setAcabamentos(a => {
    const n = { ...a }; for (const id of ids) n[id] = { ...n[id], ...patch }; return n
  })
  const upload = async ev => {
    const f = ev.target.files?.[0]; ev.target.value = ''
    if (!f) return
    const ids = destinosArte.current.slice()
    setEnviando(true); aoEnviarArte?.(true); setErro('')
    try { aplicar(ids, await enviarArquivo(f)) }
    catch (e) { setErro(e.message || 'Não foi possível enviar. Tente novamente.') }
    finally { setEnviando(false); aoEnviarArte?.(false) }
  }
  const perguntasSoltas = complementos.filter(g => !g.ancora || !lista.some(e => e.superficies.some(s => s.id === g.ancora)))
  const transformar = (o, patch) => setObjetos(os => os.map(x => x.id === o.id
    ? { ...x, transform: limitarTransformacao(x, patch, limitesDoEstande(analise, recorte)) } : x))
  const opcoes = g => <EscolhaComplemento key={g.id} grupo={g} escolhido={escolhas?.[g.id]}
    aoEscolher={oid => setEscolhas(e => ({ ...e, [g.id]: oid }))} />
  return <div className="elementos-painel">
    <div className="orientacao"><strong>Deixe o estande do seu jeito</strong>
      <p>Clique em uma parte do estande ou escolha abaixo. Você verá apenas as opções disponíveis.</p></div>
    <div className="filtros-elementos" aria-label="O que personalizar">
      {[['todos', 'Tudo'], ['parede', 'Paredes'], ['piso', 'Piso'], ['movel', 'Móveis'], ['adicionais', 'Adicionais']].map(([id, nome]) =>
        <button className={`chip ${filtro === id ? 'sel' : ''}`} aria-pressed={filtro === id} key={id} onClick={() => { setFiltro(id); voltar() }}>{nome}</button>)}
    </div>
    {enviando && <p className="orientacao" role="status">Enviando sua arte… Você pode continuar escolhendo as cores.</p>}
    {erro && <p className="erro-inline" role="alert">{erro}</p>}
    {atual ? <article className="elemento-card selecionado">
      <div className="elemento-titulo"><span className="elemento-nome"><strong>{atual.nome}</strong><small>Suas escolhas aparecem no estande</small></span>
        <button className="btn btn-sm btn-ghost" onClick={voltar}>Voltar</button></div>
      <div className="elemento-opcoes">
        {(() => {
          const sups = atual.superficies.filter(s => !escondidas.has(s.id))
          const cores = sups.filter(s => s.podeCor).map(s => s.id)
          const artes = sups.filter(s => s.podeArte).map(s => s.id)
          const modificado = sups.some(s => acabamentos[s.id]?.cor || acabamentos[s.id]?.arte)
          const valor = (orcamento?.itens || []).filter(i => atual.superficies.some(s => s.id === i.id)).reduce((n, i) => n + i.total, 0)
          return <>
            {cores.length > 0 && <div><div className="label">Escolha uma cor</div>
              <div className="cartela-cores">{CORES.map(c => {
                const marcado = cores.every(id => acabamentos[id]?.corId === c.id)
                return <button key={c.id} className={`amostra ${marcado ? 'ativa' : ''}`} aria-pressed={marcado}
                  aria-label={c.nome} title={c.nome} onClick={() => aplicar(cores, { cor: c.hex, corId: c.id })}>
                  <span style={{ background: c.hex }} /><small>{c.nome}</small></button>
              })}</div></div>}
            {artes.length > 0 && <div className="col" style={{ gap: 8 }}><div className="label">Sua arte</div>
              <button className="btn" disabled={enviando} onClick={() => { destinosArte.current = artes; arquivo.current?.click() }}>
                {enviando ? 'Enviando…' : artes.some(id => acabamentos[id]?.arte) ? 'Trocar imagem' : 'Enviar imagem'}</button>
              {artes.some(id => acabamentos[id]?.arte) && <button className="btn btn-sm btn-ghost" onClick={() => setAcabamentos(a => {
                const n = { ...a }; for (const id of artes) { n[id] = { ...n[id] }; for (const k of ['arte', 'nomeArte', 'caminhoArte']) delete n[id][k] } return n
              })}>Remover imagem</button>}
              <small className="dim">PNG, JPG ou WebP · menos de 25 MB</small>
            </div>}
            {modificado && <><div className="row" style={{ justifyContent: 'space-between' }}><span>Personalização</span><strong>{fmtBRL(valor)}</strong></div>
              <button className="btn btn-sm" onClick={() => setAcabamentos(a => { const n = { ...a }; for (const s of atual.superficies) delete n[s.id]; return n })}>Restaurar acabamento original</button></>}
          </>
        })()}
        {atual.objetos.filter(o => o.podeMover || o.podeGirar).map(o => <div className="col" style={{ gap: 10 }} key={o.id}>
          <button className={`btn ${objSel === o.id ? 'btn-primary' : ''}`} onClick={() => setObjSel(objSel === o.id ? null : o.id)}>
            {objSel === o.id ? 'Concluir posicionamento' : 'Ajustar posição'}</button>
          {objSel === o.id && <>
            <p className="dim">{o.podeMover ? 'Arraste a marca no chão ou use as setas.' : ''} {o.podeGirar ? 'Use o anel azul ou os botões para girar.' : ''}</p>
            {o.podeMover && <div className="filtros-elementos">{[['←', -0.25, 0, 'Mover para esquerda'], ['↑', 0, -0.25, 'Mover para fundo'], ['↓', 0, 0.25, 'Mover para frente'], ['→', 0.25, 0, 'Mover para direita']].map(([nome, x, z, label]) =>
              <button className="btn" aria-label={label} key={nome} onClick={() => transformar(o, { dx: (o.transform?.dx || 0) + x, dz: (o.transform?.dz || 0) + z })}>{nome}</button>)}</div>}
            {o.podeGirar && <div className="filtros-elementos">{[-1, 1].map(s => <button className="btn" key={s} onClick={() => transformar(o, { rotY: (o.transform?.rotY || 0) + s * Math.PI / 12 })}>{s < 0 ? '↶' : '↷'} Girar 15°</button>)}</div>}
            <button className="btn btn-sm btn-ghost" onClick={() => transformar(o, { dx: 0, dz: 0, rotY: 0 })}>Voltar à posição original</button>
          </>}
        </div>)}
        {complementos.filter(g => atual.superficies.some(s => s.id === g.ancora)).map(opcoes)}
      </div>
    </article> : <>
      {filtro !== 'adicionais' && disponiveis.filter(e => filtro === 'todos' || e.tipo === filtro).map(e =>
        <button className="elemento-card elemento-titulo" key={e.id} onClick={() => selecionar(e)}>
          <span className="elemento-icone" aria-hidden="true">{e.tipo === 'piso' ? '▦' : e.tipo === 'parede' ? '▥' : '◇'}</span>
          <span className="elemento-nome"><strong>{e.nome}</strong><small>{e.superficies.some(s => acabamentos[s.id]?.cor || acabamentos[s.id]?.arte) ? 'Personalizado' : 'Ver opções'}</small></span><span aria-hidden="true">→</span>
        </button>)}
      {(filtro === 'adicionais' ? complementos : filtro === 'todos' ? perguntasSoltas : []).map(opcoes)}
      {!disponiveis.length && !complementos.length && <p className="muted">A equipe está preparando as opções deste estande.</p>}
      {disponiveis.length > 0 && !disponiveis.some(e => filtro === 'todos' || e.tipo === filtro) && filtro !== 'adicionais' && <p className="muted">Não há opções nesta categoria.</p>}
      {filtro === 'adicionais' && !complementos.length && <p className="muted">Este projeto não tem adicionais disponíveis.</p>}
    </>}
    <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
  </div>
}
