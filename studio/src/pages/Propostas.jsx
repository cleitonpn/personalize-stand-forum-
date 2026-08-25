import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { fmtBRL, fmtM2 } from '../lib/glb/precos.js'
import { gerarPropostaHTML } from '../lib/proposta.js'

const data = (ts) => ts?.toDate?.().toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) || '—'

export default function Propostas() {
  const [lista, setLista] = useState(null)
  const [erro, setErro] = useState(null)
  const [aberta, setAberta] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'propostas'), orderBy('criadoEm', 'desc')))
        setLista(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (ex) {
        setErro(ex.code === 'permission-denied'
          ? 'Sem permissão para ler propostas. Publique as regras do Firestore atualizadas.'
          : ex.message)
        setLista([])
      }
    })()
  }, [])

  const abrirPDF = (p) => {
    const html = gerarPropostaHTML({
      cliente: p.clienteNome, email: p.clienteEmail, feira: p.feira,
      modelo: p.modeloNome, itens: p.itens, total: p.total, imagem: null,
    })
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div className="fade-up" style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 27, marginBottom: 6 }}>
          <span className="grad-text">Propostas</span> recebidas
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          O que cada expositor personalizou e gravou.
        </p>
      </div>

      {lista === null && (
        <div className="card card-pad row"><span className="spinner" /><span className="muted">Carregando…</span></div>
      )}

      {erro && (
        <div className="card card-pad" style={{ borderColor: 'rgba(244,63,94,.35)' }}>
          <div style={{ color: '#fda4af', fontWeight: 600, marginBottom: 4 }}>Não foi possível carregar</div>
          <div className="muted" style={{ fontSize: 13 }}>{erro}</div>
        </div>
      )}

      {lista?.length === 0 && !erro && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 34, marginBottom: 10, opacity: .5 }}>📄</div>
          <h3 style={{ fontSize: 16, marginBottom: 6 }}>Nenhuma proposta ainda</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            Assim que um expositor gravar a personalização, ela aparece aqui.
          </p>
        </div>
      )}

      <div className="col" style={{ gap: 12 }}>
        {lista?.map((p, i) => {
          const open = aberta === p.id
          return (
            <div key={p.id} className="card card-pad fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="row" style={{ justifyContent: 'space-between', gap: 14, cursor: 'pointer' }}
                onClick={() => setAberta(open ? null : p.id)}>
                <div className="col" style={{ gap: 4, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15 }}>{p.clienteNome}</h3>
                  <div className="dim" style={{ fontSize: 12.5 }}>
                    {p.feira ? `${p.feira} · ` : ''}{p.modeloNome} · {data(p.criadoEm)}
                  </div>
                </div>
                <div className="row" style={{ gap: 10, flex: 'none' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--brand-green)' }}>
                    {fmtBRL(p.total)}
                  </span>
                  <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); abrirPDF(p) }}>PDF</button>
                </div>
              </div>

              {open && (
                <>
                  <div className="hr" />
                  <div className="col" style={{ gap: 6 }}>
                    {(p.itens || []).map((it) => (
                      <div key={it.id} className="row" style={{ justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                        <span className="muted">
                          {it.nome} <span className="dim">· {it.unidade === 'm2' ? fmtM2(it.quantidade) : '1 un.'}</span>
                        </span>
                        <span className="mono">{fmtBRL(it.total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="dim" style={{ fontSize: 11.5, marginTop: 10 }}>{p.clienteEmail}</div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
