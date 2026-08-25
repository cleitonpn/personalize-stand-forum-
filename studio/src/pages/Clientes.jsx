import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../store/AuthContext.jsx'
import { criarExpositor, MENSAGENS_CADASTRO } from '../lib/criarUsuario.js'
import GerenciarExpositor from '../components/GerenciarExpositor.jsx'

const senhaSugerida = () => `uset${Math.floor(1000 + Math.random() * 9000)}`

function Formulario({ modelos, aoCriar }) {
  const { user } = useAuth()
  const [f, setF] = useState({ nome: '', email: '', senha: senhaSugerida(), feira: '', modeloId: '' })
  const [erro, setErro] = useState(null)
  const [ok, setOk] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const campo = (k) => ({ value: f[k], onChange: (e) => setF((v) => ({ ...v, [k]: e.target.value })) })

  const enviar = async (e) => {
    e.preventDefault()
    setErro(null); setOk(null); setEnviando(true)
    try {
      await criarExpositor({ ...f, criadoPor: user?.uid })
      setOk({ email: f.email, senha: f.senha })
      setF({ nome: '', email: '', senha: senhaSugerida(), feira: '', modeloId: '' })
      aoCriar?.()
    } catch (ex) {
      setErro(MENSAGENS_CADASTRO[ex.code] || ex.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="card card-pad fade-up" onSubmit={enviar}>
      <h2 style={{ fontSize: 16, marginBottom: 4 }}>Novo expositor</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 18, fontSize: 13 }}>
        Ele recebe uma senha provisória e troca no primeiro acesso.
      </p>

      <div className="col" style={{ gap: 13 }}>
        <div className="field">
          <label className="label">Nome</label>
          <input className="input" required placeholder="Alfa Móveis" {...campo('nome')} />
        </div>
        <div className="field">
          <label className="label">E-mail</label>
          <input className="input" type="email" required placeholder="contato@alfamoveis.com.br" {...campo('email')} />
        </div>
        <div className="field">
          <label className="label">Senha provisória</label>
          <div className="row" style={{ gap: 7 }}>
            <input className="input" required minLength={6} {...campo('senha')} />
            <button type="button" className="btn btn-sm" style={{ flex: 'none' }}
              onClick={() => setF((v) => ({ ...v, senha: senhaSugerida() }))}>Gerar</button>
          </div>
        </div>
        <div className="field">
          <label className="label">Feira</label>
          <input className="input" placeholder="Eletrolar Show" {...campo('feira')} />
        </div>
        <div className="field">
          <label className="label">Projeto do estande</label>
          <select className="select" required {...campo('modeloId')}>
            <option value="">Escolha o modelo…</option>
            {modelos.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}{m.feira ? ` — ${m.feira}` : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {erro && (
        <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 13,
          background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', color: '#fda4af' }}>{erro}</div>
      )}

      {ok && (
        <div style={{ marginTop: 14, padding: '12px 13px', borderRadius: 'var(--r)',
          background: 'rgba(22,224,163,.08)', border: '1px solid var(--brand-green)' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--brand-green)' }}>
            Acesso criado
          </div>
          <div className="mono" style={{ fontSize: 12, lineHeight: 1.7 }}>
            {ok.email}<br />senha: <b>{ok.senha}</b>
          </div>
          <button type="button" className="btn btn-sm" style={{ marginTop: 10, width: '100%' }}
            onClick={() => navigator.clipboard?.writeText(`Acesso ao Stand Studio\nE-mail: ${ok.email}\nSenha provisória: ${ok.senha}`)}>
            Copiar dados de acesso
          </button>
        </div>
      )}

      <button className="btn btn-primary" type="submit" disabled={enviando}
        style={{ width: '100%', marginTop: 18, padding: 12 }}>
        {enviando ? <><span className="spinner" /> Criando…</> : 'Criar acesso'}
      </button>
    </form>
  )
}

export default function Clientes() {
  const [clientes, setClientes] = useState(null)
  const [modelos, setModelos] = useState([])
  const [erro, setErro] = useState(null)
  const [gerenciando, setGerenciando] = useState(null)

  const carregar = async () => {
    try {
      const [uSnap, mSnap] = await Promise.all([
        getDocs(query(collection(db, 'usuarios'), where('papel', '==', 'expositor'))),
        getDocs(query(collection(db, 'modelos'), orderBy('criadoEm', 'desc'))),
      ])
      setClientes(uSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setModelos(mSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } catch (ex) {
      setErro(ex.code === 'permission-denied'
        ? 'Sem permissão para listar usuários. Publique as regras do Firestore atualizadas.'
        : ex.message)
      setClientes([])
    }
  }
  useEffect(() => { carregar() }, [])

  const nomeModelo = (id) => modelos.find((m) => m.id === id)?.nome || '—'

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div className="fade-up" style={{ marginBottom: 26 }}>
        <h1 style={{ fontSize: 27, marginBottom: 6 }}>
          <span className="grad-text">Expositores</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          Cada expositor recebe acesso a um projeto de estande para personalizar.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 22, alignItems: 'start' }}>
        <div className="col" style={{ gap: 12 }}>
          {clientes === null && (
            <div className="card card-pad row"><span className="spinner" /><span className="muted">Carregando…</span></div>
          )}

          {erro && (
            <div className="card card-pad" style={{ borderColor: 'rgba(244,63,94,.35)' }}>
              <div style={{ color: '#fda4af', fontWeight: 600, marginBottom: 4 }}>Não foi possível carregar</div>
              <div className="muted" style={{ fontSize: 13 }}>{erro}</div>
            </div>
          )}

          {clientes?.length === 0 && !erro && (
            <div className="card card-pad" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 34, marginBottom: 10, opacity: .5 }}>👤</div>
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>Nenhum expositor ainda</h3>
              <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>Crie o primeiro acesso ao lado.</p>
            </div>
          )}

          {clientes?.map((c, i) => {
            const inativo = c.ativo === false
            return (
              <div key={c.id} className="card card-pad fade-up"
                style={{ animationDelay: `${i * 40}ms`, opacity: inativo ? .6 : 1 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 14 }}>
                  <div className="col" style={{ gap: 4, minWidth: 0 }}>
                    <div className="row" style={{ gap: 9, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 15 }}>{c.nome || c.email}</h3>
                      {inativo && (
                        <span className="tag" style={{ color: 'var(--danger)', borderColor: 'currentColor' }}>
                          <i className="tag-dot" />desativado
                        </span>
                      )}
                      {!inativo && c.precisaTrocarSenha && (
                        <span className="tag" style={{ color: 'var(--warn)', borderColor: 'currentColor' }}>
                          <i className="tag-dot" />senha provisória
                        </span>
                      )}
                    </div>
                    <div className="dim" style={{ fontSize: 12.5 }}>
                      {c.email}
                      {c.feira ? ` · ${c.feira}` : ''}
                      {` · ${nomeModelo(c.modeloId)}`}
                    </div>
                  </div>
                  <button className="btn btn-sm" style={{ flex: 'none' }} onClick={() => setGerenciando(c)}>
                    Gerenciar
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <Formulario modelos={modelos} aoCriar={carregar} />
      </div>

      {gerenciando && (
        <GerenciarExpositor cliente={gerenciando} modelos={modelos}
          aoMudar={carregar} aoFechar={() => setGerenciando(null)} />
      )}
    </div>
  )
}
