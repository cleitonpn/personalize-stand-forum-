import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import Viewer, { useGLB } from '../components/Viewer.jsx'
import { analisar } from '../lib/glb/analyze.js'
import { PAPEIS, LISTA_PAPEIS } from '../lib/glb/roles.js'
import { superficiesPadrao, indicePorPeca } from '../lib/glb/superficies.js'
import PainelPersonalizar from '../components/PainelPersonalizar.jsx'

// Liberação de CORS do bucket. Só existe por comando — nem o Console do Firebase
// nem o do Google Cloud expõem isso na interface. Roda no Cloud Shell, que é um
// terminal dentro do navegador (nada instalado na máquina do usuário).
const CMD_CORS = `cat > cors.json <<'FIM'
[{"origin":["*"],
  "method":["GET","HEAD"],
  "responseHeader":["Content-Type","Content-Length","Range"],
  "maxAgeSeconds":3600}]
FIM
gcloud storage buckets update \\
  gs://personalizacao-stand.firebasestorage.app \\
  --cors-file=cors.json`

const n1 = (v) => (isFinite(v) ? v.toFixed(1) : '—')
const n2 = (v) => (isFinite(v) ? v.toFixed(2) : '—')
const mil = (v) => v.toLocaleString('pt-BR')

/* ------------------------------ métricas ------------------------------ */
function Metrica({ rotulo, valor, sub, alerta }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 'var(--r)', background: 'var(--bg-deep)',
      border: `1px solid ${alerta ? 'rgba(245,165,36,.35)' : 'var(--line)'}`, minWidth: 0,
    }}>
      <div className="label" style={{ fontSize: 10.5, marginBottom: 3 }}>{rotulo}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: alerta ? 'var(--warn)' : 'var(--text)' }}>{valor}</div>
      {sub && <div className="dim" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

/* --------------------------- linha de material ------------------------ */
function LinhaMaterial({ mat, papel, foco, aoFocar, aoMudar }) {
  const def = PAPEIS[papel] || null
  const sugerido = !papel
  const usar = papel || mat.papelSugerido

  return (
    <div
      onMouseEnter={() => aoFocar(mat.nome)}
      onMouseLeave={() => aoFocar(null)}
      style={{
        padding: '11px 13px', borderRadius: 'var(--r)',
        background: foco ? 'var(--surface-3)' : 'var(--surface-2)',
        border: `1px solid ${foco ? 'var(--brand-blue-lit)' : 'var(--line)'}`,
        transition: 'all var(--t) var(--ease)',
      }}
    >
      <div className="row" style={{ justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
        <div className="col" style={{ gap: 2, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {mat.nome}
          </div>
          <div className="dim" style={{ fontSize: 11 }}>
            {mat.pecas} {mat.pecas === 1 ? 'peça' : 'peças'} · {mil(mat.tris)} tri ·{' '}
            {n1(mat.bbox.largura)}×{n1(mat.bbox.altura)}×{n1(mat.bbox.profundidade)} m
          </div>
        </div>
        {def?.personalizavel && (
          <span className="tag" style={{ flex: 'none', color: def.cor, borderColor: 'currentColor' }}>
            <i className="tag-dot" />personalizável
          </span>
        )}
      </div>

      <select className="select" value={usar} onChange={(e) => aoMudar(mat.nome, e.target.value)}
        style={{ padding: '7px 10px', fontSize: 12.5, borderColor: sugerido ? 'var(--line)' : PAPEIS[usar]?.cor }}>
        {LISTA_PAPEIS.map((p) => (
          <option key={p.id} value={p.id}>{p.rotulo}</option>
        ))}
      </select>

      {sugerido && (
        <div className="dim" style={{ fontSize: 11, marginTop: 6, fontStyle: 'italic' }}>
          Sugerido: {mat.motivo}
        </div>
      )}
    </div>
  )
}

/* ------------------------------ recorte ------------------------------- */
function PainelRecorte({ analise, recorte, aoDefinir }) {
  const cl = analise.aglomerados.filter((c) => c.tris > 200 && c.area > 1)

  return (
    <div className="col" style={{ gap: 11 }}>
      <p className="muted" style={{ margin: 0, fontSize: 12.5 }}>
        O arquivo pode conter mais que o estande — cópia espelhada, pranchas 2D, caixa de céu do render.
        Escolha a área que é o estande de verdade; o resto é descartado.
      </p>

      {cl.length > 1 && (
        <div className="col" style={{ gap: 7 }}>
          <div className="label">Agrupamentos detectados</div>
          {cl.slice(0, 6).map((c, i) => {
            const r = { x0: c.min[0], x1: c.max[0], z0: c.min[1], z1: c.max[1] }
            const ativo = recorte && Math.abs(recorte.x0 - r.x0) < 0.01 && Math.abs(recorte.z0 - r.z0) < 0.01
            return (
              <button key={i} className={`chip ${ativo ? 'sel' : ''}`}
                style={{ justifyContent: 'space-between', width: '100%' }}
                onClick={() => aoDefinir(r)}>
                <span>{n1(c.largura)} × {n1(c.profundidade)} m</span>
                <span className="dim">{n1(c.area)} m² · {mil(c.tris)} tri</span>
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
        {[['x0', 'X inicial'], ['x1', 'X final'], ['z0', 'Z inicial'], ['z1', 'Z final']].map(([k, rot]) => (
          <div className="field" key={k}>
            <label className="label" style={{ fontSize: 10.5 }}>{rot}</label>
            <input className="input" type="number" step="0.1" style={{ padding: '7px 10px', fontSize: 12.5 }}
              value={recorte?.[k] ?? ''} placeholder="—"
              onChange={(e) => aoDefinir({ ...(recorte || { x0: 0, x1: 0, z0: 0, z1: 0 }), [k]: Number(e.target.value) })} />
          </div>
        ))}
      </div>

      <div className="hr" />

      <div className="label">Dividir ao meio</div>
      <p className="dim" style={{ margin: '-4px 0 2px', fontSize: 11.5 }}>
        Para projetos espelhados: corta a seleção atual pela metade e fica com um lado.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          ['Metade esquerda', (r) => ({ ...r, x1: (r.x0 + r.x1) / 2 })],
          ['Metade direita',  (r) => ({ ...r, x0: (r.x0 + r.x1) / 2 })],
          ['Metade da frente',(r) => ({ ...r, z0: (r.z0 + r.z1) / 2 })],
          ['Metade do fundo', (r) => ({ ...r, z1: (r.z0 + r.z1) / 2 })],
        ].map(([rot, fn]) => (
          <button key={rot} className="btn btn-sm" disabled={!recorte}
            onClick={() => aoDefinir(fn(recorte))}>{rot}</button>
        ))}
      </div>

      <div className="hr" />

      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => {
          const c = analise.resumo.cena
          aoDefinir({ x0: c.min[0], x1: c.max[0], z0: c.min[2], z1: c.max[2] })
        }}>Usar cena inteira</button>
        <button className="btn btn-sm btn-ghost" onClick={() => aoDefinir(null)}>Limpar</button>
      </div>

      {recorte && (
        <div style={{ padding: '10px 12px', borderRadius: 'var(--r)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5 }}>
            <span className="muted">Área selecionada</span>
            <span className="mono" style={{ color: 'var(--brand-green)' }}>
              {n2(recorte.x1 - recorte.x0)} × {n2(recorte.z1 - recorte.z0)} m
            </span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: 12.5, marginTop: 3 }}>
            <span className="muted">Equivale a</span>
            <span className="mono">{n1(Math.abs((recorte.x1 - recorte.x0) * (recorte.z1 - recorte.z0)))} m²</span>
          </div>
          <div className="dim" style={{ fontSize: 11.5, marginTop: 6 }}>
            {(() => {
              const dentro = analise.pecas.filter((p) =>
                p.bbox.centro[0] >= Math.min(recorte.x0, recorte.x1) && p.bbox.centro[0] <= Math.max(recorte.x0, recorte.x1) &&
                p.bbox.centro[2] >= Math.min(recorte.z0, recorte.z1) && p.bbox.centro[2] <= Math.max(recorte.z0, recorte.z1))
              const tris = dentro.reduce((s, p) => s + p.tris, 0)
              return `${mil(dentro.length)} de ${mil(analise.pecas.length)} peças · ${mil(tris)} triângulos mantidos`
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------- página ------------------------------- */
export default function Editor() {
  const { id } = useParams()
  const [modelo, setModelo] = useState(null)
  const [erro, setErro] = useState(null)
  const [papeis, setPapeis] = useState({})
  const [recorte, setRecorte] = useState(null)
  const [foco, setFoco] = useState(null)
  const [modo, setModo] = useState('original')
  const [mostrarIgnorados, setMostrarIgnorados] = useState(false)
  const [superficies, setSuperficies] = useState(null)
  const [acabamentos, setAcabamentos] = useState({})
  const [supFoco, setSupFoco] = useState(null)
  const [aba, setAba] = useState('materiais')
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'modelos', id))
        if (!snap.exists()) { setErro('Modelo não encontrado.'); return }
        const d = snap.data()
        setModelo({ id: snap.id, ...d })
        setPapeis(d.papeis || {})
        setRecorte(d.recorte || null)
      } catch (ex) { setErro(ex.message) }
    })()
  }, [id])

  const { cena, erro: erroGlb, progresso, carregando } = useGLB(modelo?.arquivo?.url)
  const analise = useMemo(() => (cena ? analisar(cena) : null), [cena])

  // Semeia as superfícies a partir dos materiais na primeira vez que a análise
  // fica pronta. Depois disso o admin manda: dividir e unir não são desfeitos
  // por uma mudança de papel.
  useEffect(() => {
    if (!analise || superficies) return
    setSuperficies(modelo?.superficies?.length ? modelo.superficies : superficiesPadrao(analise, papeis))
  }, [analise, superficies, modelo, papeis])

  const indice = useMemo(() => (superficies ? indicePorPeca(superficies) : null), [superficies])

  const mudarPapel = (nome, papel) => {
    setPapeis((p) => ({ ...p, [nome]: papel })); setSalvo(false)
    // reflete o papel novo nas superfícies que ainda vieram daquele material
    setSuperficies((ss) => ss?.map((s) => (s.origem === nome ? { ...s, papel } : s)))
  }
  const aplicarSugestoes = () => {
    if (!analise) return
    const novos = { ...papeis }
    for (const m of analise.materiais) if (!novos[m.nome]) novos[m.nome] = m.papelSugerido
    setPapeis(novos); setSalvo(false)
  }

  const salvar = async () => {
    setSalvando(true)
    try {
      await updateDoc(doc(db, 'modelos', id), {
        papeis, recorte,
        superficies: superficies || [],
        status: Object.keys(papeis).length ? 'mapeado' : 'novo',
      })
      setSalvo(true); setTimeout(() => setSalvo(false), 2600)
    } catch (ex) { alert(`Não foi possível salvar: ${ex.message}`) }
    finally { setSalvando(false) }
  }

  if (erro) {
    return (
      <div className="card card-pad" style={{ maxWidth: 460, margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>Ops</h2>
        <p className="muted">{erro}</p>
        <Link className="btn" to="/modelos" style={{ marginTop: 14 }}>Voltar aos modelos</Link>
      </div>
    )
  }

  const mapeados = Object.keys(papeis).length
  const totalMat = analise?.materiais.length || 0
  const personalizaveis = analise?.materiais.filter((m) => PAPEIS[papeis[m.nome]]?.personalizavel) || []
  const nIgnorados = Object.values(papeis).filter((p) => p === 'ignorar').length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 400px', height: 'calc(100vh - 62px)' }}>
      {/* ---------------- viewer ---------------- */}
      <div style={{ position: 'relative', borderRight: '1px solid var(--line)' }}>
        {(carregando || !cena) && !erroGlb && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 5 }}>
            <div className="col" style={{ alignItems: 'center', gap: 12, width: 240 }}>
              <span className="spinner" style={{ width: 22, height: 22 }} />
              <div className="muted" style={{ fontSize: 13 }}>Carregando modelo…</div>
              <div className="progress" style={{ width: '100%' }}><i style={{ width: `${(progresso || 0) * 100}%` }} /></div>
              <div className="dim mono" style={{ fontSize: 11.5 }}>{Math.round((progresso || 0) * 100)}%</div>
            </div>
          </div>
        )}

        {erroGlb && (
          // zIndex acima do Canvas: sem isso o 3D pinta por cima e o erro some
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'grid', placeItems: 'center', padding: 30 }}>
            <div className="card card-pad" style={{ maxWidth: 520, borderColor: 'rgba(244,63,94,.35)' }}>
              <div className="row" style={{ gap: 9, marginBottom: 8 }}>
                <span style={{ fontSize: 19 }}>⚠</span>
                <div style={{ color: '#fda4af', fontWeight: 700, fontSize: 15 }}>{erroGlb.titulo}</div>
              </div>
              <div className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{erroGlb.detalhe}</div>

              {erroGlb.rede && (
                <>
                  <div className="hr" />
                  <div className="label" style={{ marginBottom: 7 }}>O que tentar, nesta ordem</div>
                  <ol className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.85 }}>
                    <li>Abrir esta página numa <b>aba anônima</b> (descarta extensão do navegador).</li>
                    <li>Testar em <b>outra rede</b> — VPN e firewall de empresa costumam barrar.</li>
                    <li>Se continuar, me avise: o problema é no bucket e eu resolvo.</li>
                  </ol>
                </>
              )}

              {erroGlb.cors && (
                <>
                  <div className="hr" />
                  <div className="label" style={{ marginBottom: 7 }}>Liberar sem instalar nada — leva 2 minutos</div>
                  <p className="muted" style={{ margin: '0 0 10px', fontSize: 12.5, lineHeight: 1.65 }}>
                    Essa configuração não existe na tela do Firebase nem do Google Cloud — só por
                    comando. Mas o Google tem um terminal dentro do navegador, então você não
                    instala nada no seu computador.
                  </p>
                  <ol className="muted" style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 12.5, lineHeight: 1.9 }}>
                    <li>Abra <a className="grad-text" style={{ fontWeight: 600 }} target="_blank" rel="noreferrer"
                      href="https://console.cloud.google.com/?project=personalizacao-stand&cloudshell=true">o Cloud Shell ↗</a> (autorize se pedir).</li>
                    <li>Espere aparecer a linha de comando preta embaixo.</li>
                    <li>Cole o bloco abaixo inteiro e aperte <b>Enter</b>.</li>
                    <li>Volte aqui e clique em <b>Tentar de novo</b>.</li>
                  </ol>
                  <pre className="mono" style={{
                    margin: 0, padding: '12px 13px', borderRadius: 'var(--r)', overflowX: 'auto',
                    background: 'var(--bg-deep)', border: '1px solid var(--line)',
                    fontSize: 11.5, lineHeight: 1.7, color: 'var(--text-mid)', whiteSpace: 'pre',
                  }}>{CMD_CORS}</pre>
                  <button className="btn btn-sm" style={{ width: '100%', marginTop: 9 }}
                    onClick={() => navigator.clipboard?.writeText(CMD_CORS)}>
                    Copiar comando
                  </button>
                </>
              )}

              {erroGlb.url && (
                <>
                  <div className="hr" />
                  <a className="btn btn-sm" href={erroGlb.url} target="_blank" rel="noreferrer" style={{ width: '100%' }}>
                    Abrir o arquivo direto ↗
                  </a>
                  <div className="dim" style={{ fontSize: 11.5, marginTop: 7, textAlign: 'center' }}>
                    Se baixar normalmente, o arquivo está bem e o problema é no navegador.
                  </div>
                </>
              )}

              <button className="btn" style={{ marginTop: 16, width: '100%' }}
                onClick={() => location.reload()}>Tentar de novo</button>
            </div>
          </div>
        )}

        <Viewer cena={cena} materialFoco={foco} papeis={papeis} modo={modo} recorte={recorte}
          mostrarIgnorados={mostrarIgnorados}
          indice={indice} acabamentos={acabamentos}
          supFoco={aba === 'personalizar' ? supFoco : null} />

        {/* controles flutuantes */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {[['original', 'Original'], ['papeis', 'Por papel']].map(([k, r]) => (
            <button key={k} className={`chip ${modo === k ? 'sel' : ''}`} onClick={() => setModo(k)}
              style={{ backdropFilter: 'blur(10px)' }}>{r}</button>
          ))}
          {nIgnorados > 0 && (
            <button className={`chip ${mostrarIgnorados ? 'sel' : ''}`}
              onClick={() => setMostrarIgnorados((v) => !v)}
              style={{ backdropFilter: 'blur(10px)' }}
              title="Mostra de novo o que foi marcado como Ignorar">
              {mostrarIgnorados ? '👁 Descarte visível' : `🚫 ${nIgnorados} descartado${nIgnorados > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {foco && (
          <div style={{
            position: 'absolute', bottom: 16, left: 14, right: 14, padding: '9px 13px',
            borderRadius: 'var(--r)', background: 'rgba(7,10,20,.86)', backdropFilter: 'blur(10px)',
            border: '1px solid var(--brand-blue-lit)', fontSize: 12.5,
          }}>
            <span className="mono" style={{ color: '#22d3ee' }}>{foco}</span>
            <span className="dim"> — realçado na cena</span>
          </div>
        )}
      </div>

      {/* ---------------- painel ---------------- */}
      <aside style={{ overflowY: 'auto', background: 'var(--bg-deep)' }}>
        <div style={{ padding: '18px 18px 0' }}>
          <Link className="dim" to="/modelos" style={{ fontSize: 12.5 }}>← Modelos</Link>
          <h1 style={{ fontSize: 19, margin: '8px 0 3px' }}>{modelo?.nome || '…'}</h1>
          <div className="dim" style={{ fontSize: 12.5 }}>
            {modelo?.feira ? `${modelo.feira} · ` : ''}{modelo?.arquivo?.nomeOriginal}
          </div>
        </div>

        {analise && (
          <>
            <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              <Metrica rotulo="Materiais" valor={totalMat} sub={`${mapeados} mapeados`} />
              <Metrica rotulo="Peças" valor={mil(analise.resumo.pecasTotal)} />
              <Metrica rotulo="Triângulos" valor={mil(analise.resumo.trisTotal)}
                sub={analise.resumo.trisTotal > 1.5e6 ? 'pesado para celular' : 'ok'}
                alerta={analise.resumo.trisTotal > 1.5e6} />
              <Metrica rotulo="Cena" valor={`${n1(analise.resumo.cena.largura)}×${n1(analise.resumo.cena.profundidade)}`} sub="metros" />
            </div>

            {analise.duplicatas.total > 0 && (
              <div style={{ margin: '0 18px 16px', padding: '11px 13px', borderRadius: 'var(--r)',
                background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.28)' }}>
                <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--warn)', marginBottom: 3 }}>
                  {mil(analise.duplicatas.total)} peças sobrepostas
                </div>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  Cópias exatamente no mesmo lugar ({mil(analise.duplicatas.tris)} triângulos). Causam
                  z-fighting — serão descartadas na publicação.
                </div>
              </div>
            )}

            {/* abas */}
            <div className="row" style={{ gap: 6, padding: '0 18px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              {[
                ['materiais', `Materiais (${totalMat})`],
                ['recorte', 'Área do estande'],
                ['personalizar', `Personalizar${superficies ? ` (${superficies.length})` : ''}`],
              ].map(([k, r]) => (
                <button key={k} className={`chip ${aba === k ? 'sel' : ''}`} onClick={() => setAba(k)}>{r}</button>
              ))}
            </div>

            <div style={{ padding: 18 }}>
              {aba === 'personalizar' ? (
                superficies
                  ? <PainelPersonalizar
                      analise={analise} superficies={superficies}
                      setSuperficies={(v) => { setSuperficies(v); setSalvo(false) }}
                      acabamentos={acabamentos} setAcabamentos={setAcabamentos}
                      supFoco={supFoco} setSupFoco={setSupFoco} />
                  : <div className="row"><span className="spinner" /><span className="muted">Preparando…</span></div>
              ) : aba === 'materiais' ? (
                <div className="col" style={{ gap: 9 }}>
                  {mapeados < totalMat && (
                    <button className="btn btn-sm" onClick={aplicarSugestoes} style={{ width: '100%' }}>
                      ✨ Aceitar as {totalMat - mapeados} sugestões restantes
                    </button>
                  )}
                  {analise.materiais.map((m) => (
                    <LinhaMaterial key={m.nome} mat={m} papel={papeis[m.nome]}
                      foco={foco === m.nome} aoFocar={setFoco} aoMudar={mudarPapel} />
                  ))}
                </div>
              ) : (
                <PainelRecorte analise={analise} recorte={recorte}
                  aoDefinir={(r) => { setRecorte(r); setSalvo(false) }} />
              )}
            </div>
          </>
        )}

        {/* rodapé fixo */}
        <div style={{
          position: 'sticky', bottom: 0, padding: 18, background: 'rgba(4,6,13,.94)',
          backdropFilter: 'blur(10px)', borderTop: '1px solid var(--line)',
        }}>
          {personalizaveis.length > 0 && (
            <div className="dim" style={{ fontSize: 11.5, marginBottom: 10 }}>
              {personalizaveis.length} {personalizaveis.length === 1 ? 'superfície personalizável' : 'superfícies personalizáveis'} definidas
            </div>
          )}
          <button className="btn btn-primary" style={{ width: '100%', padding: 12 }}
            disabled={salvando || !analise} onClick={salvar}>
            {salvando ? <><span className="spinner" /> Salvando…</> : salvo ? '✓ Salvo' : 'Salvar mapeamento'}
          </button>
        </div>
      </aside>
    </div>
  )
}
