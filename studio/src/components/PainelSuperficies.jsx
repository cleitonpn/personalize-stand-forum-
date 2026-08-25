import { useState } from 'react'
import { Interruptor } from './Interruptor.jsx'
import { PAPEIS, LISTA_PAPEIS } from '../lib/glb/roles.js'
import { dividirPorPeca, dividirPorProximidade, unir, medir } from '../lib/glb/superficies.js'

const n1 = (v) => (isFinite(v) ? v.toFixed(1) : '—')

/**
 * Trabalho estrutural do admin: definir QUAIS são as superfícies.
 * Dividir e unir moram aqui, no mapeamento — não na personalização, que é a
 * tela do expositor e só deve escolher acabamento sobre estrutura já pronta.
 */
export default function PainelSuperficies({ analise, superficies, setSuperficies, supFoco, setSupFoco, aoNovaOpcao }) {
  const [sel, setSel] = useState([])
  const [renomeando, setRenomeando] = useState(null)
  const [rascunho, setRascunho] = useState('')

  const alternarSel = (id) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const substituir = (id, novas) => {
    setSuperficies((ss) => ss.flatMap((s) => (s.id === id ? novas : [s])))
    setSel((s) => s.filter((x) => x !== id))
  }

  const unirSelecionadas = () => {
    const alvo = superficies.filter((s) => sel.includes(s.id))
    if (alvo.length < 2) return
    const nova = unir(alvo)
    setSuperficies((ss) => [nova, ...ss.filter((s) => !sel.includes(s.id))])
    setSel([]); setSupFoco(nova.id)
    setRenomeando(nova.id); setRascunho(nova.nome)
  }

  const renomear = (id) => {
    setSuperficies((ss) => ss.map((s) => (s.id === id ? { ...s, nome: rascunho.trim() || s.nome } : s)))
    setRenomeando(null)
  }

  return (
    <div className="col" style={{ gap: 12 }}>
      <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
        Defina o que o expositor vai poder mexer. <b>Separar</b> quebra peças que hoje
        mudam juntas — os 15 painéis que compartilham um material, por exemplo.
        <b> Unir</b> junta o que é um objeto só, como o assento e os pés da banqueta.
      </p>

      <div style={{
        padding: '10px 12px', borderRadius: 'var(--r)',
        background: sel.length >= 2 ? 'rgba(22,224,163,.08)' : 'var(--surface-2)',
        border: `1px solid ${sel.length >= 2 ? 'var(--brand-green)' : 'var(--line)'}`,
        transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
      }}>
        {sel.length >= 2 ? (
          <button className="btn btn-primary btn-sm" style={{ width: '100%' }} onClick={unirSelecionadas}>
            ⛓ Unir {sel.length} superfícies numa só
          </button>
        ) : (
          <div className="dim" style={{ fontSize: 12, textAlign: 'center' }}>
            {sel.length === 1
              ? 'Marque mais uma para unir'
              : 'Marque duas ou mais superfícies abaixo para uni-las'}
          </div>
        )}
      </div>

      {superficies.map((s) => {
        const m = medir(s, analise)
        const def = PAPEIS[s.papel]
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
              transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
            }}>
            <div className="row" style={{ gap: 9, marginBottom: 9, alignItems: 'flex-start' }}>
              <input type="checkbox" checked={marcada} onChange={() => alternarSel(s.id)}
                style={{ marginTop: 3, flex: 'none', width: 15, height: 15, cursor: 'pointer' }} />
              <div className="col" style={{ gap: 3, minWidth: 0, flex: 1 }}>
                {renomeando === s.id ? (
                  <input className="input" autoFocus value={rascunho}
                    style={{ padding: '5px 9px', fontSize: 12.5 }}
                    onChange={(e) => setRascunho(e.target.value)}
                    onBlur={() => renomear(s.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') renomear(s.id); if (e.key === 'Escape') setRenomeando(null) }} />
                ) : (
                  <button onClick={() => { setRenomeando(s.id); setRascunho(s.nome) }}
                    title="Clique para renomear"
                    style={{ textAlign: 'left', fontSize: 13, fontWeight: 600, padding: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.nome} <span className="dim" style={{ fontWeight: 400 }}>✎</span>
                  </button>
                )}
                {m && <span className="dim" style={{ fontSize: 11 }}>
                  {m.pecas} {m.pecas === 1 ? 'peça' : 'peças'} · {n1(m.largura)}×{n1(m.altura)}×{n1(m.profundidade)} m
                </span>}
              </div>
              {def && <span className="tag" style={{ flex: 'none', color: def.cor, borderColor: 'currentColor' }}>
                <i className="tag-dot" />{def.rotulo}</span>}
            </div>

            {/* permissões do expositor — decisão do admin, não da heurística */}
            <div className="row" style={{ gap: 14, marginBottom: 9, flexWrap: 'wrap' }}>
              <Interruptor ligado={!!s.podeCor} rotulo="Cliente troca a cor"
                aoMudar={() => setSuperficies((ss) => ss.map((x) => (x.id === s.id ? { ...x, podeCor: !x.podeCor } : x)))} />
              <Interruptor ligado={!!s.podeArte} rotulo="Cliente sobe arte"
                aoMudar={() => setSuperficies((ss) => ss.map((x) => (x.id === s.id ? { ...x, podeArte: !x.podeArte } : x)))} />
            </div>

            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <select className="select" value={s.papel} style={{ padding: '5px 9px', fontSize: 12, width: 'auto', flex: 1, minWidth: 130 }}
                onChange={(e) => setSuperficies((ss) => ss.map((x) => (x.id === s.id ? { ...x, papel: e.target.value } : x)))}>
                {LISTA_PAPEIS.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
              </select>
              {m && m.pecas > 1 && (
                <>
                  <button className="btn btn-sm btn-ghost" title="Agrupa as peças que estão próximas"
                    onClick={() => substituir(s.id, dividirPorProximidade(s, analise))}>
                    ⧉ Por posição
                  </button>
                  <button className="btn btn-sm btn-ghost" title="Uma superfície para cada peça"
                    onClick={() => substituir(s.id, dividirPorPeca(s, analise))}>
                    ⁝⁝ Separar tudo
                  </button>
                </>
              )}
            </div>

            {/* Peça opcional para ESTE ponto: painel de LED nesta parede, esta
                peça noutra posição. Fica aqui porque é olhando a parede que o
                admin percebe o que cabe nela. */}
            {aoNovaOpcao && (
              <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginTop: 7 }}
                title="Subir um .glb de peça que o expositor pode escolher aqui"
                onClick={() => aoNovaOpcao(s)}>
                🧩 Peça opcional nesta superfície
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
