import { useState } from 'react'
import { updatePassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { useAuth } from '../store/AuthContext.jsx'

/** Minha conta — vale para admin e para expositor. */
export default function Conta() {
  const { user, perfil, ehAdmin, sair } = useAuth()
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [msg, setMsg] = useState(null)
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const trocar = async (e) => {
    e.preventDefault()
    setMsg(null); setErro(null)
    if (senha !== conf) { setErro('As duas senhas precisam ser iguais.'); return }
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return }

    setEnviando(true)
    try {
      await updatePassword(auth.currentUser, senha)
      setSenha(''); setConf('')
      setMsg('Senha alterada.')
    } catch (ex) {
      setErro(ex.code === 'auth/requires-recent-login'
        ? 'Por segurança, saia e entre de novo antes de trocar a senha.'
        : ex.message)
    } finally { setEnviando(false) }
  }

  const recuperar = async () => {
    setMsg(null); setErro(null)
    try {
      await sendPasswordResetEmail(auth, user.email)
      setMsg(`Enviamos um link de redefinição para ${user.email}.`)
    } catch (ex) { setErro(ex.message) }
  }

  const Linha = ({ rotulo, valor }) => (
    <div className="row" style={{ justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
      <span className="dim" style={{ fontSize: 12.5 }}>{rotulo}</span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right' }}>{valor || '—'}</span>
    </div>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 24px 64px' }}>
      <div className="fade-up" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, marginBottom: 6 }}>Minha <span className="grad-text">conta</span></h1>
        <p className="muted" style={{ margin: 0 }}>Seus dados de acesso.</p>
      </div>

      <div className="card card-pad fade-up" style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 6 }}>Dados</div>
        <Linha rotulo="Nome" valor={perfil?.nome} />
        <Linha rotulo="E-mail" valor={user?.email} />
        <Linha rotulo="Perfil" valor={ehAdmin ? 'Administrador' : 'Expositor'} />
        {!ehAdmin && <Linha rotulo="Feira" valor={perfil?.feira} />}
      </div>

      <form className="card card-pad fade-up" onSubmit={trocar} style={{ marginBottom: 16 }}>
        <div className="label" style={{ marginBottom: 12 }}>Trocar a senha</div>
        <div className="col" style={{ gap: 13 }}>
          <div className="field">
            <label className="label">Nova senha</label>
            <input className="input" type="password" autoComplete="new-password" required
              value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mínimo 6 caracteres" />
          </div>
          <div className="field">
            <label className="label">Repita a senha</label>
            <input className="input" type="password" autoComplete="new-password" required
              value={conf} onChange={(e) => setConf(e.target.value)} placeholder="••••••••" />
          </div>
        </div>

        {msg && (
          <div style={{ marginTop: 13, padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 12.5,
            background: 'rgba(22,224,163,.08)', border: '1px solid var(--brand-green)', color: 'var(--brand-green)' }}>{msg}</div>
        )}
        {erro && (
          <div style={{ marginTop: 13, padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 12.5,
            background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', color: '#fda4af' }}>{erro}</div>
        )}

        <div className="row" style={{ gap: 8, marginTop: 16 }}>
          <button className="btn btn-primary" type="submit" disabled={enviando} style={{ flex: 1, padding: 11 }}>
            {enviando ? <><span className="spinner" /> Salvando…</> : 'Salvar nova senha'}
          </button>
          <button className="btn" type="button" onClick={recuperar}>Receber por e-mail</button>
        </div>
      </form>

      <button className="btn btn-ghost" onClick={sair} style={{ width: '100%' }}>Sair da conta</button>
    </div>
  )
}
