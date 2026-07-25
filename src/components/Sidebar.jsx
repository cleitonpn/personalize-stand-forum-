import { useState } from 'react'
import {
  useStand, PISOS, MOBILIARIO, PAISAGISMO, ELETRICA, REGRAS,
} from '../store/StandStore.jsx'
import Swatches from './Swatches.jsx'
import ParedeEditor from './ParedeEditor.jsx'
import LedOptions from './LedOptions.jsx'

function Section({ id, ico, titulo, tag, aberto, setAberto, children }) {
  const open = aberto === id
  return (
    <div className="cfg-section">
      <button className={`cfg-head ${open ? 'open' : ''}`} onClick={() => setAberto(open ? null : id)}>
        <span className="ico">{ico}</span><span>{titulo}</span>
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
  const pisoGrupo = state.piso.grupo
  const primeiraCor = (grupos, k) => grupos[k].itens[0].id
  const extraMob = state.mobiliario.filter((m) => !m.base).length

  return (
    <div>
      <Section id="piso" ico="▦" titulo="Piso" aberto={aberto} setAberto={setAberto}
        tag={state.piso.grupo === 'vinilico' ? 'vinílico' : null}>
        <p className="hint">Troque a cor do carpete ou substitua por piso vinílico.</p>
        <Swatches grupos={PISOS} grupoAtivo={pisoGrupo} corId={state.piso.corId}
          onGrupo={(k) => dispatch({ type: 'SET_PISO', grupo: k, corId: primeiraCor(PISOS, k) })}
          onCor={(id) => dispatch({ type: 'SET_PISO', grupo: pisoGrupo, corId: id })} />
      </Section>

      <Section id="parede" ico="▚" titulo="Paredes · napa e lonas" aberto={aberto} setAberto={setAberto}>
        <ParedeEditor />
      </Section>

      <Section id="led" ico="▮" titulo="Painel de LED" aberto={aberto} setAberto={setAberto}
        tag={state.led !== 'nenhum' ? 'incluso' : null}>
        <p className="hint">Escolha onde aplicar o painel de LED.</p>
        <LedOptions />
      </Section>

      <Section id="deposito" ico="▢" titulo="Depósito" aberto={aberto} setAberto={setAberto}>
        <p className="hint">Arraste o depósito na planta baixa. Ajuste o formato — a área mínima ({REGRAS.deposito.areaMin} m²) é sempre respeitada.</p>
        <div className="range-row"><span>Largura</span>
          <input type="range" min={REGRAS.deposito.wMin} max={REGRAS.deposito.wMax} step="0.1" value={state.deposito.w}
            onChange={(e) => dispatch({ type: 'REDIM_DEPOSITO', w: +e.target.value })} /><span className="rv">{state.deposito.w.toFixed(1)}m</span></div>
        <div className="range-row"><span>Profund.</span>
          <input type="range" min={REGRAS.deposito.dMin} max={REGRAS.deposito.dMax} step="0.1" value={state.deposito.d}
            onChange={(e) => dispatch({ type: 'REDIM_DEPOSITO', d: +e.target.value })} /><span className="rv">{state.deposito.d.toFixed(1)}m</span></div>
        <div className="sel-label">Área: <b>{(state.deposito.w * state.deposito.d).toFixed(2)} m²</b></div>
      </Section>

      <Section id="sala" ico="◫" titulo="Sala de reunião de vidro" aberto={aberto} setAberto={setAberto}
        tag={state.salaReuniao ? 'incluso' : null}>
        <p className="hint">Sala em vidro com porta, sem teto, até {REGRAS.salaReuniao.wMax} × {REGRAS.salaReuniao.dMax} m. Arraste na planta para posicionar.</p>
        <div className="toggle-row">
          <label className="switch"><input type="checkbox" checked={!!state.salaReuniao} onChange={() => dispatch({ type: 'TOGGLE_SALA' })} /><span className="slider" /></label>
          <span>{state.salaReuniao ? 'Sala incluída' : 'Sem sala de reunião'}</span>
        </div>
        {state.salaReuniao && (
          <>
            <div className="range-row"><span>Largura</span>
              <input type="range" min={REGRAS.salaReuniao.wMin} max={REGRAS.salaReuniao.wMax} step="0.1" value={state.salaReuniao.w}
                onChange={(e) => dispatch({ type: 'REDIM_SALA', w: +e.target.value })} /><span className="rv">{state.salaReuniao.w.toFixed(1)}m</span></div>
            <div className="range-row"><span>Profund.</span>
              <input type="range" min={REGRAS.salaReuniao.dMin} max={REGRAS.salaReuniao.dMax} step="0.1" value={state.salaReuniao.d}
                onChange={(e) => dispatch({ type: 'REDIM_SALA', d: +e.target.value })} /><span className="rv">{state.salaReuniao.d.toFixed(1)}m</span></div>
          </>
        )}
      </Section>

      <Section id="mob" ico="🪑" titulo="Mobiliário" aberto={aberto} setAberto={setAberto}
        tag={extraMob ? `+${extraMob}` : null}>
        <p className="hint">Adicione itens, arraste na planta e use ⟳ para girar.</p>
        <div className="chip-grid">
          {MOBILIARIO.filter((m) => !m.base).map((m) => (
            <button key={m.id} className="chip" onClick={() => dispatch({ type: 'ADD_MOBILIARIO', tipo: m.id })}>
              {m.nome}<small>{m.preco ? `+ R$ ${m.preco}` : 'incluso'}</small>
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
                <button className="ic" title="Girar" onClick={() => dispatch({ type: 'GIRAR_MOBILIARIO', uid: m.uid })}>⟳</button>
                <button className="x" title="Remover" onClick={() => dispatch({ type: 'REMOVER_MOBILIARIO', uid: m.uid })}>×</button>
              </div>
            )
          })}
        </div>
      </Section>

      <Section id="pais" ico="🌿" titulo="Paisagismo" aberto={aberto} setAberto={setAberto}
        tag={state.paisagismo.length ? `${state.paisagismo.length}` : null}>
        <p className="hint">Plantas e jardins. Arraste na planta para posicionar.</p>
        <div className="chip-grid">
          {PAISAGISMO.map((p) => (
            <button key={p.id} className="chip" onClick={() => dispatch({ type: 'ADD_PAISAGISMO', tipo: p.id })}>{p.nome}<small>+ R$ {p.preco}</small></button>
          ))}
        </div>
        <div className="mini-list">
          {state.paisagismo.map((p) => {
            const meta = PAISAGISMO.find((x) => x.id === p.tipo)
            return (
              <div key={p.uid} className="mini-item">{meta?.nome || p.tipo}
                <button className="x" onClick={() => dispatch({ type: 'REMOVER_PAISAGISMO', uid: p.uid })}>×</button></div>
            )
          })}
        </div>
      </Section>

      <Section id="elet" ico="⚡" titulo="Pontos de elétrica extras" aberto={aberto} setAberto={setAberto}
        tag={state.eletrica.length ? `${state.eletrica.length}` : null}>
        <p className="hint">Selecione o tipo e <b>clique na planta baixa</b> onde deseja o ponto.</p>
        <div className="chip-grid">
          {ELETRICA.map((e) => (
            <button key={e.id} className="chip" onClick={() => window.dispatchEvent(new CustomEvent('psf-eletrica-sel', { detail: e.id }))}>
              <span style={{ color: e.cor }}>{e.simbolo}</span> {e.nome}<small>+ R$ {e.preco} / un.</small>
            </button>
          ))}
        </div>
        <p className="hint" style={{ marginTop: 10 }}>{state.eletrica.length} ponto(s). Clique num ponto na planta para remover.</p>
      </Section>

      <Section id="graf" ico="🖼️" titulo="Logos adicionais" aberto={aberto} setAberto={setAberto}>
        <p className="hint">Logos extras além dos inclusos. (Lonas agora são por parede, na seção Paredes.)</p>
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
