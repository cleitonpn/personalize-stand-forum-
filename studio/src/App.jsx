import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Modelos from './pages/Modelos.jsx'
import Editor from './pages/Editor.jsx'
import Clientes from './pages/Clientes.jsx'
import TrocarSenha from './pages/TrocarSenha.jsx'
import Expositor from './pages/Expositor.jsx'
import Propostas from './pages/Propostas.jsx'
import Conta from './pages/Conta.jsx'

function Marca() {
  return (
    <Link to="/" className="brand">
      <div className="brand-mark">U</div>
      <div className="col">
        <span className="brand-name">Stand Studio</span>
        <span className="brand-sub">USET</span>
      </div>
    </Link>
  )
}

function Topbar() {
  const { user, perfil, sair } = useAuth()
  const { pathname } = useLocation()
  if (!user) return null
  return (
    <header className="topbar">
      <Marca />
      {perfil?.papel === 'admin' && (
        <nav className="row" style={{ gap: 4, marginLeft: 12 }}>
          <Link to="/modelos" className={`btn btn-ghost btn-sm ${pathname.startsWith('/modelos') ? 'sel' : ''}`}>Modelos</Link>
          <Link to="/expositores" className={`btn btn-ghost btn-sm ${pathname.startsWith('/expositores') ? 'sel' : ''}`}>Expositores</Link>
          <Link to="/propostas" className={`btn btn-ghost btn-sm ${pathname.startsWith('/propostas') ? 'sel' : ''}`}>Propostas</Link>
        </nav>
      )}
      <div className="spacer" />
      <span className="tag">
        <i className="tag-dot" style={{ color: perfil?.papel === 'admin' ? 'var(--brand-green)' : 'var(--text-dim)' }} />
        {perfil?.papel === 'admin' ? 'Admin' : 'Expositor'}
      </span>
      <Link to="/conta" className="btn btn-ghost btn-sm" style={{ fontWeight: 400 }}>{user.email}</Link>
      <button className="btn btn-ghost btn-sm" onClick={sair}>Sair</button>
    </header>
  )
}

function Protegida({ children, exigeAdmin }) {
  const { user, perfil, ehAdmin, carregando, recarregarPerfil } = useAuth()
  if (carregando) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div className="row"><span className="spinner" /><span className="muted">Carregando…</span></div>
      </div>
    )
  }
  if (!user) return <Navigate to="/entrar" replace />
  // senha provisória bloqueia tudo até ser trocada
  // acesso desativado pelo admin: bloqueia antes de qualquer tela
  if (perfil?.ativo === false) {
    return (
      <div className="card card-pad" style={{ maxWidth: 440, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 10, opacity: .6 }}>🔒</div>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>Acesso desativado</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          Sua conta foi desativada. Fale com a equipe da USET para reativá-la.
        </p>
      </div>
    )
  }
  if (perfil?.precisaTrocarSenha) return <TrocarSenha aoConcluir={recarregarPerfil} />
  if (exigeAdmin && !ehAdmin) {
    return (
      <div className="card card-pad" style={{ maxWidth: 460, margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Acesso restrito</h2>
        <p className="muted" style={{ margin: 0 }}>
          Esta área é do time da montadora. Sua conta está como expositor.
        </p>
      </div>
    )
  }
  return children
}

/** Cada papel entra na sua casa: admin nos modelos, expositor no estande dele. */
function Inicio() {
  const { user, ehAdmin, carregando } = useAuth()
  if (carregando) return null
  if (!user) return <Navigate to="/entrar" replace />
  return <Navigate to={ehAdmin ? '/modelos' : '/meu-estande'} replace />
}

function Rotas() {
  return (
    <div className="shell">
      <div className="ambient" />
      <Topbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/entrar" element={<Login />} />
          <Route path="/modelos" element={<Protegida exigeAdmin><Modelos /></Protegida>} />
          <Route path="/modelos/:id" element={<Protegida exigeAdmin><Editor /></Protegida>} />
          <Route path="/expositores" element={<Protegida exigeAdmin><Clientes /></Protegida>} />
          <Route path="/propostas" element={<Protegida exigeAdmin><Propostas /></Protegida>} />
          <Route path="/meu-estande" element={<Protegida><Expositor /></Protegida>} />
          <Route path="/conta" element={<Protegida><Conta /></Protegida>} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Rotas />
    </AuthProvider>
  )
}
