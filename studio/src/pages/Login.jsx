import { useState } from 'react'
import { Navigate,Link } from 'react-router-dom'
import { destinoAposLogin } from '../lib/acesso.js'
import ErroPerfil from '../components/ErroPerfil.jsx'
import LogoUset from '../components/LogoUset.jsx'
import { useAuth } from '../store/AuthContext.jsx'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase.js'

const MENSAGENS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um instante e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com o servidor. Verifique sua internet.',
}

export default function Login() {
  const acesso=useAuth()
  const { user, entrar,carregando,erroPerfil,perfil } = acesso
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso,setAviso]=useState('')

  if(carregando)return <div className="login-carregando" role="status">Preparando seu acesso…</div>
  if(user&&(erroPerfil||!perfil))return <ErroPerfil/>
  if (user) return <Navigate to={destinoAposLogin(acesso)} replace />

  const submeter = async (e) => {
    e.preventDefault()
    setErro(null); setEnviando(true)
    try {
      await entrar(email.trim(), senha)
    } catch (ex) {
      setErro(MENSAGENS[ex.code] || 'Não foi possível entrar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="ambient-host" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 24 }}>
      <div className="ambient" />
      <div className="fade-up" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400 }}>
        <Link className="btn btn-ghost btn-sm" to="/">← Conheça o USET Studio</Link>
        <Link to="/" className="uset-assinatura" style={{ justifyContent: 'center', marginBottom: 26 }} aria-label="USET Studio — início"><LogoUset/><span>STUDIO</span></Link>

        <div className="card card-pad">
          <h1 style={{ fontSize: 21, marginBottom: 6 }}>
            Entre no <span className="grad-text">Studio</span>
          </h1>
          <p className="muted" style={{ marginTop: 0, marginBottom: 22, fontSize: 13.5 }}>
            Entre para deixar seu estande com a identidade da sua empresa.
          </p>

          <form onSubmit={submeter} className="col" style={{ gap: 15 }}>
            <div className="field">
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" className="input" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@uset.com.br" />
            </div>
            <div className="field">
              <label className="label" htmlFor="senha">Senha</label>
              <input id="senha" className="input" type="password" autoComplete="current-password" required
                value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
            </div>

            {erro && (
              <div style={{
                padding: '10px 12px', borderRadius: 'var(--r)', fontSize: 13,
                background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', color: '#fda4af',
              }}>{erro}</div>
            )}

            <button className="btn btn-primary" type="submit" disabled={enviando} style={{ marginTop: 4, padding: '12px 16px' }}>
              {enviando ? <><span className="spinner" /> Entrando…</> : 'Entrar'}
            </button>
          </form>
          <button className="btn btn-ghost" disabled={!email.trim()||enviando} onClick={async()=>{setEnviando(true);setErro('');try{await sendPasswordResetEmail(auth,email.trim());setAviso('Se este e-mail possui acesso, você receberá um link para definir uma nova senha.')}catch(ex){setErro(MENSAGENS[ex.code]||'Não foi possível solicitar a recuperação.')}finally{setEnviando(false)}}}>Esqueci minha senha</button>
          {aviso&&<p role="status">{aviso}</p>}
        </div>

        <p className="dim" style={{ textAlign: 'center', fontSize: 12, marginTop: 18 }}>
          Acesso concedido pelo time da montadora.
        </p>
      </div>
    </div>
  )
}
