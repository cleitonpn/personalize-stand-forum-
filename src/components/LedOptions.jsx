import { useStand } from '../store/StandStore.jsx'
import { PRECOS, fmtBRL } from '../data/catalogo.js'

const OPCOES = [
  { id: 'nenhum', nome: 'Sem painel de LED', preco: 0 },
  { id: 'coluna1', nome: '1 coluna frontal', preco: PRECOS.led.coluna1 },
  { id: 'colunas2', nome: '2 colunas frontais', preco: PRECOS.led.colunas2 },
  { id: 'testeira', nome: 'Testeira frontal + laterais', preco: PRECOS.led.testeira },
]

export default function LedOptions() {
  const { state, dispatch } = useStand()
  return (
    <div className="led-opts">
      {OPCOES.map((o) => (
        <button key={o.id} className={`led-opt ${state.led === o.id ? 'sel' : ''}`}
          onClick={() => dispatch({ type: 'SET_LED', modo: o.id })}>
          <span className="led-radio" />
          <span className="led-nome">{o.nome}</span>
          <span className="led-preco">{o.preco ? `+ ${fmtBRL(o.preco)}` : '—'}</span>
        </button>
      ))}
    </div>
  )
}
