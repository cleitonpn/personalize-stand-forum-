import { useRef, useState } from 'react'
import { PAPEIS } from '../lib/glb/roles.js'
import { dividirPorPeca, dividirPorProximidade, unir, medir } from '../lib/glb/superficies.js'

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

export default function PainelPersonalizar({
  analise, superficies, setSuperficies, acabamentos, setAcabamentos, supFoco, setSupFoco,
}) {
  const [sel, setSel] = useState([])           // seleção múltipla para unir
  const fileRef = useRef(null)
  const [alvoArte, setAlvoArte] = useState(null)

  const alternarSel = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])

  const substituir = (id, novas) =>
    setSuperficies((ss) => ss.flatMap((s) => (s.id === id ? novas : [s])))

  const aplicar = (id, patch) =>
    setAcabamentos((a) => ({ ...a, [id]: { ...a[id], ...patch } }))

  const enviarArte = (e) => {
    const f = e.target.files?.[0]
    if (!f || !alvoArte) return
    const r = new FileReader()
    r.onload = () => aplicar(alvoArte, { arte: r.result, nomeArte: f.name })
    r.readAsDataURL(f)
    e.target.value = ''
  }

  const unirSelecionadas = () => {
    const alvo = superficies.filter((s) => sel.includes(s.id))
    if (alvo.length < 2) return
    const nova = unir(alvo)
    setSuperficies((ss) => [nova, ...ss.filter((s) => !sel.includes(s.id))])
    setSel([]); setSupFoco(nova.id)
  }

  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
        Cada superfície é um controle independente para o expositor.
        <b> Dividir</b> separa peças que hoje mudam juntas (os logos, por exemplo);
        <b> unir</b> junta peças que são um objeto só (assento e pés da banqueta).
      </p>

      {sel.length >= 2 && (
        <button className="btn btn-primary btn-sm" onClick={unirSelecionadas}>
          ⛓ Unir {sel.length} superfícies numa só
        </button>
      )}

      {superficies.map((s) => {
        const m = medir(s, analise)
        const def = PAPEIS[s.papel]
        const acab = acabamentos[s.id] || {}
        const ativo = supFoco === s.id
        const marcada = sel.includes(s.id)

        return (
          <div key={s.id}
            onMouseEnter={() => setSupFoco(s.id)}
            onMouseLeave={() => setSupFoco(null)}
            style={{
              padding: '12px 13px', borderRadius: 'var(--r)',
              background: ativo ? 'var(--surface-3)' : 'var(--surface-2)',
              border: `1px solid ${marcada ? 'var(--brand-green)' : ativo ? 'var(--brand-blue-lit)' : 'var(--line)'}`,
              transition: 'all var(--t) var(--ease)',
            }}>
            <div className="row" style={{ justifyContent: 'space-between', gap: 9, marginBottom: 9 }}>
              <label className="row" style={{ gap: 8, minWidth: 0, cursor: 'pointer' }}>
                <input type="checkbox" checked={marcada} onChange={() => alternarSel(s.id)} />
                <span className="col" style={{ gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
                  {m && <span className="dim" style={{ fontSize: 11 }}>
                    {m.pecas} {m.pecas === 1 ? 'peça' : 'peças'} · {n1(m.largura)}×{n1(m.altura)}×{n1(m.profundidade)} m
                  </span>}
                </span>
              </label>
              {def && <span className="tag" style={{ flex: 'none', color: def.cor, borderColor: 'currentColor' }}>
                <i className="tag-dot" />{def.rotulo}</span>}
            </div>

            {/* cores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: 9 }}>
              {CORES.map((c) => (
                <button key={c.id} title={c.nome}
                  onClick={() => aplicar(s.id, { cor: c.hex, corId: c.id })}
                  style={{
                    aspectRatio: '1', borderRadius: 6, background: c.hex,
                    border: acab.corId === c.id ? '2px solid var(--brand-green)' : '1px solid var(--line-lit)',
                    transition: 'transform var(--t-fast) var(--ease)',
                  }} />
              ))}
            </div>

            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {def?.personalizavel && (
                <button className="btn btn-sm btn-ghost"
                  onClick={() => { setAlvoArte(s.id); fileRef.current?.click() }}>
                  {acab.arte ? `✓ ${(acab.nomeArte || 'arte').slice(0, 12)}` : '🖼 Arte'}
                </button>
              )}
              {(acab.cor || acab.arte) && (
                <button className="btn btn-sm btn-ghost" onClick={() =>
                  setAcabamentos((a) => { const n = { ...a }; delete n[s.id]; return n })}>
                  Limpar
                </button>
              )}
              {m && m.pecas > 1 && (
                <>
                  <button className="btn btn-sm btn-ghost"
                    onClick={() => substituir(s.id, dividirPorProximidade(s, analise))}>
                    ⧉ Separar por posição
                  </button>
                  <button className="btn btn-sm btn-ghost"
                    onClick={() => substituir(s.id, dividirPorPeca(s, analise))}>
                    ⁝⁝ Separar {m.pecas}
                  </button>
                </>
              )}
            </div>
          </div>
        )
      })}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={enviarArte} />
    </div>
  )
}
