import { useState } from 'react'
import { useStand, PISOS, NAPAS, MOBILIARIO, PAISAGISMO, ELETRICA } from '../store/StandStore.jsx'
import { fmtBRL } from '../data/catalogo.js'
import Swatches from './Swatches.jsx'

const PASSOS = ['Piso', 'Paredes', 'Destaques', 'Mobiliário', 'Elétrica', 'Resumo']

export default function ClientWizard() {
  const { state, dispatch, orcamento } = useStand()
  const [passo, setPasso] = useState(0)
  const primeiraCor = (g, k) => g[k].itens[0].id

  const conteudo = () => {
    switch (passo) {
      case 0: return (
        <>
          <p className="wz-lead">Escolha o piso do seu estande. Você pode manter o carpete e trocar a cor, ou trazer o piso vinílico para um acabamento premium.</p>
          <Swatches grupos={PISOS} grupoAtivo={state.piso.grupo} corId={state.piso.corId}
            onGrupo={(k) => dispatch({ type: 'SET_PISO', grupo: k, corId: primeiraCor(PISOS, k) })}
            onCor={(id) => dispatch({ type: 'SET_PISO', grupo: state.piso.grupo, corId: id })} />
        </>
      )
      case 1: return (
        <>
          <p className="wz-lead">Defina a cor das paredes em napa. Temos cores lisas, amadeiradas e efeitos especiais (cimento, tijolo…).</p>
          <Swatches grupos={NAPAS} grupoAtivo={state.parede.grupo} corId={state.parede.corId}
            onGrupo={(k) => dispatch({ type: 'SET_PAREDE', grupo: k, corId: primeiraCor(NAPAS, k) })}
            onCor={(id) => dispatch({ type: 'SET_PAREDE', grupo: state.parede.grupo, corId: id })} />
        </>
      )
      case 2: return (
        <>
          <p className="wz-lead">Dê um upgrade no seu estande com destaques que chamam atenção no corredor.</p>
          <div className="wz-card" onClick={() => dispatch({ type: 'TOGGLE_LED' })}>
            <div>
              <b>Painel de LED na testeira</b>
              <small>Colunas frontais em LED, como nas Opções A/B</small>
            </div>
            <span className={`wz-check ${state.ledTesteira ? 'on' : ''}`}>{state.ledTesteira ? '✓' : '+'}</span>
          </div>
          <div className="wz-card" onClick={() => dispatch({ type: 'TOGGLE_SALA' })}>
            <div>
              <b>Sala de reunião de vidro</b>
              <small>Ambiente fechado com porta, até 4,0 × 3,0 m</small>
            </div>
            <span className={`wz-check ${state.salaReuniao ? 'on' : ''}`}>{state.salaReuniao ? '✓' : '+'}</span>
          </div>
          <p className="wz-hint">Depois é só arrastar a sala na planta baixa para posicionar.</p>
        </>
      )
      case 3: return (
        <>
          <p className="wz-lead">Monte o mobiliário e traga um toque verde. Arraste os itens na planta para posicionar.</p>
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
              <button key={p.id} className="chip" onClick={() => dispatch({ type: 'ADD_PAISAGISMO', tipo: p.id })}>
                {p.nome}<small>+ {fmtBRL(p.preco)}</small>
              </button>
            ))}
          </div>
          <div className="mini-list">
            {state.mobiliario.map((m) => {
              const meta = MOBILIARIO.find((x) => x.id === m.tipo)
              return (
                <div key={m.uid} className="mini-item">
                  {meta?.nome}{m.base && <span className="badge-incluso">incluso</span>}
                  <button className="x" onClick={() => dispatch({ type: 'REMOVER_MOBILIARIO', uid: m.uid })}>×</button>
                </div>
              )
            })}
            {state.paisagismo.map((p) => {
              const meta = PAISAGISMO.find((x) => x.id === p.tipo)
              return (
                <div key={p.uid} className="mini-item">🌿 {meta?.nome}
                  <button className="x" onClick={() => dispatch({ type: 'REMOVER_PAISAGISMO', uid: p.uid })}>×</button>
                </div>
              )
            })}
          </div>
        </>
      )
      case 4: return (
        <>
          <p className="wz-lead">Precisa de mais pontos de energia? Escolha o tipo e <b>clique na planta baixa</b> onde quiser cada ponto.</p>
          <div className="chip-grid">
            {ELETRICA.map((e) => (
              <button key={e.id} className="chip"
                onClick={() => window.dispatchEvent(new CustomEvent('psf-eletrica-sel', { detail: e.id }))}>
                <span style={{ color: e.cor }}>{e.simbolo}</span> {e.nome}<small>+ {fmtBRL(e.preco)} / un.</small>
              </button>
            ))}
          </div>
          <p className="wz-hint">{state.eletrica.length} ponto(s) adicionado(s). Clique num ponto na planta para remover.</p>
        </>
      )
      case 5: return (
        <>
          <p className="wz-lead">Tudo pronto! Veja o resumo do seu estande personalizado.</p>
          <div className="wz-resumo">
            {orcamento.linhas.length === 0
              ? <div className="orc-empty">Você manteve o pacote base, sem extras.</div>
              : orcamento.linhas.map((l, i) => (
                <div key={i} className="orc-line"><span className="lbl">{l.label}</span><span className="val">{fmtBRL(l.valor)}</span></div>
              ))}
          </div>
          <div className="wz-total">
            <span>Total de extras</span>
            <b>{fmtBRL(orcamento.total)}</b>
          </div>
          <p className="wz-hint">Use o painel à direita para gerar o resumo comercial (PDF) e enviar ao atendimento.</p>
        </>
      )
      default: return null
    }
  }

  return (
    <div className="wizard">
      <div className="wz-head">
        <div className="wz-step-label">Passo {passo + 1} de {PASSOS.length}</div>
        <h2>{PASSOS[passo]}</h2>
        <div className="wz-dots">
          {PASSOS.map((_, i) => (
            <span key={i} className={`wz-dot ${i === passo ? 'active' : ''} ${i < passo ? 'done' : ''}`}
              onClick={() => setPasso(i)} />
          ))}
        </div>
      </div>
      <div className="wz-body">{conteudo()}</div>
      <div className="wz-foot">
        <button className="btn" disabled={passo === 0} onClick={() => setPasso((p) => Math.max(0, p - 1))}>Voltar</button>
        {passo < PASSOS.length - 1
          ? <button className="btn btn-primary" onClick={() => setPasso((p) => p + 1)}>Próximo</button>
          : <button className="btn btn-primary" onClick={() => setPasso(0)}>Revisar do início</button>}
      </div>
    </div>
  )
}
