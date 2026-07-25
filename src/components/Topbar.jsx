import { useState } from 'react'
import { useStand, codificarProjeto } from '../store/StandStore.jsx'
import { CLIENTE_DEMO } from '../data/catalogo.js'

export default function Topbar({ onSair, modo, onModo }) {
  const { state, dispatch } = useStand()
  const [copiado, setCopiado] = useState(false)

  const compartilhar = async () => {
    const url = `${location.origin}${location.pathname}#p=${codificarProjeto(state)}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      prompt('Copie o link do seu projeto:', url)
    }
  }

  return (
    <header className="topbar">
      <span className="brand-badge">FÓRUM</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>Personalize seu Stand</div>
        <div className="sub">{CLIENTE_DEMO.empresa} · Opção {CLIENTE_DEMO.opcao} · {CLIENTE_DEMO.area} m² ({CLIENTE_DEMO.medidas})</div>
      </div>
      <div className="spacer" />
      <div className="mode-switch">
        <button className={modo === 'cliente' ? 'active' : ''} onClick={() => onModo('cliente')}>Modo cliente</button>
        <button className={modo === 'completo' ? 'active' : ''} onClick={() => onModo('completo')}>Modo completo</button>
      </div>
      <button className="btn" onClick={compartilhar}>{copiado ? '✓ Link copiado!' : '🔗 Copiar link'}</button>
      <button className="btn" onClick={() => { if (confirm('Voltar à configuração original da Opção C?')) dispatch({ type: 'RESET' }) }}>
        Recomeçar
      </button>
      <button className="btn btn-ghost" onClick={onSair}>Sair</button>
    </header>
  )
}
