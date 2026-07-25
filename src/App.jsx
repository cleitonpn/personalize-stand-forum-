import { useState } from 'react'
import { StandProvider } from './store/StandStore.jsx'
import Login from './components/Login.jsx'
import Topbar from './components/Topbar.jsx'
import Sidebar from './components/Sidebar.jsx'
import ClientWizard from './components/ClientWizard.jsx'
import Scene3D from './components/Scene3D.jsx'
import PlantaBaixa from './components/PlantaBaixa.jsx'
import Resumo from './components/Resumo.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

export default function App() {
  const [logado, setLogado] = useState(() => sessionStorage.getItem('psf.auth') === '1')
  const [modo, setModo] = useState(() => localStorage.getItem('psf.modo') || 'cliente')

  const entrar = () => { sessionStorage.setItem('psf.auth', '1'); setLogado(true) }
  const sair = () => { sessionStorage.removeItem('psf.auth'); setLogado(false) }
  const trocarModo = (m) => { localStorage.setItem('psf.modo', m); setModo(m) }

  if (!logado) return <Login onEntrar={entrar} />

  return (
    <StandProvider>
      <div className="app">
        <Topbar onSair={sair} modo={modo} onModo={trocarModo} />
        <div className="layout">
          <aside className="col-config">
            {modo === 'cliente' ? <ClientWizard /> : <Sidebar />}
          </aside>
          <main className="col-canvas">
            <section className="view3d">
              <span className="view-label">Vista do projeto · 3D</span>
              <ErrorBoundary rotulo="Vista 3D"><Scene3D /></ErrorBoundary>
            </section>
            <section className="viewplan">
              <span className="view-label">Planta baixa · 40 m²</span>
              <ErrorBoundary rotulo="Planta baixa"><PlantaBaixa /></ErrorBoundary>
            </section>
          </main>
          <aside className="col-resumo"><Resumo /></aside>
        </div>
      </div>
    </StandProvider>
  )
}
