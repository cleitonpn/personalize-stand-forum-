import { useStand } from '../store/StandStore.jsx'
import { PRECOS, fmtBRL } from '../data/catalogo.js'

const COLUNAS = [
  { id: 'nenhum', nome: 'Sem LED nas colunas', preco: 0 },
  { id: 'coluna1', nome: '1 coluna frontal', preco: PRECOS.led.coluna1 },
  { id: 'colunas2', nome: '2 colunas frontais', preco: PRECOS.led.colunas2 },
]

export default function LedOptions() {
  const { state, dispatch } = useStand()
  return (
    <>
      <div className="wall-block-title">Colunas da frente</div>
      <div className="led-opts">
        {COLUNAS.map((o) => (
          <button key={o.id} className={`led-opt ${state.led.colunas === o.id ? 'sel' : ''}`}
            onClick={() => dispatch({ type: 'SET_LED_COLUNAS', modo: o.id })}>
            <span className="led-radio" />
            <span className="led-nome">{o.nome}</span>
            <span className="led-preco">{o.preco ? `+ ${fmtBRL(o.preco)}` : '—'}</span>
          </button>
        ))}
      </div>
      <div className="wall-block-title" style={{ marginTop: 12 }}>Testeira (pode combinar com as colunas)</div>
      <button className={`led-opt ${state.led.testeira ? 'sel' : ''}`} style={{ width: '100%' }}
        onClick={() => dispatch({ type: 'TOGGLE_LED_TESTEIRA' })}>
        <span className="led-radio" />
        <span className="led-nome">LED na testeira frontal + laterais</span>
        <span className="led-preco">+ {fmtBRL(PRECOS.led.testeira)}</span>
      </button>
    </>
  )
}
