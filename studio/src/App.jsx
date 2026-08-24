import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext.jsx'
import Login from './pages/Login.jsx'
import Modelos from './pages/Modelos.jsx'
import Editor from './pages/Editor.jsx'

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
      <nav className="row" style={{ gap: 4, marginLeft: 12 }}>
        <Link to="/modelos" className={`btn btn-ghost btn-sm ${pathname.startsWith('/modelos') ? 'sel' : ''}`}>Modelos</Link>
      </nav>
      <div className="spacer" />
      <span className="tag">
        <i className="tag-dot" style={{ color: perfil?.papel === 'admin' ? 'var(--brand-green)' : 'var(--text-dim)' }} />
        {perfil?.papel === 'admin' ? 'Admin' : 'Expositor'}
      </span>
      <span className="dim" style={{ fontSize: 12.5 }}>{user.email}</span>
      <button className="btn btn-ghost btn-sm" onClick={sair}>Sair</button>
    </header>
  )
}

function Protegida({ children, exigeAdmin }) {
  const { user, ehAdmin, carregando } = useAuth()
  if (carregando) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div className="row"><span className="spinner" /><span className="muted">Carregando…</span></div>
      </div>
    )
  }
  if (!user) return <Navigate to="/entrar" replace />
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
          <Route path="*" element={<Navigate to="/modelos" replace />} />
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
