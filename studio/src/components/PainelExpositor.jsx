import { useMemo, useRef, useState } from 'react'
import { agruparParaExpositor } from '../lib/glb/nomes.js'
import { areaDaSuperficie, fmtBRL, fmtM2 } from '../lib/glb/precos.js'
import { opcoesAtivas, superficiesEscondidas } from '../lib/glb/complementos.js'
import EscolhaComplemento from './EscolhaComplemento.jsx'
import MobiliarioExpositor from './MobiliarioExpositor.jsx'

// Cartela de teste até chegar a tabela oficial de napas e carpetes.
const CORES = [
  { id: 'preto', nome: 'Preto', hex: '#141414' },
  { id: 'branco', nome: 'Branco', hex: '#f2f2ee' },
  { id: 'cinza', nome: 'Cinza', hex: '#8b8f96' },
  { id: 'azul', nome: 'Azul', hex: '#1d4ed8' },
  { id: 'celeste', nome: 'Azul claro', hex: '#38bdf8' },
  { id: 'verde', nome: 'Verde', hex: '#16a34a' },
  { id: 'limao', nome: 'Limão', hex: '#a3e635' },
  { id: 'amarelo', nome: 'Amarelo', hex: '#facc15' },
  { id: 'laranja', nome: 'Laranja', hex: '#f97316' },
  { id: 'vermelho', nome: 'Vermelho', hex: '#dc2626' },
  { id: 'vinho', nome: 'Vinho', hex: '#881337' },
  { id: 'roxo', nome: 'Roxo', hex: '#7c3aed' },
  { id: 'rosa', nome: 'Rosa', hex: '#ec4899' },
  { id: 'areia', nome: 'Areia', hex: '#e0d5bf' },
  { id: 'madeira', nome: 'Madeira clara', hex: '#b98a52' },
  { id: 'nogueira', nome: 'Madeira escura', hex: '#6b4423' },
]

/**
 * Painel do expositor.
 *
 * Diferente do painel do admin de propósito: aqui não aparece nome de material
 * de CAD, nem papel, nem contagem de peças. O expositor vê "Parede do fundo" e
 * uma cartela de cores grande. Quem precisa do detalhe técnico é o admin, na
 * tela dele.
 */
