import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, deleteDoc, doc } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../lib/firebase.js'
import { useAuth } from '../store/AuthContext.jsx'

const fmtMB = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`

function CartaoUpload({ aoConcluir }) {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [arquivo, setArquivo] = useState(null)
  const [nome, setNome] = useState('')
  const [feira, setFeira] = useState('')
  const [progresso, setProgresso] = useState(null)
  const [erro, setErro] = useState(null)

  const escolher = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.glb')) {
      setErro('O arquivo precisa ser .glb (glTF binário).'); return
    }
    setErro(null); setArquivo(f)
    if (!nome) setNome(f.name.replace(/\.glb$/i, '').replace(/[_-]+/g, ' '))
  }

  const enviar = async () => {
    if (!arquivo || !nome.trim()) return
    setErro(null); setProgresso(0)
    const caminho = `modelos/${Date.now()}_${arquivo.name.replace(/[^\w.-]/g, '_')}`
    const tarefa = uploadBytesResumable(ref(storage, caminho), arquivo, { contentType: 'model/gltf-binary' })

    tarefa.on('state_changed',
      (s) => setProgresso(s.bytesTransferred / s.totalBytes),
      (ex) => {
        setProgresso(null)
        setErro(ex.code === 'storage/unauthorized'
          ? 'Sem permissão para enviar. Confira as regras do Storage no Firebase.'
          : `Falha no envio: ${ex.message}`)
      },
      async () => {
        try {
          const url = await getDownloadURL(tarefa.snapshot.ref)
          await addDoc(collection(db, 'modelos'), {
            nome: nome.trim(),
            feira: feira.trim() || null,
            arquivo: { caminho, url, bytes: arquivo.size, nomeOriginal: arquivo.name },
            status: 'novo',        // novo → mapeado → publicado
            papeis: {},            // material → papel
            recorte: null,         // área do estande
            criadoEm: serverTimestamp(),
            criadoPor: user?.uid || null,
          })
          setArquivo(null); setNome(''); setFeira(''); setProgresso(null)
          if (fileRef.current) fileRef.current.value = ''
          aoConcluir?.()
        } catch (ex) {
          setProgresso(null); setErro(`Enviado, mas falhou ao registrar: ${ex.message}`)
        }
      })
  }

  const enviando = progresso !== null

  return (
    <div className="card card-pad fade-up">
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>Novo modelo</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18, fontSize: 13 }}>
        Envie o projeto em <b>.glb</b>. Depois você identifica as superfícies que o expositor pode personalizar.
      </p>

      <div
        onClick={() => !enviando && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (!enviando) escolher({ target: { files: e.dataTransfer.files } }) }}
        style={{
          border: `1.5px dashed ${arquivo ? 'var(--brand-green)' : 'var(--line-lit)'}`,
          borderRadius: 'var(--r-lg)', padding: '26px 20px', textAlign: 'center',
          cursor: enviando ? 'default' : 'pointer', transition: 'all var(--t) var(--ease)',
          background: arquivo ? 'rgba(22,224,163,.05)' : 'var(--bg-deep)',
        }}
      >
        <div style={{ fontSize: 26, marginBottom: 8, opacity: .85 }}>{arquivo ? '📦' : '⬆'}</div>
        {arquivo ? (
          <>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{arquivo.name}</div>
            <div className="dim" style={{ fontSize: 12 }}>{fmtMB(arquivo.size)}</div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>Arraste o .glb aqui</div>
            <div className="dim" style={{ fontSize: 12 }}>ou clique para escolher</div>
          </>
        )}
        <input ref={fileRef} type="file" accept=".glb,model/gltf-binary" hidden onChange={escolher} />
      </div>

      <div className="col" style={{ gap: 13, marginTop: 16 }}>
        <div className="field">
          <label className="label">Nome do modelo</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Eletrolar 45m²" disabled={enviando} />
        </div>
        <div className="field">
          <label className="label">Feira <span style={{ textTransform: 'none', fontWeight: 400 }}>(opcional)</span></label>
          <input className="input" value={feira} onChange={(e) => setFeira(e.target.value)}
            placeholder="Eletrolar Show" disabled={enviando} />
        </div>
      </div>

      {erro && (
        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 13,
          background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', color: '#fda4af' }}>{erro}</div>
      )}

      {enviando && (
        <div style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 7, fontSize: 12.5 }}>
            <span className="muted">Enviando…</span>
            <span className="mono">{Math.round(progresso * 100)}%</span>
          </div>
          <div className="progress"><i style={{ width: `${progresso * 100}%` }} /></div>
        </div>
      )}

      <button className="btn btn-primary" style={{ width: '100%', marginTop: 18, padding: '12px' }}
        disabled={!arquivo || !nome.trim() || enviando} onClick={enviar}>
        {enviando ? <><span className="spinner" /> Enviando…</> : 'Enviar e analisar'}
      </button>
    </div>
  )
}

const STATUS = {
  novo:      { rotulo: 'Aguardando mapeamento', cor: 'var(--warn)' },
  mapeado:   { rotulo: 'Mapeado',               cor: 'var(--brand-green)' },
  publicado: { rotulo: 'Publicado',             cor: 'var(--brand-blue-lit)' },
}

export default function Modelos() {
  const [modelos, setModelos] = useState(null)
  const [erro, setErro] = useState(null)
  const navigate = useNavigate()

  const carregar = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'modelos'), orderBy('criadoEm', 'desc')))
      setModelos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (ex) {
      setErro(ex.code === 'permission-denied'
        ? 'Sem permissão para ler os modelos. Publique as regras do Firestore.'
        : ex.message)
      setModelos([])
    }
  }
  useEffect(() => { carregar() }, [])

  const excluir = async (m) => {
    if (!confirm(`Excluir o modelo "${m.nome}"? O arquivo .glb também será removido.`)) return
    try {
      if (m.arquivo?.caminho) await deleteObject(ref(storage, m.arquivo.caminho)).catch(() => {})
      await deleteDoc(doc(db, 'modelos', m.id))
      carregar()
    } catch (ex) { alert(`Não foi possível excluir: ${ex.message}`) }
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div className="fade-up" style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 27, marginBottom: 6 }}>
          Modelos de <span className="grad-text">estande</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Cada projeto .glb vira um modelo configurável para o expositor.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 22, alignItems: 'start' }}>
        <div className="col" style={{ gap: 12 }}>
          {modelos === null && (
            <div className="card card-pad row"><span className="spinner" /><span className="muted">Carregando modelos…</span></div>
          )}

          {erro && (
            <div className="card card-pad" style={{ borderColor: 'rgba(244,63,94,.35)' }}>
              <div style={{ color: '#fda4af', fontWeight: 600, marginBottom: 4 }}>Não foi possível carregar</div>
              <div className="muted" style={{ fontSize: 13 }}>{erro}</div>
            </div>
          )}

          {modelos?.length === 0 && !erro && (
            <div className="card card-pad" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 34, marginBottom: 10, opacity: .5 }}>📐</div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Nenhum modelo ainda</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
                Envie o primeiro projeto .glb no painel ao lado.
              </p>
            </div>
          )}

          {modelos?.map((m, i) => {
            const st = STATUS[m.status] || STATUS.novo
            const mapeados = Object.keys(m.papeis || {}).length
            return (
              <div key={m.id} className="card card-lit card-pad fade-up"
                style={{ animationDelay: `${i * 45}ms`, cursor: 'pointer' }}
                onClick={() => navigate(`/modelos/${m.id}`)}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 14 }}>
                  <div className="col" style={{ gap: 5, minWidth: 0 }}>
                    <div className="row" style={{ gap: 9 }}>
                      <h3 style={{ fontSize: 15.5 }}>{m.nome}</h3>
                      <span className="tag"><i className="tag-dot" style={{ color: st.cor }} />{st.rotulo}</span>
                    </div>
                    <div className="dim" style={{ fontSize: 12.5 }}>
                      {m.feira ? <>{m.feira} · </> : null}
                      {m.arquivo?.bytes ? fmtMB(m.arquivo.bytes) : '—'}
                      {mapeados > 0 && <> · {mapeados} {mapeados === 1 ? 'material mapeado' : 'materiais mapeados'}</>}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 7, flex: 'none' }}>
                    <Link className="btn btn-sm" to={`/modelos/${m.id}`} onClick={(e) => e.stopPropagation()}>Abrir</Link>
                    <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); excluir(m) }}>×</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <CartaoUpload aoConcluir={carregar} />
      </div>
    </div>
  )
}
