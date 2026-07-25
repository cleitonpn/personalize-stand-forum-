import { useStand } from '../store/StandStore.jsx'
import { CLIENTE_DEMO } from '../data/catalogo.js'

export default function Topbar({ onSair }) {
  const { dispatch } = useStand()
  return (
    <header className="topbar">
      <span className="brand-badge">FÓRUM</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Personalize seu Stand</div>
        <div className="sub">{CLIENTE_DEMO.empresa} · Opção {CLIENTE_DEMO.opcao} · {CLIENTE_DEMO.area} m² ({CLIENTE_DEMO.medidas})</div>
      </div>
      <div className="spacer" />
      <span className="pill">Projeto salvo automaticamente</span>
      <button className="btn" onClick={() => { if (confirm('Voltar à configuração original da Opção C?')) dispatch({ type: 'RESET' }) }}>
        Recomeçar
      </button>
      <button className="btn btn-ghost" onClick={onSair}>Sair</button>
    </header>
  )
}
