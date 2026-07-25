import { useRef } from 'react'
import { useStand } from '../store/StandStore.jsx'
import { NAPA_LISAS } from '../data/catalogo.js'

// cores rápidas para o corpo do balcão (subset da paleta de napas lisas)
const CORES = ['nl-156', 'nl-204', 'nl-198', 'nl-333', 'nl-277', 'nl-245', 'nl-205', 'nl-253', 'nl-338', 'nl-351', 'nl-503', 'nl-461']

export default function BalcaoEditor() {
  const { state, dispatch } = useStand()
  const fileRef = useRef(null)
  const cfg = state.balcaoCfg

  const enviarLogo = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => dispatch({ type: 'SET_BALCAO', cfg: { logoUrl: reader.result } })
    reader.readAsDataURL(f)
  }

  return (
    <div className="wall-block">
      <div className="wall-block-title">Balcão — cor e logo</div>
      <div className="swatches" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
        {CORES.map((id) => {
          const c = NAPA_LISAS.find((x) => x.id === id)
          return <div key={id} className={`swatch ${cfg.corId === id ? 'sel' : ''}`} style={{ background: c?.hex }}
            title={c?.nome} onClick={() => dispatch({ type: 'SET_BALCAO', cfg: { corId: id } })} />
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="lona-opt upload" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
          {cfg.logoUrl ? '✓ Logo enviado' : '⬆ Enviar logo da sua marca'}
        </button>
        {cfg.logoUrl && <button className="btn btn-ghost" onClick={() => dispatch({ type: 'SET_BALCAO', cfg: { logoUrl: null } })}>×</button>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={enviarLogo} />
      </div>
    </div>
  )
}
