import { useState } from 'react'
import { useStand, PISOS, MOBILIARIO, PAISAGISMO, ELETRICA } from '../store/StandStore.jsx'
import { fmtBRL } from '../data/catalogo.js'
import Swatches from './Swatches.jsx'
import ParedeEditor from './ParedeEditor.jsx'
import LedOptions from './LedOptions.jsx'

const PASSOS = [
  { nome: 'Piso', ico: '▦', sub: 'A base do seu estande', dica: 'Cores escuras dão sofisticação; claras ampliam o espaço. O vinílico dá um acabamento premium.' },
  { nome: 'Paredes', ico: '▚', sub: 'Cores e lonas de cada parede', dica: 'Clique direto na parede — na cena 3D ou na planta — para selecioná-la. Cada parede pode ter uma cor ou lona diferente.' },
  { nome: 'Destaques', ico: '✦', sub: 'LED e sala de reunião', dica: 'O painel de LED é o que mais chama atenção no corredor. A sala de vidro cria um ambiente reservado para negócios.' },
  { nome: 'Mobiliário', ico: '🪑', sub: 'Móveis e paisagismo', dica: 'Arraste os itens na planta para posicionar e use ⟳ para girar. Você também pode remover os itens inclusos.' },
  { nome: 'Elétrica', ico: '⚡', sub: 'Pontos de energia extras', dica: 'Posicione as tomadas perto de onde ficarão telas, balcão e carregadores.' },
  { nome: 'Resumo', ico: '✓', sub: 'Revise e envie', dica: 'Confira tudo e gere o resumo comercial em PDF para o atendimento dar sequência.' },
]

export default function ClientWizard() {
  const { state, dispatch, orcamento } = useStand()
  const [passo, setPasso] = useState(0)
  const primeiraCor = (g, k) => g[k].itens[0].id
  const P = PASSOS[passo]
  const pct = Math.round(((passo + 1) / PASSOS.length) * 100)

  const conteudo = () => {
    switch (passo) {
      case 0: return (
        <Swatches grupos={PISOS} grupoAtivo={state.piso.grupo} corId={state.piso.corId}
          onGrupo={(k) => dispatch({ type: 'SET_PISO', grupo: k, corId: primeiraCor(PISOS, k) })}
          onCor={(id) => dispatch({ type: 'SET_PISO', grupo: state.piso.grupo, corId: id })} />
      )
      case 1: return <ParedeEditor />
      case 2: return (
        <>
          <div className="wz-sub">Painel de LED</div>
          <LedOptions />
          <div className="wz-sub">Sala de reunião</div>
          <div className="wz-card" onClick={() => dispatch({ type: 'TOGGLE_SALA' })}>
            <div><b>Sala de reunião de vidro</b><small>Vidro com porta, sem teto, até 4,0 × 3,0 m</small></div>
            <span className={`wz-check ${state.salaReuniao ? 'on' : ''}`}>{state.salaReuniao ? '✓' : '+'}</span>
          </div>
        </>
      )
      case 3: return (
        <>
          <div className="wz-sub">Mobiliário</div>
          <div className="chip-grid">
            {MOBILIARIO.filter((m) => !m.base).map((m) => (
              <button key={m.id} className="chip" onClick={() => dispatch({ type: 'ADD_MOBILIARIO', tipo: m.id })}>
                {m.nome}<small>{m.preco ? `+ ${fmtBRL(m.preco)}` : 'incluso'}</small>
              </button>
            ))}
          </div>
          <div className="wz-sub">Paisagismo</div>
          <div className="chip-grid">
            {PAISAGISMO.map((p) => (
              <button key={p.id} className="chip" onClick={() => dispatch({ type: 'ADD_PAISAGISMO', tipo: p.id })}>{p.nome}<small>+ {fmtBRL(p.preco)}</small></button>
            ))}
          </div>
          <div className="mini-list">
            {state.mobiliario.map((m) => {
              const meta = MOBILIARIO.find((x) => x.id === m.tipo)
              return (
                <div key={m.uid} className="mini-item">
                  {meta?.nome}{m.base && <span className="badge-incluso">incluso</span>}
                  <button className="ic" title="Girar" onClick={() => dispatch({ type: 'GIRAR_MOBILIARIO', uid: m.uid })}>⟳</button>
                  <button className="x" onClick={() => dispatch({ type: 'REMOVER_MOBILIARIO', uid: m.uid })}>×</button>
                </div>
              )
            })}
            {state.paisagismo.map((p) => {
              const meta = PAISAGISMO.find((x) => x.id === p.tipo)
              return <div key={p.uid} className="mini-item">🌿 {meta?.nome}<button className="x" onClick={() => dispatch({ type: 'REMOVER_PAISAGISMO', uid: p.uid })}>×</button></div>
            })}
          </div>
        </>
      )
      case 4: return (
        <>
          <div className="chip-grid">
            {ELETRICA.map((e) => (
              <button key={e.id} className="chip" onClick={() => window.dispatchEvent(new CustomEvent('psf-eletrica-sel', { detail: e.id }))}>
                <span style={{ color: e.cor }}>{e.simbolo}</span> {e.nome}<small>+ {fmtBRL(e.preco)} / un.</small>
              </button>
            ))}
          </div>
          <p className="wz-hint">{state.eletrica.length} ponto(s) adicionado(s). Clique num ponto na planta para remover.</p>
        </>
      )
      case 5: return (
        <>
          <div className="wz-resumo">
            {orcamento.linhas.length === 0
              ? <div className="orc-empty">Você manteve o pacote base, sem extras.</div>
              : orcamento.linhas.map((l, i) => <div key={i} className="orc-line"><span className="lbl">{l.label}</span><span className="val">{fmtBRL(l.valor)}</span></div>)}
          </div>
          <div className="wz-total"><span>Total de extras</span><b>{fmtBRL(orcamento.total)}</b></div>
          <p className="wz-hint">Use o painel à direita para gerar o resumo comercial (PDF) e enviar ao atendimento.</p>
        </>
      )
      default: return null
    }
  }

  return (
    <div className="wizard">
      <div className="wz-head">
        <div className="wz-progressbar"><span style={{ width: `${pct}%` }} /></div>
        <div className="wz-step-label">Passo {passo + 1} de {PASSOS.length} · {pct}%</div>
        <h2><span className="wz-ico">{P.ico}</span> {P.nome}</h2>
        <div className="wz-substep">{P.sub}</div>
        <div className="wz-steps">
          {PASSOS.map((s, i) => (
            <button key={i} className={`wz-steppill ${i === passo ? 'active' : ''} ${i < passo ? 'done' : ''}`} onClick={() => setPasso(i)}>
              {i < passo ? '✓' : s.ico}
            </button>
          ))}
        </div>
      </div>
      <div className="wz-body">
        {conteudo()}
        <div className="wz-dica"><b>💡 Dica</b> {P.dica}</div>
      </div>
      <div className="wz-foot">
        <div className="wz-foot-total">
          <span>Extras até aqui</span>
          <b>{fmtBRL(orcamento.total)}</b>
        </div>
        <div className="wz-foot-btns">
          <button className="btn" disabled={passo === 0} onClick={() => setPasso((p) => Math.max(0, p - 1))}>Voltar</button>
          {passo < PASSOS.length - 1
            ? <button className="btn btn-primary" onClick={() => setPasso((p) => p + 1)}>Próximo →</button>
            : <button className="btn btn-primary" onClick={() => setPasso(0)}>Revisar</button>}
        </div>
      </div>
    </div>
  )
}
