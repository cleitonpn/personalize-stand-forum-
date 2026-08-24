import { PAPEIS } from '../lib/glb/roles.js'
import { areaDaSuperficie, fmtBRL, fmtM2, tipoDoObjeto } from '../lib/glb/precos.js'

/**
 * Tabela de preços do modelo.
 *
 * Superfície cobra por m², com a metragem saindo da geometria do projeto —
 * cada parede tem a medida que tem no arquivo. Objeto cobra por peça.
 */
export default function PainelPrecos({
  analise, superficies, objetos, recorte, precos, setPrecos, precosObjeto, setPrecosObjeto,
}) {
  // papéis que aparecem de fato neste modelo, com a metragem somada
  const porPapel = {}
  for (const s of superficies || []) {
    if (!s.podeCor && !s.podeArte) continue
    const a = areaDaSuperficie(s, analise, recorte)
    if (!a) continue
    if (!porPapel[s.papel]) porPapel[s.papel] = { area: 0, n: 0 }
    porPapel[s.papel].area += a
    porPapel[s.papel].n++
  }

  const porTipo = {}
  for (const o of objetos || []) {
    const t = tipoDoObjeto(o)
    porTipo[t] = (porTipo[t] || 0) + 1
  }

  const setValor = (chave, valor) =>
    setPrecos((p) => ({ ...p, [chave]: { unidade: 'm2', ...p[chave], valor: Number(valor) || 0 } }))
  const setValorObj = (chave, valor) =>
    setPrecosObjeto((p) => ({ ...p, [chave]: { unidade: 'peca', ...p[chave], valor: Number(valor) || 0 } }))

  const Campo = ({ valor, aoMudar, sufixo }) => (
    <div className="row" style={{ gap: 6, flex: 'none' }}>
      <span className="dim" style={{ fontSize: 11.5 }}>R$</span>
      <input className="input" type="number" min="0" step="0.01" value={valor ?? ''}
        onChange={(e) => aoMudar(e.target.value)} placeholder="0,00"
        style={{ padding: '6px 9px', fontSize: 12.5, width: 92, textAlign: 'right' }} />
      <span className="dim" style={{ fontSize: 11.5, width: 34 }}>{sufixo}</span>
    </div>
  )

  return (
    <div className="col" style={{ gap: 16 }}>
      <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
        A metragem é medida no próprio projeto — cada parede entra com a área que
        tem no arquivo, já descontando peças duplicadas e o que está fora da
        área do estande.
      </p>

      <div className="col" style={{ gap: 9 }}>
        <div className="label">Por metro quadrado</div>
        {Object.keys(porPapel).length === 0 && (
          <div className="dim" style={{ fontSize: 12.5 }}>
            Nenhuma superfície liberada ainda. Libere cor ou arte na aba Superfícies.
          </div>
        )}
        {Object.entries(porPapel).map(([papel, info]) => {
          const def = PAPEIS[papel]
          const regra = precos?.[papel] || { unidade: 'm2', valor: 0 }
          return (
            <div key={papel} style={{
              padding: '11px 13px', borderRadius: 'var(--r)',
              background: 'var(--surface-2)', border: '1px solid var(--line)',
            }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div className="col" style={{ gap: 2, minWidth: 0 }}>
                  <span className="row" style={{ gap: 7, fontSize: 13, fontWeight: 600 }}>
                    <i className="tag-dot" style={{ color: def?.cor }} />{def?.rotulo || papel}
                  </span>
                  <span className="dim" style={{ fontSize: 11 }}>
                    {info.n} {info.n === 1 ? 'superfície' : 'superfícies'} · {fmtM2(info.area)} no total
                  </span>
                </div>
                <Campo valor={regra.valor} aoMudar={(v) => setValor(papel, v)} sufixo="/ m²" />
              </div>
              {regra.valor > 0 && (
                <div className="dim" style={{ fontSize: 11.5, marginTop: 7, textAlign: 'right' }}>
                  Tudo personalizado: <b style={{ color: 'var(--brand-green)' }}>{fmtBRL(regra.valor * info.area)}</b>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="col" style={{ gap: 9 }}>
        <div className="label">Por peça</div>
        {Object.entries(porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, n]) => {
          const regra = precosObjeto?.[tipo] || { unidade: 'peca', valor: 0 }
          return (
            <div key={tipo} style={{
              padding: '11px 13px', borderRadius: 'var(--r)',
              background: 'var(--surface-2)', border: '1px solid var(--line)',
            }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 10 }}>
                <div className="col" style={{ gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{tipo}</span>
                  <span className="dim" style={{ fontSize: 11 }}>{n} {n === 1 ? 'unidade' : 'unidades'} no projeto</span>
                </div>
                <Campo valor={regra.valor} aoMudar={(v) => setValorObj(tipo, v)} sufixo="/ un." />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
