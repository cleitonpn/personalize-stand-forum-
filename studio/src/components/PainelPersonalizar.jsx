import { useRef, useState } from 'react'
import { PAPEIS } from '../lib/glb/roles.js'
import { medir } from '../lib/glb/superficies.js'
import { calcularOrcamento, areaDaSuperficie, fmtBRL, fmtM2 } from '../lib/glb/precos.js'

// Paleta de teste. Vira o catálogo real de napas/carpetes quando a montadora
// mandar a tabela — a estrutura já é a mesma: id, nome e cor.
const CORES = [
  { id: 'preto', nome: 'Preto', hex: '#141414' },
  { id: 'branco', nome: 'Branco', hex: '#f2f2ee' },
  { id: 'cinza', nome: 'Cinza', hex: '#8b8f96' },
  { id: 'azul', nome: 'Azul', hex: '#1d4ed8' },
  { id: 'celeste', nome: 'Celeste', hex: '#38bdf8' },
  { id: 'verde', nome: 'Verde', hex: '#16a34a' },
  { id: 'limao', nome: 'Limão', hex: '#a3e635' },
  { id: 'amarelo', nome: 'Amarelo', hex: '#facc15' },
  { id: 'laranja', nome: 'Laranja', hex: '#f97316' },
  { id: 'vermelho', nome: 'Vermelho', hex: '#dc2626' },
  { id: 'vinho', nome: 'Vinho', hex: '#881337' },
  { id: 'roxo', nome: 'Roxo', hex: '#7c3aed' },
  { id: 'rosa', nome: 'Rosa', hex: '#ec4899' },
  { id: 'areia', nome: 'Areia', hex: '#e0d5bf' },
  { id: 'madeira', nome: 'Madeira', hex: '#b98a52' },
  { id: 'nogueira', nome: 'Nogueira', hex: '#6b4423' },
]

const n1 = (v) => (isFinite(v) ? v.toFixed(1) : '—')

/**
 * Prévia do que o expositor vê: escolher acabamento sobre a estrutura já
 * definida no mapeamento. Nada aqui altera quais peças formam uma superfície —
 * isso é decisão do admin, na aba Superfícies.
 */
