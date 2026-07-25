import { useState } from 'react'
import {
  useStand, PISOS, NAPAS, MOBILIARIO, PAISAGISMO, ELETRICA, REGRAS,
} from '../store/StandStore.jsx'
import Swatches from './Swatches.jsx'

function Section({ id, ico, titulo, tag, aberto, setAberto, children }) {
  const open = aberto === id
  return (
    <div className="cfg-section">
      <button className={`cfg-head ${open ? 'open' : ''}`} onClick={() => setAberto(open ? null : id)}>
        <span className="ico">{ico}</span>
        <span>{titulo}</span>
        {tag ? <span className="tag">{tag}</span> : null}
        <span className="chev">›</span>
      </button>
      {open && <div className="cfg-body">{children}</div>}
    </div>
  )
}

export default function Sidebar() {
  const { state, dispatch } = useStand()
  const [aberto, setAberto] = useState('piso')

  // grupo ativo dos seletores (deriva do estado, mas guardamos aba localmente p/ trocar sem cor)
  const pisoGrupo = state.piso.grupo
  const paredeGrupo = state.parede.grupo

  const primeiraCor = (grupos, k) => grupos[k].itens[0].id

  return (
    <div>
      {/* PISO */}
      <Section id="piso" ico="▦" titulo="Piso" aberto={aberto} setAberto={setAberto}
        tag={state.piso.grupo === 'vinilico' ? 'vinílico' : null}>
        <p className="hint">Troque a cor do carpete ou substitua por piso vinílico.</p>
        <Swatches grupos={PISOS} grupoAtivo={pisoGrupo} corId={state.piso.corId}
          onGrupo={(k) => dispatch({ type: 'SET_PISO', grupo: k, corId: primeiraCor(PISOS, k) })}
          onCor={(id) => dispatch({ type: 'SET_PISO', grupo: pisoGrupo, corId: id })} />
      </Section>

      {/* PAREDES */}
      <Section id="parede" ico="▚" titulo="Paredes (napa / bagum)" aberto={aberto} setAberto={setAberto}>
        <p className="hint">Cor da napa das paredes do estande.</p>
        <Swatches grupos={NAPAS} grupoAtivo={paredeGrupo} corId={state.parede.corId}
          onGrupo={(k) => dispatch({ type: 'SET_PAREDE', grupo: k, corId: primeiraCor(NAPAS, k) })}
          onCor={(id) => dispatch({ type: 'SET_PAREDE', grupo: paredeGrupo, corId: id })} />
      </Section>

      {/* LED TESTEIRA */}
      <Section id="led" ico="▮" titulo="Painel de LED na testeira" aberto={aberto} setAberto={setAberto}
        tag={state.ledTesteira ? 'incluso' : null}>
        <p className="hint">Substitui as colunas frontais impressas por painéis de LED (como nas Opções A/B).</p>
        <div className="toggle-row">
          <label className="switch">
            <input type="checkbox" checked={state.ledTesteira} onChange={() => dispatch({ type: 'TOGGLE_LED' })} />
            <span className="slider" />
          </label>
          <span>{state.ledTesteira ? 'Painéis de LED ativados' : 'Sem painéis de LED'}</span>
        </div>
      </Section>

      {/* DEPÓSITO */}
      <Section id="deposito" ico="▢" titulo="Depósito" aberto={aberto} setAberto={setAberto}>
        <p className="hint">
          Arraste o depósito na planta baixa para reposicionar. Ajuste o formato abaixo —
          a área mínima ({REGRAS.deposito.areaMin} m²) é sempre respeitada.
        </p>
        <div className="range-row">
          <span>Largura</span>
          <input type="range" min={REGRAS.deposito.wMin} max={REGRAS.deposito.wMax} step="0.1"
            value={state.deposito.w} onChange={(e) => dispatch({ type: 'REDIM_DEPOSITO', w: +e.target.value })} />
          <span className="rv">{state.deposito.w.toFixed(1)}m</span>
        </div>
        <div className="range-row">
          <span>Profund.</span>
          <input type="range" min={REGRAS.deposito.dMin} max={REGRAS.deposito.dMax} step="0.1"
            value={state.deposito.d} onChange={(e) => dispatch({ type: 'REDIM_DEPOSITO', d: +e.target.value })} />
          <span className="rv">{state.deposito.d.toFixed(1)}m</span>
        </div>
        <div className="sel-label">Área: <b>{(state.deposito.w * state.deposito.d).toFixed(2)} m²</b></div>
      </Section>

      {/* SALA DE REUNIÃO */}
      <Section id="sala" ico="◫" titulo="Sala de reunião de vidro" aberto={aberto} setAberto={setAberto}
        tag={state.salaReuniao ? 'incluso' : null}>
        <p className="hint">Sala fechada em vidro com porta, até {REGRAS.salaReuniao.wMax} × {REGRAS.salaReuniao.dMax} m. Arraste na planta para posicionar.</p>
        <div className="toggle-row">
          <label className="switch">
            <input type="checkbox" checked={!!state.salaReuniao} onChange={() => dispatch({ type: 'TOGGLE_SALA' })} />
            <span className="slider" />
          </label>
          <span>{state.salaReuniao ? 'Sala incluída' : 'Sem sala de reunião'}</span>
        </div>
        {state.salaReuniao && (
          <>
            <div className="range-row">
              <span>Largura</span>
              <input type="range" min={REGRAS.salaReuniao.wMin} max={REGRAS.salaReuniao.wMax} step="0.1"
                value={state.salaReuniao.w} onChange={(e) => dispatch({ type: 'REDIM_SALA', w: +e.target.value })} />
              <span className="rv">{state.salaReuniao.w.toFixed(1)}m</span>
            </div>
            <div className="range-row">
              <span>Profund.</span>
              <input type="range" min={REGRAS.salaReuniao.dMin} max={REGRAS.salaReuniao.dMax} step="0.1"
                value={state.salaReuniao.d} onChange={(e) => dispatch({ type: 'REDIM_SALA', d: +e.target.value })} />
              <span className="rv">{state.salaReuniao.d.toFixed(1)}m</span>
            </div>
          </>
        )}
      </Section>

      {/* MOBILIÁRIO */}
      <Section id="mob" ico="🪑" titulo="Mobiliário" aberto={aberto} setAberto={setAberto}
        tag={state.mobiliario.length > 4 ? `+${state.mobiliario.length - 4}` : null}>
        <p className="hint">Clique para adicionar. Depois arraste na planta para posicionar.</p>
        <div className="chip-grid">
          {MOBILIARIO.filter((m) => !m.base).map((m) => (
            <button key={m.id} className="chip" onClick={() => dispatch({ type: 'ADD_MOBILIARIO', tipo: m.id })}>
              {m.nome}
              <small>{m.preco ? `+ R$ ${m.preco}` : 'incluso'}</small>
            </button>
          ))}
        </div>
        <div className="mini-list">
          {state.mobiliario.map((m) => {
            const meta = MOBILIARIO.find((x) => x.id === m.tipo)
            return (
              <div key={m.uid} className="mini-item">
                {meta?.nome || m.tipo}
                {m.base && <span className="badge-incluso">incluso</span>}
                <button className="x" title="Remover" onClick={() => dispatch({ type: 'REMOVER_MOBILIARIO', uid: m.uid })}>×</button>
              </div>
            )
          })}
        </div>
      </Section>

      {/* PAISAGISMO */}
      <Section id="pais" ico="🌿" titulo="Paisagismo" aberto={aberto} setAberto={setAberto}
        tag={state.paisagismo.length ? `${state.paisagismo.length}` : null}>
        <p className="hint">Plantas e jardins. Arraste na planta para posicionar.</p>
        <div className="chip-grid">
          {PAISAGISMO.map((p) => (
            <button key={p.id} className="chip" onClick={() => dispatch({ type: 'ADD_PAISAGISMO', tipo: p.id })}>
              {p.nome}<small>+ R$ {p.preco}</small>
            </button>
          ))}
        </div>
        <div className="mini-list">
          {state.paisagismo.map((p) => {
            const meta = PAISAGISMO.find((x) => x.id === p.tipo)
            return (
              <div key={p.uid} className="mini-item">
                {meta?.nome || p.tipo}
                <button className="x" onClick={() => dispatch({ type: 'REMOVER_PAISAGISMO', uid: p.uid })}>×</button>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ELÉTRICA */}
      <Section id="elet" ico="⚡" titulo="Pontos de elétrica extras" aberto={aberto} setAberto={setAberto}
        tag={state.eletrica.length ? `${state.eletrica.length}` : null}>
        <p className="hint">Selecione o tipo e <b>clique na planta baixa</b> onde deseja o ponto.</p>
        <div className="chip-grid">
          {ELETRICA.map((e) => (
            <button key={e.id} className={`chip ${state.eletricaSel === e.id ? '' : ''}`}
              onClick={() => window.dispatchEvent(new CustomEvent('psf-eletrica-sel', { detail: e.id }))}>
              <span style={{ color: e.cor }}>{e.simbolo}</span> {e.nome}
              <small>+ R$ {e.preco} / un.</small>
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          {state.eletrica.length} ponto(s) adicionado(s). Clique num ponto na planta para remover.
        </p>
      </Section>

      {/* LONAS / LOGOS */}
      <Section id="graf" ico="🖼️" titulo="Lonas e logos adicionais" aberto={aberto} setAberto={setAberto}>
        <p className="hint">Comunicação visual extra além da inclusa no pacote.</p>
        <div className="stepper" style={{ marginBottom: 12 }}>
          <span style={{ flex: 1, fontSize: 13 }}>Lonas / gráficas</span>
          <button onClick={() => dispatch({ type: 'SET_EXTRA', chave: 'lonas', valor: state.extras.lonas - 1 })}>−</button>
          <span className="val">{state.extras.lonas}</span>
          <button onClick={() => dispatch({ type: 'SET_EXTRA', chave: 'lonas', valor: state.extras.lonas + 1 })}>+</button>
        </div>
        <div className="stepper">
          <span style={{ flex: 1, fontSize: 13 }}>Logos</span>
          <button onClick={() => dispatch({ type: 'SET_EXTRA', chave: 'logos', valor: state.extras.logos - 1 })}>−</button>
          <span className="val">{state.extras.logos}</span>
          <button onClick={() => dispatch({ type: 'SET_EXTRA', chave: 'logos', valor: state.extras.logos + 1 })}>+</button>
        </div>
      </Section>
    </div>
  )
}
