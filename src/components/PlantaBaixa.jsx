import { useRef, useState, useEffect } from 'react'
import { useStand, MOBILIARIO, PAISAGISMO, ELETRICA, REGRAS } from '../store/StandStore.jsx'
import { corPorId } from '../data/catalogo.js'

const W = REGRAS.stand.largura
const D = REGRAS.stand.profundidade
const PAD = 0.6

export default function PlantaBaixa() {
  const { state, dispatch } = useStand()
  const svgRef = useRef(null)
  const drag = useRef(null)
  const [eletricaSel, setEletricaSel] = useState('tomada-piso')
  const [modoElet, setModoElet] = useState(false)

  useEffect(() => {
    const h = (e) => { setEletricaSel(e.detail); setModoElet(true) }
    window.addEventListener('psf-eletrica-sel', h)
    return () => window.removeEventListener('psf-eletrica-sel', h)
  }, [])

  const toMeters = (evt) => {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = evt.clientX; pt.y = evt.clientY
    const m = pt.matrixTransform(svg.getScreenCTM().inverse())
    return { x: m.x, z: m.y }
  }
  const clampX = (v) => Math.max(0.2, Math.min(W - 0.2, v))
  const clampZ = (v) => Math.max(0.2, Math.min(D - 0.2, v))

  const startDrag = (kind, uid, cx, cz) => (evt) => {
    evt.stopPropagation()
    evt.currentTarget.setPointerCapture?.(evt.pointerId)
    const { x, z } = toMeters(evt)
    drag.current = { kind, uid, offx: x - cx, offz: z - cz, moved: false }
  }
  const onMove = (evt) => {
    if (!drag.current) return
    const { x, z } = toMeters(evt)
    const nx = x - drag.current.offx, nz = z - drag.current.offz
    drag.current.moved = true
    const { kind, uid } = drag.current
    if (kind === 'deposito') dispatch({ type: 'MOVER_DEPOSITO', x: nx, z: nz })
    else if (kind === 'sala') dispatch({ type: 'MOVER_SALA', x: nx, z: nz })
    else if (kind === 'mob') dispatch({ type: 'MOVER_MOBILIARIO', uid, x: clampX(nx), z: clampZ(nz) })
    else if (kind === 'pais') dispatch({ type: 'MOVER_PAISAGISMO', uid, x: clampX(nx), z: clampZ(nz) })
  }
  const endDrag = () => { drag.current = null }

  const onFloorClick = (evt) => {
    if (!modoElet) return
    const { x, z } = toMeters(evt)
    if (x < 0 || x > W || z < 0 || z > D) return
    dispatch({ type: 'ADD_ELETRICA', tipo: eletricaSel, x: clampX(x), z: clampZ(z) })
  }

  const dep = state.deposito
  const sala = state.salaReuniao
  const selWall = state.paredeSel
  const hex = (id) => corPorId(id)?.hex || '#888'

  return (
    <>
      <div className="plan-mode">
        <button className={`tab ${modoElet ? 'active' : ''}`} onClick={() => setModoElet((v) => !v)}>
          ⚡ {modoElet ? `Add: ${ELETRICA.find(e => e.id === eletricaSel)?.nome}` : 'Modo elétrica'}
        </button>
      </div>
      <div className="plan-hint">Arraste itens · 2× clique no móvel para girar · clique nas paredes (amarelo/marrom) para editar</div>
      <svg ref={svgRef} className="plan-svg" viewBox={`${-PAD} ${-PAD} ${W + PAD * 2} ${D + PAD * 2}`}
        preserveAspectRatio="xMidYMid meet" onPointerMove={onMove} onPointerUp={endDrag} onPointerLeave={endDrag}>

        <rect x="0" y="0" width={W} height={D} rx="0.05" fill="#151821" stroke="#3a4152" strokeWidth="0.03"
          style={{ cursor: modoElet ? 'crosshair' : 'default' }} onClick={onFloorClick} />
        {Array.from({ length: W - 1 }, (_, i) => <line key={'v' + i} x1={i + 1} y1="0" x2={i + 1} y2={D} stroke="#242938" strokeWidth="0.01" />)}
        {Array.from({ length: D - 1 }, (_, i) => <line key={'h' + i} x1="0" y1={i + 1} x2={W} y2={i + 1} stroke="#242938" strokeWidth="0.01" />)}

        {/* PAREDE DO FUNDO — napa (esquerda) + madeira (direita) */}
        <line x1="0" y1="0" x2="6.6" y2="0" stroke={hex(state.paredes['fundo-esq'].corId)} strokeWidth={selWall === 'fundo-esq' ? 0.2 : 0.12}
          strokeLinecap="round" style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SELECT_PAREDE', parede: 'fundo-esq' })} />
        {selWall === 'fundo-esq' && <line x1="0" y1="-0.13" x2="6.6" y2="-0.13" stroke="#f4c20d" strokeWidth="0.05" strokeDasharray="0.2 0.15" />}
        <line x1="6.6" y1="0" x2={W} y2="0" stroke={hex(state.paredes['fundo-dir'].corId)} strokeWidth={selWall === 'fundo-dir' ? 0.2 : 0.12}
          strokeLinecap="round" style={{ cursor: 'pointer' }} onClick={() => dispatch({ type: 'SELECT_PAREDE', parede: 'fundo-dir' })} />
        {selWall === 'fundo-dir' && <line x1="6.6" y1="-0.13" x2={W} y2="-0.13" stroke="#f4c20d" strokeWidth="0.05" strokeDasharray="0.2 0.15" />}
        {state.paredes['fundo-esq'].lona && <text x="3.3" y={0.35} fontSize="0.2" fill="#f4c20d" textAnchor="middle" pointerEvents="none">▣</text>}
        {state.paredes['fundo-dir'].lona && <text x="8.3" y={0.35} fontSize="0.2" fill="#f4c20d" textAnchor="middle" pointerEvents="none">▣</text>}

        {/* frente (testeira) — indicativo */}
        <line x1="0" y1={D} x2={W} y2={D} stroke="#f4c20d" strokeWidth="0.05" strokeDasharray="0.05 0.12" opacity="0.7" />
        <text x={W / 2} y={D - 0.18} fontSize="0.2" fill="#f4c20d" textAnchor="middle" opacity="0.8" pointerEvents="none">▸ testeira / frente ◂</text>

        <text x={W / 2} y={-0.22} fontSize="0.3" fill="#9aa0ad" textAnchor="middle">10,00 m</text>
        <text x={-0.28} y={D / 2} fontSize="0.3" fill="#9aa0ad" textAnchor="middle" transform={`rotate(-90 ${-0.28} ${D / 2})`}>4,00 m</text>

        {/* elétrica */}
        {state.eletrica.map((e) => {
          const meta = ELETRICA.find((x) => x.id === e.tipo)
          return (
            <g key={e.uid} style={{ cursor: 'pointer' }} onClick={(ev) => { ev.stopPropagation(); dispatch({ type: 'REMOVER_ELETRICA', uid: e.uid }) }}>
              <circle cx={e.x} cy={e.z} r="0.17" fill={meta?.cor || '#f4c20d'} opacity="0.9" />
              <circle cx={e.x} cy={e.z} r="0.17" fill="none" stroke="#000" strokeWidth="0.02" />
            </g>
          )
        })}

        {/* paisagismo */}
        {state.paisagismo.map((p) => (
          <g key={p.uid} style={{ cursor: 'grab' }} onPointerDown={startDrag('pais', p.uid, p.x, p.z)}>
            <circle cx={p.x} cy={p.z} r={0.32} fill="#2f7d43" stroke="#194d29" strokeWidth="0.03" />
          </g>
        ))}

        {/* mobiliário (arrastar + 2× clique gira) */}
        {state.mobiliario.map((m) => {
          const meta = MOBILIARIO.find((x) => x.id === m.tipo) || { w: 0.6, d: 0.6, nome: m.tipo }
          const isBistro = m.tipo === 'mesa-bistro'
          const w = meta.w, d = meta.d
          return (
            <g key={m.uid} style={{ cursor: 'grab' }}
              onPointerDown={startDrag('mob', m.uid, m.x, m.z)}
              onDoubleClick={(ev) => { ev.stopPropagation(); dispatch({ type: 'GIRAR_MOBILIARIO', uid: m.uid }) }}>
              {isBistro
                ? <circle cx={m.x} cy={m.z} r={0.45} fill="#2a2f3a" stroke="#4a5162" strokeWidth="0.03" />
                : <rect x={m.x - w / 2} y={m.z - d / 2} width={w} height={d} rx="0.05" fill="#2a2f3a" stroke="#4a5162" strokeWidth="0.03"
                    transform={`rotate(${(m.rot * 180) / Math.PI} ${m.x} ${m.z})`} />}
              <text x={m.x} y={m.z + 0.06} fontSize="0.18" fill="#c9cede" textAnchor="middle" pointerEvents="none">{shortName(meta.nome)}</text>
            </g>
          )
        })}

        {/* depósito — preenchimento arrastável + 4 arestas clicáveis (paredes) */}
        {(() => {
          const L = dep.x - dep.w / 2, R = dep.x + dep.w / 2, T = dep.z - dep.d / 2, B = dep.z + dep.d / 2
          const edge = (id, x1, y1, x2, y2, ox, oy) => (
            <g key={id} style={{ cursor: 'pointer' }} onClick={(ev) => { ev.stopPropagation(); dispatch({ type: 'SELECT_PAREDE', parede: id }) }}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={hex(state.paredes[id].corId)} strokeWidth={selWall === id ? 0.16 : 0.1} strokeLinecap="round" />
              {selWall === id && <line x1={x1 + ox} y1={y1 + oy} x2={x2 + ox} y2={y2 + oy} stroke="#f4c20d" strokeWidth="0.045" strokeDasharray="0.16 0.12" />}
              {state.paredes[id].lona && <circle cx={(x1 + x2) / 2 + ox * 1.5} cy={(y1 + y2) / 2 + oy * 1.5} r="0.08" fill="#f4c20d" />}
            </g>
          )
          return (
            <g>
              <rect x={L} y={T} width={dep.w} height={dep.d} rx="0.03" fill="#26221c" style={{ cursor: 'grab' }}
                onPointerDown={startDrag('deposito', 'dep', dep.x, dep.z)} />
              <text x={dep.x} y={dep.z + 0.06} fontSize="0.22" fill="#e9d9c5" textAnchor="middle" pointerEvents="none">DEPÓSITO</text>
              {edge('dep-fundo', L, T, R, T, 0, -0.12)}
              {edge('dep-frente', L, B, R, B, 0, 0.12)}
              {edge('dep-esq', L, T, L, B, -0.12, 0)}
              {edge('dep-dir', R, T, R, B, 0.12, 0)}
            </g>
          )
        })()}

        {/* sala de reunião */}
        {sala && (
          <g style={{ cursor: 'grab' }} onPointerDown={startDrag('sala', 'sala', sala.x, sala.z)}>
            <rect x={sala.x - sala.w / 2} y={sala.z - sala.d / 2} width={sala.w} height={sala.d} rx="0.03"
              fill="rgba(140,190,230,0.12)" stroke="#8fb3cc" strokeWidth="0.05" strokeDasharray="0.15 0.1" />
            <line x1={sala.x + sala.w / 2 - 0.9} y1={sala.z + sala.d / 2} x2={sala.x + sala.w / 2 - 0.05} y2={sala.z + sala.d / 2} stroke="#cfe4f5" strokeWidth="0.08" />
            <text x={sala.x} y={sala.z + 0.06} fontSize="0.22" fill="#cfe4f5" textAnchor="middle" pointerEvents="none">SALA REUNIÃO</text>
          </g>
        )}
      </svg>
    </>
  )
}

function shortName(n = '') {
  const map = {
    'Mesa bistrô + 3 banquetas': 'bistrô', 'Balcão c/ logo': 'balcão', 'Aparador 1,10 × 0,40': 'aparador',
    'Sofá 2 lugares': 'sofá', 'Mesa de centro': 'mesa', 'Expositor / vitrine': 'vitrine',
  }
  return map[n] || n.split(' ')[0].toLowerCase()
}
