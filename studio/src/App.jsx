import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './store/AuthContext.jsx'
import Notificacoes, {SinoNotificacoes} from './pages/Notificacoes.jsx'
import Login from './pages/Login.jsx'
import LogoUset from './components/LogoUset.jsx'
import Modelos from './pages/Modelos.jsx'
import Usuarios from './pages/Usuarios.jsx'
import Editor from './pages/Editor.jsx'
import Clientes from './pages/Clientes.jsx'
import TrocarSenha from './pages/TrocarSenha.jsx'
import Expositor from './pages/Expositor.jsx'
import Propostas from './pages/Propostas.jsx'
import Conta from './pages/Conta.jsx'
import Acabamentos from './pages/Acabamentos.jsx'
import { NapasProvider } from './store/NapasContext.jsx'
import Apresentacao from './pages/Apresentacao.jsx'
import ErroPerfil from './components/ErroPerfil.jsx'
import './styles/cliente.css'
import './styles/admin.css'
import Precos from './pages/Precos.jsx'
import BibliotecaMobiliario from './pages/BibliotecaMobiliario.jsx'
import AnaliseUso from './pages/AnaliseUso.jsx'
import Organizadoras from './pages/Organizadoras.jsx'
import Feiras from './pages/Feiras.jsx'
import MetricasComerciais from './pages/MetricasComerciais.jsx'
import ProjetoConsulta from './pages/ProjetoConsulta.jsx'
import CadastroInicial from './pages/CadastroInicial.jsx'
import Artes from './pages/Artes.jsx'
import Atendimento from './pages/Atendimento.jsx'
import { ChatFlutuante, ChatAtalho } from './components/ChatCliente.jsx'
import './styles/producao.css'
import './styles/operacao.css'
import Producao from './pages/Producao.jsx'
import EquipesOperacionais from './pages/EquipesOperacionais.jsx'
import {ehOperacional,ehGestor,PAPEIS_OPERACIONAIS} from './lib/operacao.js'

function Marca() {
  return <Link to="/" className="uset-assinatura" aria-label="USET Studio — início"><LogoUset/><span>STUDIO</span></Link>
}

function Topbar() {
  const { user, perfil, sair } = useAuth()
  const { pathname } = useLocation()
  if (!user || pathname==='/' || pathname==='/entrar') return null
  return (
    <><header className="topbar">
      <Marca />
      <div className="spacer" />
      <span className="tag">
        <i className="tag-dot" style={{ color: perfil?.papel === 'admin' ? 'var(--brand-green)' : 'var(--text-dim)' }} />
        {PAPEIS_OPERACIONAIS[perfil?.papel] || (perfil?.papel === 'admin' ? 'Admin' : perfil?.papel === 'organizadora' ? 'Organizadora' : 'Expositor')}
      </span>
      <Link to="/conta" className="btn btn-ghost btn-sm" style={{ fontWeight: 400 }}>{user.email}</Link>
      <SinoNotificacoes/><button className="btn btn-ghost btn-sm" onClick={sair}>Sair</button>
    </header>
    {ehOperacional(perfil)&&<nav className="admin-nav" aria-label="Operação"><Link to="/producao">Produção</Link><Link to="/equipes">Equipes e documentos</Link>{perfil.papel==='analista_cv'&&<Link to="/artes">Conferência de artes</Link>}</nav>}
    {perfil?.papel==='expositor'&&<nav className="cliente-nav" aria-label="Seu projeto"><Link to="/meu-estande" aria-current={pathname==='/meu-estande'?'page':undefined}>Personalizar estande</Link><Link to="/artes" aria-current={pathname.startsWith('/artes')?'page':undefined}>Artes e aprovação</Link><ChatAtalho/></nav>}
    {['admin','organizadora'].includes(perfil?.papel)&&<nav className="admin-nav" aria-label="Administração">{(perfil.papel==='admin'?[['/usuarios','Usuários e acessos'],['/producao','Produção'],['/equipes','Equipes'],['/modelos','Projetos'],['/organizadoras','Organizadoras'],['/feiras','Feiras'],['/precos','Preços'],['/mobiliario','Mobiliário'],['/expositores','Expositores'],['/propostas','Propostas'],['/artes','Artes'],['/atendimento','Atendimento'],['/metricas','Métricas'],['/acabamentos','Acabamentos'],['/analise','Análise de uso']]:[['/modelos','Projetos'],['/feiras','Feiras'],['/expositores','Expositores'],['/propostas','Propostas'],['/artes','Artes'],['/atendimento','Atendimento'],['/metricas','Métricas']]).map(([url,nome])=><Link key={url} to={url} aria-current={pathname.startsWith(url)?'page':undefined}>{nome}</Link>)}</nav>}</>
  )
}

