// Interruptor de permissão. Usado no mapeamento para o admin dizer o que o
// expositor pode fazer com cada superfície e cada objeto.
export function Interruptor({ ligado, aoMudar, rotulo }) {
  return (
    <label className="row" style={{ gap: 7, cursor: 'pointer', fontSize: 12 }}>
      <span className="switch" style={{ position: 'relative', display: 'inline-block', width: 32, height: 18, flex: 'none' }}>
        <input type="checkbox" checked={ligado} onChange={aoMudar}
          style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 99, cursor: 'pointer',
          background: ligado ? 'var(--brand-green)' : 'var(--surface-3)',
          border: `1px solid ${ligado ? 'var(--brand-green)' : 'var(--line-lit)'}`,
          transition: 'background var(--t) var(--ease)',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: ligado ? 16 : 2, width: 12, height: 12,
            borderRadius: 99, background: ligado ? '#04060d' : 'var(--text-dim)',
            transition: 'left var(--t) var(--ease)',
          }} />
        </span>
      </span>
      <span className={ligado ? '' : 'dim'}>{rotulo}</span>
    </label>
  )
}
