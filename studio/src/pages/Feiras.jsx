import { useEffect, useState } from 'react'
import { useAuth } from '../store/AuthContext.jsx'
import { executarComercial, listarComercial } from '../lib/comercial.js'
export default function Feiras() {
  const { perfil, ehAdmin } = useAuth(),
    [feiras, setFeiras] = useState([]),
    [orgs, setOrgs] = useState([]),
    [modelos, setModelos] = useState([]),
    [erro, setErro] = useState(''),
    [ocupado, setOcupado] = useState(false)
  const vazio = { nome: '', organizadoraId: '', modeloIds: [] },
    [f, setF] = useState(vazio)
  async function carregar() {
    try {
      const [fs, ms, os] = await Promise.all([
        listarComercial('feiras', perfil),
        listarComercial('modelos', perfil),
        ehAdmin
          ? listarComercial('organizadoras', perfil)
          : Promise.resolve([]),
      ])
      setFeiras(fs)
      setModelos(ms)
      setOrgs(os)
    } catch (e) {
      setErro(e.message)
    }
  }
  useEffect(() => {
    carregar()
  }, [])
  async function salvar(e) {
    e.preventDefault()
    setErro('')
    setOcupado(true)
    try {
      await executarComercial('salvarFeira', f)
      setF(vazio)
      await carregar()
    } catch (ex) {
      setErro(ex.message)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <div className="comercial-page">
      <h1>Feiras e projetos</h1>
      <p>
        {ehAdmin
          ? 'Vincule os projetos às feiras. Esse vínculo libera a consulta para a organizadora.'
          : 'Consulte as feiras e os projetos vinculados à sua organizadora.'}
      </p>
      <div className="comercial-grid" style={ehAdmin?undefined:{gridTemplateColumns:'1fr'}}>
        <section className="col">
          {feiras.map((fe) => (
            <article className="card card-pad" key={fe.id}>
              <h2>{fe.nome}</h2>
              <p>{orgs.find((o) => o.id === fe.organizadoraId)?.nome}</p>
              <ul>
                {fe.modeloIds?.map((id) => (
                  <li key={id}>
                    {modelos.find((m) => m.id === id)?.nome ||
                      'Projeto indisponível'}
                  </li>
                ))}
              </ul>
              {ehAdmin && (
                <button
                  className="btn"
                  onClick={() => setF({ ...fe, modeloIds: fe.modeloIds || [] })}
                >
                  Editar vínculos
                </button>
              )}
            </article>
          ))}
          {!feiras.length && <p>Nenhuma feira vinculada.</p>}
        </section>
        {ehAdmin && (
          <form
            className="card card-pad col"
            style={{ gap: 16 }}
            onSubmit={salvar}
          >
            <h2>{f.id ? 'Editar feira' : 'Nova feira'}</h2>
            <label>
              Nome
              <input
                required
                className="input"
                maxLength={180}
                value={f.nome}
                onChange={(e) => setF({ ...f, nome: e.target.value })}
              />
            </label>
            <label>
              Organizadora
              <select
                className="select"
                required
                disabled={!!f.id}
                value={f.organizadoraId}
                onChange={(e) => setF({ ...f, organizadoraId: e.target.value })}
              >
                <option value="">Selecione…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend>Projetos disponíveis nesta feira</legend>
              {modelos.map((m) => (
                <label
                  key={m.id}
                  style={{ display: 'block', margin: '12px 0' }}
                >
                  <input
                    type="checkbox"
                    checked={f.modeloIds.includes(m.id)}
                    onChange={(e) =>
                      setF({
                        ...f,
                        modeloIds: e.target.checked
                          ? [...f.modeloIds, m.id]
                          : f.modeloIds.filter((id) => id !== m.id),
                      })
                    }
                  />{' '}
                  {m.nome}
                </label>
              ))}
            </fieldset>
            <button className="btn btn-primary" disabled={ocupado}>
              {ocupado ? 'Salvando…' : 'Salvar feira e vínculos'}
            </button>
            {f.id && (
              <button type="button" className="btn" onClick={() => setF(vazio)}>
                Cancelar edição
              </button>
            )}
          </form>
        )}
      </div>
      {erro && <p role="alert">{erro}</p>}
    </div>
  )
}
