import { useEffect, useState } from 'react'
import { useAuth } from '../store/AuthContext.jsx'
import { executarComercial, listarComercial } from '../lib/comercial.js'
import ExcluirCadastro from '../components/ExcluirCadastro.jsx'
export default function Organizadoras() {
  const { perfil } = useAuth(),
    [lista, setLista] = useState([]),
    [erro, setErro] = useState(''),
    [convite, setConvite] = useState(''),
    [ocupado, setOcupado] = useState(false)
  const [f, setF] = useState({ nome: '', email: '', cobranca: 'organizadora' })
  const [excluindo,setExcluindo] = useState(null), [aviso,setAviso] = useState('')
  const carregar = () =>
    listarComercial('organizadoras', perfil)
      .then(setLista)
      .catch((e) => setErro(e.message))
  useEffect(() => {
    carregar()
  }, [])
  async function enviar(e) {
    e.preventDefault()
    setOcupado(true)
    setErro('')
    setConvite('')
    try {
      const r = await executarComercial('cadastrarOrganizadora', f)
      setConvite(r.convite)
      setF({ nome: '', email: '', cobranca: 'organizadora' })
      await carregar()
    } catch (ex) {
      setErro(ex.message)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <div className="comercial-page">
      <h1>Organizadoras</h1>
      <p>Cadastre o acesso e defina quem recebe a personalização.</p>
      {aviso && <p role="status">{aviso}</p>}
      {excluindo && <ExcluirCadastro tipo="organizadora" id={excluindo.id} aoCancelar={()=>setExcluindo(null)} aoExcluir={async()=>{setExcluindo(null);setAviso('Organizadora e seus logins excluídos. Histórico preservado.');await carregar()}}/>}
      <div className="comercial-grid">
        <section className="col">
          {lista.map((o) => (
            <article key={o.id} className="card card-pad">
              <h2>{o.nome}</h2>
              <p>{o.email}</p>
              <p>
                {o.cobranca === 'montadora'
                  ? 'Pagamento direto à montadora'
                  : 'Proposta e negociação pela organizadora'}
              </p>
              {o.loginExcluido&&<p>Login removido. O cadastro comercial e o histórico foram preservados.</p>}
              <button className="btn btn-danger" disabled={ocupado||!!excluindo} onClick={()=>{setExcluindo(o);setAviso('');window.scrollTo({top:0,behavior:'smooth'})}}>Excluir organizadora</button>
            </article>
          ))}
          {!lista.length && <p>Nenhuma organizadora cadastrada.</p>}
        </section>
        <form
          onSubmit={enviar}
          className="card card-pad col"
          style={{ gap: 16 }}
        >
          <h2>Nova organizadora</h2>
          <label>
            Nome
            <input
              className="input"
              required
              maxLength={180}
              value={f.nome}
              onChange={(e) => setF({ ...f, nome: e.target.value })}
            />
          </label>
          <label>
            E-mail de acesso
            <input
              className="input"
              required
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
          </label>
          <label>
            Cobrança
            <select
              className="select"
              value={f.cobranca}
              onChange={(e) => setF({ ...f, cobranca: e.target.value })}
            >
              <option value="organizadora">Via organizadora (proposta)</option>
              <option value="montadora">Direto à montadora (pagamento)</option>
            </select>
          </label>
          <button className="btn btn-primary" disabled={ocupado||!!excluindo}>
            {ocupado ? 'Cadastrando…' : 'Cadastrar organizadora'}
          </button>
          {convite && (
            <div>
              <p>
                Acesso criado. E-mail aguardando integração; compartilhe o
                convite para definir a senha.
              </p>
              <button
                type="button"
                className="btn"
                onClick={() => navigator.clipboard.writeText(convite)}
              >
                Copiar convite de acesso
              </button>
            </div>
          )}
        </form>
      </div>
      {erro && <p role="alert">{erro}</p>}
    </div>
  )
}