export default function PainelPersonalizar({
  analise, superficies, acabamentos, setAcabamentos, supFoco, setSupFoco, objetos,
  precos, precosObjeto, recorte, removidos, setRemovidos,
}) {
  const fileRef = useRef(null)
  const [alvoArte, setAlvoArte] = useState(null)

  const aplicar = (id, patch) => setAcabamentos((a) => ({ ...a, [id]: { ...a[id], ...patch } }))

  const enviarArte = (e) => {
    const f = e.target.files?.[0]
    if (!f || !alvoArte) return
    const r = new FileReader()
    r.onload = () => aplicar(alvoArte, { arte: r.result, nomeArte: f.name })
    r.readAsDataURL(f)
    e.target.value = ''
  }

  // O que aparece para o expositor é o que o ADMIN liberou, não o que a
  // heurística achou que era personalizável.
  const visiveis = superficies.filter((s) => s.podeCor || s.podeArte)
  const nEscolhas = Object.keys(acabamentos).length
  const orcamento = calcularOrcamento({
    analise, superficies, objetos, acabamentos, precos, precosObjeto, removidos, recorte,
  })

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
        <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, flex: 1 }}>
          Prévia da tela do expositor: {visiveis.length} {visiveis.length === 1 ? 'superfície liberada' : 'superfícies liberadas'}
          {objetos ? ` e ${objetos.filter((o) => o.podeMover || o.podeGirar).length} objetos móveis` : ''}.
          Para liberar ou bloquear, use as abas <b>Superfícies</b> e <b>Objetos</b>.
        </p>
        {nEscolhas > 0 && (
          <button className="btn btn-sm btn-ghost" style={{ flex: 'none' }}
            onClick={() => setAcabamentos({})}>Limpar tudo</button>
        )}
      </div>

      {/* orçamento ao vivo — o expositor vê o valor a cada escolha */}
      {orcamento.itens.length > 0 && (
        <div style={{
          padding: '13px 14px', borderRadius: 'var(--r)',
          background: 'var(--brand-grad-soft)', border: '1px solid var(--brand-green)',
        }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="label" style={{ fontSize: 10.5 }}>Total das personalizações</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--brand-green)' }}>
              {fmtBRL(orcamento.total)}
            </span>
          </div>
          <div className="col" style={{ gap: 4 }}>
            {orcamento.itens.map((i) => (
              <div key={i.id} className="row" style={{ justifyContent: 'space-between', gap: 10, fontSize: 11.5 }}>
                <span className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i.nome}
                  <span className="dim">
                    {' · '}{i.unidade === 'm2' ? `${fmtM2(i.quantidade)} × ${fmtBRL(i.valorUnitario)}` : `1 × ${fmtBRL(i.valorUnitario)}`}
                  </span>
                </span>
                <span className="mono" style={{ flex: 'none' }}>{fmtBRL(i.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {visiveis.length === 0 && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: .5 }}>🎨</div>
          <h3 style={{ fontSize: 14.5, marginBottom: 5 }}>Nada personalizável ainda</h3>
          <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
            Libere "trocar a cor" ou "subir arte" em alguma superfície, na aba Superfícies.
          </p>
        </div>
      )}

      {visiveis.map((s) => {
        const m = medir(s, analise)
        const def = PAPEIS[s.papel]
        const acab = acabamentos[s.id] || {}
        const ativo = supFoco === s.id

        return (
          <div key={s.id}
            onMouseEnter={() => setSupFoco(s.id)}
            onMouseLeave={() => setSupFoco(null)}
            style={{
              padding: '12px 13px', borderRadius: 'var(--r)',
              background: ativo ? 'var(--surface-3)' : 'var(--surface-2)',
              border: `1px solid ${ativo ? 'var(--brand-blue-lit)' : 'var(--line)'}`,
              transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
            }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 9, marginBottom: 9 }}>
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
                {m && <span className="dim" style={{ fontSize: 11 }}>
                  {n1(m.largura)}×{n1(m.altura)}×{n1(m.profundidade)} m · {fmtM2(areaDaSuperficie(s, analise, recorte))}
                </span>}
              </div>
              <span className="tag" style={{ flex: 'none', color: def.cor, borderColor: 'currentColor' }}>
                <i className="tag-dot" />{def.rotulo}
              </span>
            </div>

            {s.podeCor && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: 9 }}>
              {CORES.map((c) => (
                <button key={c.id} title={c.nome}
                  onClick={() => aplicar(s.id, { cor: c.hex, corId: c.id })}
                  style={{
                    aspectRatio: '1', borderRadius: 6, background: c.hex,
                    border: acab.corId === c.id ? '2px solid var(--brand-green)' : '1px solid var(--line-lit)',
                  }} />
              ))}
            </div>}

            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {s.podeArte && (
                <button className="btn btn-sm btn-ghost"
                  onClick={() => { setAlvoArte(s.id); fileRef.current?.click() }}>
                  {acab.arte ? `✓ ${(acab.nomeArte || 'arte').slice(0, 14)}` : '🖼 Aplicar arte'}
                </button>
              )}
              {(acab.cor || acab.arte) && (
                <button className="btn btn-sm btn-ghost" onClick={() =>
                  setAcabamentos((a) => { const n = { ...a }; delete n[s.id]; return n })}>
                  Limpar
                </button>
              )}
              {(() => {
                const item = orcamento.itens.find((i) => i.id === s.id)
                return item ? (
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brand-green)' }}>
                    {fmtBRL(item.total)}
                  </span>
                ) : null
              })()}
            </div>
          </div>
        )
      })}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={enviarArte} />
    </div>
  )
}
