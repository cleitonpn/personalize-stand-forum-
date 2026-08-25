import { useMemo } from 'react'

const n2 = (v) => (isFinite(v) ? v.toFixed(2) : '—')
const GRAUS = (r) => Math.round(((r || 0) * 180) / Math.PI)
const PASSO = 0.25
const GIRO = Math.PI / 8   // 22,5° — volta ao lugar em 16 cliques

/** Objeto dentro da área do estande? Cópia espelhada não é do expositor. */
function noRecorte(o, recorte) {
  if (!recorte) return true
  const [cx, , cz] = o.centro || [0, 0, 0]
  return cx >= Math.min(recorte.x0, recorte.x1) && cx <= Math.max(recorte.x0, recorte.x1)
      && cz >= Math.min(recorte.z0, recorte.z1) && cz <= Math.max(recorte.z0, recorte.z1)
}

/**
 * Mover e girar, para o expositor.
 *
 * As permissões vêm uma a uma do admin: um objeto pode ser movido sem poder
 * girar, e o que ele não liberou nem aparece aqui. O balcão continua sendo um
 * objeto só — move inteiro, mesmo tendo a marcenaria e o adesivo como
 * acabamentos separados na lista de cima.
 *
 * A lista escolhe QUAL peça; o gesto acontece no 3D, em GizmoObjeto. Escolher
 * pela lista resolve o problema de acertar um objeto pequeno com o mouse dentro
 * da cena, e as setas daqui ficam como ajuste fino de quem já colocou a peça
 * quase no lugar e quer 25 cm exatos.
 */
export default function MobiliarioExpositor({
  objetos, setObjetos, objFoco, setObjFoco, recorte, aberto, setAberto, sel, setSel,
}) {

  const lista = useMemo(
    () => (objetos || []).filter((o) => (o.podeMover || o.podeGirar) && noRecorte(o, recorte)),
    [objetos, recorte],
  )
  if (!lista.length) return null

  const aplicar = (id, patch) => setObjetos((os) => os.map((o) => (o.id === id
    ? { ...o, transform: { dx: 0, dz: 0, rotY: 0, ...o.transform, ...patch(o.transform || {}) } }
    : o)))

  const mover = (id, dx, dz) => aplicar(id, (t) => ({ dx: (t.dx || 0) + dx, dz: (t.dz || 0) + dz }))
  const girar = (id, r) => aplicar(id, (t) => ({ rotY: (t.rotY || 0) + r }))
  const zerar = (id) => aplicar(id, () => ({ dx: 0, dz: 0, rotY: 0 }))

  const mexidos = lista.filter((o) => {
    const t = o.transform || {}
    return t.dx || t.dz || t.rotY
  }).length
  const open = aberto === '_moveis'

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button onClick={() => setAberto(open ? null : '_moveis')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 11,
          padding: '14px 15px', textAlign: 'left',
          background: open ? 'var(--surface-2)' : 'transparent',
          transition: 'background var(--t) var(--ease)',
        }}>
        <span style={{ fontSize: 17 }}>🪑</span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>Mover móveis</span>
          <span className="dim" style={{ fontSize: 11.5 }}>
            {lista.length} {lista.length === 1 ? 'item' : 'itens'}
            {mexidos ? ` · ${mexidos} movido${mexidos > 1 ? 's' : ''}` : ''}
          </span>
        </span>
        {mexidos > 0 && <span className="tag" style={{ color: 'var(--brand-green)', borderColor: 'currentColor' }}>
          <i className="tag-dot" />{mexidos}
        </span>}
        <span className="dim" style={{ fontSize: 17, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--t) var(--ease)' }}>›</span>
      </button>

      {open && (
        <div className="col" style={{ gap: 9, padding: '4px 15px 16px' }}>
          <p className="dim" style={{ margin: '0 0 2px', fontSize: 11.5, lineHeight: 1.6 }}>
            Escolha um item: a vista vai para cima e ele fica marcado no chão.
            <b> Arraste a marca verde</b> para levar a peça, e o <b>anel azul</b> para
            girar. As setas abaixo servem para o ajuste fino. Mudar de lugar não
            altera o valor — o mobiliário do projeto já está incluso.
          </p>

          {lista.map((o) => {
            const t = o.transform || {}
            const mexido = t.dx || t.dz || t.rotY
            const ativo = sel === o.id

            return (
              <div key={o.id}
                onMouseEnter={() => setObjFoco(o.id)}
                onMouseLeave={() => setObjFoco(ativo ? o.id : null)}
                style={{
                  padding: 12, borderRadius: 'var(--r)',
                  background: ativo ? 'var(--surface-3)' : 'var(--bg-deep)',
                  border: `1px solid ${ativo ? 'var(--brand-blue-lit)' : 'var(--line)'}`,
                  transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
                }}>
                <button onClick={() => { const n = ativo ? null : o.id; setSel(n); setObjFoco(n) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', padding: 0 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{o.nome}</span>
                    <span className="dim" style={{ fontSize: 11 }}>
                      {n2(o.largura)} × {n2(o.profundidade)} m
                      {mexido ? ' · movido' : ''}
                    </span>
                  </span>
                  <span className="dim" style={{ fontSize: 15, transform: ativo ? 'rotate(90deg)' : 'none', transition: 'transform var(--t) var(--ease)' }}>›</span>
                </button>

                {ativo && (
                  <div className="col" style={{ gap: 9, marginTop: 11 }}>
                    {o.podeMover && (
                      <div>
                        <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Ajuste fino</div>
                        <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
                          <button className="btn btn-sm" style={{ minWidth: 40 }}
                            onClick={() => mover(o.id, -PASSO, 0)} title="Para a esquerda">←</button>
                          <div className="col" style={{ gap: 5 }}>
                            <button className="btn btn-sm" style={{ minWidth: 40 }}
                              onClick={() => mover(o.id, 0, -PASSO)} title="Para o fundo">↑</button>
                            <button className="btn btn-sm" style={{ minWidth: 40 }}
                              onClick={() => mover(o.id, 0, PASSO)} title="Para a frente">↓</button>
                          </div>
                          <button className="btn btn-sm" style={{ minWidth: 40 }}
                            onClick={() => mover(o.id, PASSO, 0)} title="Para a direita">→</button>
                        </div>
                      </div>
                    )}

                    {o.podeGirar && (
                      <div>
                        <div className="label" style={{ fontSize: 10, marginBottom: 6 }}>Girar</div>
                        <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
                          <button className="btn btn-sm" onClick={() => girar(o.id, -GIRO)}>↺</button>
                          <button className="btn btn-sm" onClick={() => girar(o.id, GIRO)}>↻</button>
                          <button className="btn btn-sm" onClick={() => girar(o.id, Math.PI / 2)}>Um quarto de volta</button>
                        </div>
                      </div>
                    )}

                    {mexido ? (
                      <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                        <span className="dim mono" style={{ fontSize: 11 }}>
                          {n2(t.dx || 0)} / {n2(t.dz || 0)} m · {GRAUS(t.rotY)}°
                        </span>
                        <button className="btn btn-sm btn-ghost" onClick={() => zerar(o.id)}>
                          ↺ Voltar ao lugar
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
