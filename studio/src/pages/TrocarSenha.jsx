import { useState } from 'react'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase.js'
import { useAuth } from '../store/AuthContext.jsx'

/**
 * Troca obrigatória no primeiro acesso.
 * O expositor entra com a senha provisória que o admin passou; enquanto
 * precisaTrocarSenha estiver ligado, esta tela é a única que ele alcança.
 */
export default function TrocarSenha({ aoConcluir }) {
  const { user, sair } = useAuth()
  const [senha, setSenha] = useState('')
  const [conf, setConf] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const submeter = async (e) => {
    e.preventDefault()
    if (senha !== conf) { setErro('As duas senhas precisam ser iguais.'); return }
    if (senha.length < 6) { setErro('A senha precisa ter pelo menos 6 caracteres.'); return }

    setErro(null); setEnviando(true)
    try {
      await updatePassword(auth.currentUser, senha)
      await updateDoc(doc(db, 'usuarios', user.uid), { precisaTrocarSenha: false })
      aoConcluir?.()
    } catch (ex) {
      setErro(ex.code === 'auth/requires-recent-login'
        ? 'Por segurança, entre de novo com a senha provisória e refaça a troca.'
        : ex.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '80vh', padding: 24 }}>
      <div className="fade-up" style={{ width: '100%', maxWidth: 400 }}>
        <div className="card card-pad">
          <h1 style={{ fontSize: 20, marginBottom: 6 }}>Crie sua <span className="grad-text">senha</span></h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 20, fontSize: 13.5 }}>
            Você entrou com uma senha provisória. Defina uma senha sua para continuar.
          </p>

          <form onSubmit={submeter} className="col" style={{ gap: 14 }}>
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

            {erro && (
              <div style={{ padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 13,
                background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', color: '#fda4af' }}>{erro}</div>
            )}

            <button className="btn btn-primary" type="submit" disabled={enviando} style={{ padding: 12 }}>
              {enviando ? <><span className="spinner" /> Salvando…</> : 'Salvar e continuar'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={sair}>Sair</button>
          </form>
        </div>
      </div>
    </div>
  )
}