export default function PainelExpositor({
  analise, superficies, acabamentos, setAcabamentos, supFoco, setSupFoco, recorte, precos, orcamento,
  complementos, escolhas, setEscolhas, objetos, setObjetos, objFoco, setObjFoco,
}) {
  const fileRef = useRef(null)
  const [alvoArte, setAlvoArte] = useState(null)
  const [aberto, setAberto] = useState('piso')

  const grupos = agruparParaExpositor(superficies, analise, recorte, complementos)
  const aplicar = (id, patch) => setAcabamentos((a) => ({ ...a, [id]: { ...a[id], ...patch } }))
  const escolher = (gid, oid) => setEscolhas?.((e) => ({ ...e, [gid]: oid }))

  // Perguntas presas a uma parede aparecem junto dela; as soltas ganham seção
  // própria no fim. Uma pergunta longe do que ela muda obriga o expositor a
  // relacionar as duas coisas de cabeça.
  const porAncora = useMemo(() => {
    const m = new Map()
    for (const g of complementos || []) {
      if (!g.ancora || !(g.opcoes || []).some((o) => o.arquivo?.url)) continue
      if (!m.has(g.ancora)) m.set(g.ancora, [])
      m.get(g.ancora).push(g)
    }
    return m
  }, [complementos])

  const soltos = useMemo(
    () => (complementos || []).filter((g) => !g.ancora && (g.opcoes || []).some((o) => o.arquivo?.url)),
    [complementos],
  )

  // Superfície substituída por uma peça escolhida saiu de cena: mostrar cartela
  // de cor para ela seria oferecer um acabamento que ninguém vai ver.
  const escondidas = useMemo(
    () => superficiesEscondidas(opcoesAtivas(complementos, escolhas)),
    [complementos, escolhas],
  )

  const enviarArte = (e) => {
    const f = e.target.files?.[0]
    if (!f || !alvoArte) return
    const r = new FileReader()
    r.onload = () => aplicar(alvoArte, { arte: r.result, nomeArte: f.name })
    r.readAsDataURL(f)
    e.target.value = ''
  }

  if (!grupos.length && !soltos.length) {
    return (
      <div className="card card-pad" style={{ textAlign: 'center', padding: '36px 22px' }}>
        <div style={{ fontSize: 30, marginBottom: 10, opacity: .5 }}>🛠</div>
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Projeto em preparação</h3>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          A equipe da USET ainda está preparando o que você poderá personalizar.
        </p>
      </div>
    )
  }

  return (
    <div className="col" style={{ gap: 10 }}>
      {grupos.map((g) => {
        const open = aberto === g.id
        const escolhidos = g.itens.filter((s) => acabamentos[s.id]?.cor || acabamentos[s.id]?.arte).length

        return (
          <div key={g.id} className="card" style={{ overflow: 'hidden' }}>
            <button onClick={() => setAberto(open ? null : g.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                padding: '14px 15px', textAlign: 'left',
                background: open ? 'var(--surface-2)' : 'transparent',
                transition: 'background var(--t) var(--ease)',
              }}>
              <span style={{ fontSize: 17 }}>{g.icone}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>{g.rotulo}</span>
                <span className="dim" style={{ fontSize: 11.5 }}>
                  {g.itens.length} {g.itens.length === 1 ? 'opção' : 'opções'}
                  {escolhidos ? ` · ${escolhidos} personalizada${escolhidos > 1 ? 's' : ''}` : ''}
                </span>
              </span>
              {escolhidos > 0 && <span className="tag" style={{ color: 'var(--brand-green)', borderColor: 'currentColor' }}>
                <i className="tag-dot" />{escolhidos}
              </span>}
              <span className="dim" style={{ fontSize: 17, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--t) var(--ease)' }}>›</span>
            </button>

            {open && (
              <div className="col" style={{ gap: 14, padding: '4px 15px 16px' }}>
                {g.itens.map((s) => {
                  const acab = acabamentos[s.id] || {}
                  const area = areaDaSuperficie(s, analise, recorte)
                  const regra = precos?.[s.papel]
                  const item = orcamento?.itens?.find((i) => i.id === s.id)
                  const perguntas = porAncora.get(s.id) || []
                  const substituida = escondidas.has(s.id)

                  return (
                    <div key={s.id}
                      onMouseEnter={() => setSupFoco(s.id)}
                      onMouseLeave={() => setSupFoco(null)}
                      style={{
                        padding: 12, borderRadius: 'var(--r)',
                        background: supFoco === s.id ? 'var(--surface-3)' : 'var(--bg-deep)',
                        border: `1px solid ${supFoco === s.id ? 'var(--brand-blue-lit)' : 'var(--line)'}`,
                        transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
                      }}>
                      <div className="row" style={{ justifyContent: 'space-between', gap: 9, marginBottom: 10 }}>
                        <div className="col" style={{ gap: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{s.rotulo}</span>
                          <span className="dim" style={{ fontSize: 11 }}>
                            {fmtM2(area)}
                            {regra?.valor ? ` · ${fmtBRL(regra.valor)} por m²` : ''}
                          </span>
                        </div>
                        {item && (
                          <span className="mono" style={{ flex: 'none', fontSize: 12.5, color: 'var(--brand-green)' }}>
                            {fmtBRL(item.total)}
                          </span>
                        )}
                      </div>

                      {substituida && (
                        <div className="dim" style={{ fontSize: 11.5, lineHeight: 1.55, marginBottom: 2 }}>
                          Esta parte saiu do estande por causa da opção que você
                          escolheu abaixo. Volte ao padrão para personalizá-la de novo.
                        </div>
                      )}

                      {s.podeCor && !substituida && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 10 }}>
                          {CORES.map((c) => (
                            <button key={c.id} title={c.nome}
                              onClick={() => aplicar(s.id, { cor: c.hex, corId: c.id })}
                              style={{
                                aspectRatio: '1', borderRadius: 7, background: c.hex,
                                border: acab.corId === c.id ? '2.5px solid var(--brand-green)' : '1px solid var(--line-lit)',
                                boxShadow: acab.corId === c.id ? '0 0 0 3px rgba(22,224,163,.18)' : 'none',
                                transition: 'box-shadow var(--t) var(--ease), border-color var(--t) var(--ease)',
                              }} />
                          ))}
                        </div>
                      )}

                      {!substituida && (
                        <div className="row" style={{ gap: 7, flexWrap: 'wrap' }}>
                          {s.podeArte && (
                            <button className="btn btn-sm" onClick={() => { setAlvoArte(s.id); fileRef.current?.click() }}>
                              {acab.arte ? `✓ ${(acab.nomeArte || 'imagem').slice(0, 16)}` : '🖼 Enviar minha arte'}
                            </button>
                          )}
                          {(acab.cor || acab.arte) && (
                            <button className="btn btn-sm btn-ghost" onClick={() =>
                              setAcabamentos((a) => { const n = { ...a }; delete n[s.id]; return n })}>
                              Desfazer
                            </button>
                          )}
                        </div>
                      )}

                      {perguntas.map((q) => (
                        <EscolhaComplemento key={q.id} grupo={q} escolhido={escolhas?.[q.id]}
                          aoEscolher={(oid) => escolher(q.id, oid)} />
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <MobiliarioExpositor objetos={objetos} setObjetos={setObjetos}
        objFoco={objFoco} setObjFoco={setObjFoco} recorte={recorte}
        aberto={aberto} setAberto={setAberto} />

      {soltos.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <button onClick={() => setAberto(aberto === '_opcoes' ? null : '_opcoes')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 11,
              padding: '14px 15px', textAlign: 'left',
              background: aberto === '_opcoes' ? 'var(--surface-2)' : 'transparent',
              transition: 'background var(--t) var(--ease)',
            }}>
            <span style={{ fontSize: 17 }}>🧩</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>Opções do estande</span>
              <span className="dim" style={{ fontSize: 11.5 }}>
                {soltos.length} {soltos.length === 1 ? 'escolha' : 'escolhas'}
              </span>
            </span>
            <span className="dim" style={{ fontSize: 17, transform: aberto === '_opcoes' ? 'rotate(90deg)' : 'none', transition: 'transform var(--t) var(--ease)' }}>›</span>
          </button>
          {aberto === '_opcoes' && (
            <div className="col" style={{ gap: 14, padding: '4px 15px 16px' }}>
              {soltos.map((q) => (
                <EscolhaComplemento key={q.id} grupo={q} escolhido={escolhas?.[q.id]}
                  aoEscolher={(oid) => escolher(q.id, oid)} compacto />
              ))}
            </div>
          )}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={enviarArte} />
    </div>
  )
}
