import { useState } from 'react'
import { Interruptor } from './Interruptor.jsx'

const n1 = (v) => (isFinite(v) ? v.toFixed(1) : '—')
const n2 = (v) => (isFinite(v) ? v.toFixed(2) : '—')
const GRAUS = (r) => Math.round((r * 180) / Math.PI)

/**
 * Objetos = o que se move junto. Diferente de superfície, que é o que recebe
 * uma cor. O balcão é um objeto e duas superfícies; as cadeiras compartilham
 * superfície mas são objetos distintos.
 *
 * Quem decide o que o expositor pode fazer é o admin, aqui — a detecção só
 * propõe um ponto de partida.
 */
export default function PainelObjetos({ objetos, setObjetos, objFoco, setObjFoco }) {
  const [soMoveis, setSoMoveis] = useState(false)
  const [renomeando, setRenomeando] = useState(null)
  const [rascunho, setRascunho] = useState('')

  const mexer = (id, patch) =>
    setObjetos((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)))

  const mover = (id, dx, dz) =>
    setObjetos((os) => os.map((o) => (o.id === id
      ? { ...o, transform: { ...o.transform, dx: (o.transform.dx || 0) + dx, dz: (o.transform.dz || 0) + dz } }
      : o)))

  const girar = (id, passo) =>
    setObjetos((os) => os.map((o) => (o.id === id
      ? { ...o, transform: { ...o.transform, rotY: (o.transform.rotY || 0) + passo } }
      : o)))

  const zerar = (id) =>
    setObjetos((os) => os.map((o) => (o.id === id ? { ...o, transform: { dx: 0, dz: 0, rotY: 0 } } : o)))

  const lista = soMoveis ? objetos.filter((o) => o.podeMover) : objetos
  const nMoveis = objetos.filter((o) => o.podeMover).length

  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
        Objeto é o que <b>se move junto</b> — detectado por contato entre peças.
        O balcão é um objeto com duas superfícies (marcenaria e adesivo): move
        inteiro, mas cada parte recebe seu acabamento.
      </p>

      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <span className="dim" style={{ fontSize: 12 }}>
          {objetos.length} objetos · {nMoveis} liberados para mover
        </span>
        <button className={`chip ${soMoveis ? 'sel' : ''}`} onClick={() => setSoMoveis((v) => !v)}
          style={{ fontSize: 11.5, padding: '4px 10px' }}>
          Só os móveis
        </button>
      </div>

      {lista.map((o) => {
        const ativo = objFoco === o.id
        const t = o.transform || { dx: 0, dz: 0, rotY: 0 }
        const mexido = t.dx || t.dz || t.rotY

        return (
          <div key={o.id}
            onMouseEnter={() => setObjFoco(o.id)}
            onMouseLeave={() => setObjFoco(null)}
            style={{
              padding: '12px 13px', borderRadius: 'var(--r)',
              background: ativo ? 'var(--surface-3)' : 'var(--surface-2)',
              border: `1px solid ${ativo ? 'var(--warn)' : 'var(--line)'}`,
              transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
            }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 9, marginBottom: 9 }}>
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                {renomeando === o.id ? (
                  <input className="input" autoFocus value={rascunho}
                    style={{ padding: '5px 9px', fontSize: 12.5 }}
                    onChange={(e) => setRascunho(e.target.value)}
                    onBlur={() => { mexer(o.id, { nome: rascunho.trim() || o.nome }); setRenomeando(null) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { mexer(o.id, { nome: rascunho.trim() || o.nome }); setRenomeando(null) }
                      if (e.key === 'Escape') setRenomeando(null)
                    }} />
                ) : (
                  <button onClick={() => { setRenomeando(o.id); setRascunho(o.nome) }} title="Renomear"
                    style={{ textAlign: 'left', fontSize: 13, fontWeight: 600, padding: 0 }}>
                    {o.nome} <span className="dim" style={{ fontWeight: 400 }}>✎</span>
                  </button>
                )}
                <span className="dim" style={{ fontSize: 11 }}>
                  {n2(o.largura)}×{n2(o.altura)}×{n2(o.profundidade)} m
                  {o.materiais.length > 1 && ` · ${o.materiais.length} superfícies`}
                </span>
              </div>
              {mexido ? (
                <button className="btn btn-sm btn-ghost" style={{ flex: 'none' }} onClick={() => zerar(o.id)}>
                  ↺ Voltar
                </button>
              ) : null}
            </div>

            {/* permissões — decisão do admin, não da heurística */}
            <div className="row" style={{ gap: 14, marginBottom: o.podeMover ? 10 : 0, flexWrap: 'wrap' }}>
              <Interruptor ligado={!!o.podeMover} rotulo="Cliente move"
                aoMudar={() => mexer(o.id, { podeMover: !o.podeMover })} />
              <Interruptor ligado={!!o.podeGirar} rotulo="Cliente gira"
                aoMudar={() => mexer(o.id, { podeGirar: !o.podeGirar })} />
            </div>

            {(o.podeMover || o.podeGirar) && (
              <div style={{ padding: '9px 10px', borderRadius: 'var(--r-sm)', background: 'var(--bg-deep)', border: '1px solid var(--line)' }}>
                {o.podeMover && (
                  <div className="row" style={{ gap: 5, justifyContent: 'center', marginBottom: o.podeGirar ? 8 : 0 }}>
                    <button className="btn btn-sm" onClick={() => mover(o.id, -0.25, 0)} title="Esquerda">←</button>
                    <div className="col" style={{ gap: 4 }}>
                      <button className="btn btn-sm" onClick={() => mover(o.id, 0, -0.25)} title="Para trás">↑</button>
                      <button className="btn btn-sm" onClick={() => mover(o.id, 0, 0.25)} title="Para frente">↓</button>
                    </div>
                    <button className="btn btn-sm" onClick={() => mover(o.id, 0.25, 0)} title="Direita">→</button>
                    <span className="mono dim" style={{ fontSize: 11, marginLeft: 6 }}>
                      {n2(t.dx)} / {n2(t.dz)} m
                    </span>
                  </div>
                )}
                {o.podeGirar && (
                  <div className="row" style={{ gap: 5, justifyContent: 'center' }}>
                    <button className="btn btn-sm" onClick={() => girar(o.id, -Math.PI / 12)}>↺ 15°</button>
                    <button className="btn btn-sm" onClick={() => girar(o.id, Math.PI / 12)}>15° ↻</button>
                    <button className="btn btn-sm" onClick={() => girar(o.id, Math.PI / 2)}>90°</button>
                    <span className="mono dim" style={{ fontSize: 11, marginLeft: 6 }}>{GRAUS(t.rotY)}°</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
