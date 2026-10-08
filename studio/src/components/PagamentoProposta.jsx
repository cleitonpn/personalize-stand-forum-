import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { executarComercial } from '../lib/comercial.js'
import { fmtBRL } from '../lib/glb/precos.js'
export default function PagamentoProposta({ proposta, ehAdmin }) {
  const [org, setOrg] = useState(null),
    [pagamento, setPagamento] = useState(null),
    [valor, setValor] = useState(String(proposta.total || 0)),
    [erro, setErro] = useState(''),
    [ocupado, setOcupado] = useState(false)
  async function carregar() {
    try {
      const [o, p] = await Promise.all([
        getDoc(doc(db, 'organizadoras', proposta.organizadoraId)),
        getDoc(doc(db, 'pagamentos', proposta.id)),
      ])
      setOrg(o.data())
      setPagamento(p.data() || null)
    } catch (e) {
      setErro(e.message)
    }
  }
  useEffect(() => {
    carregar()
  }, [proposta.id])
  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      await executarComercial('prepararPagamento', {
        propostaId: proposta.id,
        valorCentavos: Math.round(Number(valor) * 100),
      })
      await carregar()
    } catch (ex) {
      setErro(ex.message)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <section>
      {org?.cobranca === 'montadora' ? (
        <>
          <h4>Pagamento à montadora</h4>
          <p>
            {pagamento
              ? `Valor aprovado: ${fmtBRL(pagamento.valorCentavos / 100)} · ${['cancelada','cancelado'].includes(pagamento.status)?'cobrança cancelada; requer nova liberação pelo admin.':'aguardando integração do provedor.'}`
              : 'Valor aguardando aprovação da USET.'}
          </p>
          {ehAdmin && (
            <form
              onSubmit={salvar}
              className="row"
              style={{ gap: 12, flexWrap: 'wrap' }}
            >
              <label>
                Valor aprovado (R$)
                <input
                  className="input"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </label>
              <button className="btn" disabled={ocupado}>
                Aprovar valor e preparar pagamento
              </button>
            </form>
          )}
          <p className="muted">
            Nenhuma cobrança será emitida até a integração do provedor.
          </p>
        </>
      ) : (
        org && (
          <p>
            A organizadora recebe esta proposta e entra em contato com o cliente
            para negociar.
          </p>
        )
      )}
      {erro && <p role="alert">{erro}</p>}
    </section>
  )
}