function Protegida({ children, exigeAdmin, equipe, expositor,operacional,gestor }) {
  const { user, perfil, ehAdmin, carregando, recarregarPerfil,erroPerfil } = useAuth()
  if (carregando) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
        <div className="row"><span className="spinner" /><span className="muted">Carregando…</span></div>
      </div>
    )
  }
  if (!user) return <Navigate to="/entrar" replace />
  if(erroPerfil||!perfil)return <ErroPerfil/>
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
  if (perfil.papel === 'expositor' && perfil.cadastroCompleto === false) return <CadastroInicial />
  if ((exigeAdmin && !ehAdmin) || (operacional&&!ehAdmin&&!ehOperacional(perfil)) || (gestor&&!ehGestor(perfil)) || (equipe && !['admin','organizadora'].includes(perfil.papel)) || (expositor && perfil.papel !== 'expositor')) {
    return (
      <div className="card card-pad" style={{ maxWidth: 460, margin: '80px auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>Acesso restrito</h2>
        <p className="muted" style={{ margin: 0 }}>
          Esta área não está disponível para o seu tipo de acesso.
        </p>
      </div>
    )
  }
  return children
}

/** Cada papel entra na sua casa: admin nos modelos, expositor no estande dele. */
function Inicio() {
  const { user, ehAdmin, carregando,erroPerfil,perfil } = useAuth()
  if (carregando) return null
  if (!user) return <Navigate to="/" replace />
  if(erroPerfil||!perfil)return <ErroPerfil/>
  return <Navigate to={ehOperacional(perfil)?'/producao':ehAdmin || perfil.papel === 'organizadora' ? '/modelos' : '/meu-estande'} replace />
}

function Rotas() {
  const {user,ehAdmin,perfil}=useAuth()
  const {pathname}=useLocation()
  return (
    <div className={`shell ${pathname==='/entrar'||user?'tema-cliente':''} ${user&&(ehAdmin||perfil?.papel==='organizadora'||ehOperacional(perfil))?'tema-admin':''}`}>
      <div className="ambient" />
      <Topbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/usuarios" element={<Protegida exigeAdmin><Usuarios /></Protegida>} />
          <Route path="/producao" element={<Protegida operacional><Producao /></Protegida>} />
          <Route path="/producao/:id" element={<Protegida operacional><Producao /></Protegida>} />
          <Route path="/equipes" element={<Protegida operacional><EquipesOperacionais /></Protegida>} />
          <Route path="/" element={<Apresentacao />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/modelos" element={<Protegida equipe><Modelos /></Protegida>} />
          <Route path="/modelos/:id" element={<Protegida equipe>{ehAdmin?<Editor />:<ProjetoConsulta />}</Protegida>} />
          <Route path="/expositores" element={<Protegida equipe><Clientes /></Protegida>} />
          <Route path="/propostas" element={<Protegida equipe><Propostas /></Protegida>} />
          <Route path="/artes" element={<Protegida><Artes /></Protegida>} />
          <Route path="/artes/:id" element={<Protegida><Artes /></Protegida>} />
          <Route path="/atendimento" element={<Protegida equipe><Atendimento /></Protegida>} />
          <Route path="/organizadoras" element={<Protegida exigeAdmin><Organizadoras /></Protegida>} />
          <Route path="/feiras" element={<Protegida equipe><Feiras /></Protegida>} />
          <Route path="/metricas" element={<Protegida equipe><MetricasComerciais /></Protegida>} />
          <Route path="/acabamentos" element={<Protegida exigeAdmin><Acabamentos /></Protegida>} />
          <Route path="/precos" element={<Protegida exigeAdmin><Precos /></Protegida>} />
          <Route path="/mobiliario" element={<Protegida exigeAdmin><BibliotecaMobiliario /></Protegida>} />
          <Route path="/analise" element={<Protegida exigeAdmin><AnaliseUso /></Protegida>} />
          <Route path="/meu-estande" element={<Protegida expositor><Expositor /></Protegida>} />
          <Route path="/notificacoes" element={<Protegida><Notificacoes /></Protegida>} />
          <Route path="/conta" element={<Protegida><Conta /></Protegida>} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </main>
      <ChatFlutuante />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <NapasProvider><Rotas /></NapasProvider>
    </AuthProvider>
  )
}
