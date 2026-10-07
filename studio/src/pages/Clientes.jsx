import { useEffect, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../store/AuthContext.jsx'
import { executarComercial, listarComercial } from '../lib/comercial.js'
import GerenciarExpositor from '../components/GerenciarExpositor.jsx'

function Localizacao({ cliente, aoSalvar }) {
  const [valor, setValor] = useState(cliente.localizacao || ''),
    [erro, setErro] = useState(''),
    [ocupado, setOcupado] = useState(false)
  async function salvar(e) {
    e.preventDefault()
    setOcupado(true)
    setErro('')
    try {
      await updateDoc(doc(db, 'usuarios', cliente.id), {
        localizacao: valor.trim(),
        localizacaoPendente: !valor.trim(),
      })
      await aoSalvar()
    } catch (ex) {
      setErro(ex.message)
    } finally {
      setOcupado(false)
    }
  }
  return (
    <form
      className="row"
      style={{ flexWrap: 'wrap', gap: 8, marginTop: 12 }}
      onSubmit={salvar}
    >
      <label style={{ flex: 1 }}>
        Localização do estande
        <input
          className="input"
          maxLength={180}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Pavilhão, rua e número"
        />
      </label>
      <button className="btn" disabled={ocupado}>
        Salvar localização
      </button>
      {erro && <p role="alert">{erro}</p>}
    </form>
  )
}

export default function Clientes() {
  const { perfil, ehAdmin } = useAuth(),
    [clientes, setClientes] = useState([]),
    [modelos, setModelos] = useState([]),
    [feiras, setFeiras] = useState([]),
    [orgs, setOrgs] = useState([])
  const [erro, setErro] = useState(''),
    [convite, setConvite] = useState(''),
    [ocupado, setOcupado] = useState(false),
    [gerenciando, setGerenciando] = useState(null),
    [vinculando, setVinculando] = useState(null)
  const [f, setF] = useState({
      nome: '',
      email: '',
      feiraId: '',
      modeloId: '',
    }),
    [filtro, setFiltro] = useState(''),
    [v, setV] = useState({ feiraId: '', modeloId: '' })
  async function carregar() {
    try {
      const [cs, ms, fs, os] = await Promise.all([
        listarComercial('usuarios', perfil),
        listarComercial('modelos', perfil),
        listarComercial('feiras', perfil),
        ehAdmin
          ? listarComercial('organizadoras', perfil)
          : Promise.resolve([]),
      ])
      setClientes(cs.filter((c) => c.papel === 'expositor'))
      setModelos(ms)
      setFeiras(fs)
      setOrgs(os)
    } catch (e) {
      setErro(e.message)
    }
  }
  useEffect(() => {
    carregar()
  }, [])
  async function criar(e) {
    e.preventDefault()
    setOcupado(true)
    setErro('')
    setConvite('')
    try {
      const r = await executarComercial('cadastrarExpositor', f)
      setConvite(r.convite)
      setF({ ...f, nome: '', email: '' })
      await carregar()
    } catch (ex) {
      setErro(ex.message)
    } finally {
      setOcupado(false)
    }
  }
  async function vincular(e) {
    e.preventDefault()
    setOcupado(true)
    setErro('')
    try {
      await executarComercial('vincularExpositor', { uid: vinculando, ...v })
      setVinculando(null)
      await carregar()
    } catch (ex) {
      setErro(ex.message)
    } finally {
      setOcupado(false)
    }
  }
  const opcoes = (feiraId) =>
    modelos.filter((m) =>
      feiras.find((fe) => fe.id === feiraId)?.modeloIds?.includes(m.id),
    )
  const campos = (dados, setDados) => (
    <>
      <label>
        Feira e organizadora
        <select
          className="select"
          required
          value={dados.feiraId}
          onChange={(e) =>
            setDados({ ...dados, feiraId: e.target.value, modeloId: '' })
          }
        >
          <option value="">Selecione…</option>
          {feiras.map((fe) => (
            <option key={fe.id} value={fe.id}>
              {fe.nome}
              {ehAdmin
                ? ` · ${orgs.find((o) => o.id === fe.organizadoraId)?.nome || 'Organizadora'}`
                : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        Projeto
        <select
          className="select"
          required
          value={dados.modeloId}
          onChange={(e) => setDados({ ...dados, modeloId: e.target.value })}
        >
          <option value="">Selecione…</option>
          {opcoes(dados.feiraId).map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>
    </>
  )
  return (
    <div className="comercial-page">
      <h1>Expositores</h1>
      <p>
        {ehAdmin
          ? 'Cadastre a empresa e o e-mail. O responsável completa seus dados no primeiro acesso.'
          : 'Consulte os expositores da sua organizadora e complete as localizações pendentes.'}
      </p>
      <label>
        Filtrar por feira
        <select
          className="select"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        >
          <option value="">Todas</option>
          {feiras.map((fe) => (
            <option key={fe.id} value={fe.id}>
              {fe.nome}
            </option>
          ))}
        </select>
      </label>
      <div className="comercial-grid" style={ehAdmin?undefined:{gridTemplateColumns:'1fr'}}>
        <section className="col">
          {clientes
            .filter((c) => !filtro || c.feiraId === filtro)
            .map((c) => (
              <article key={c.id} className="card card-pad">
                <h2>{c.empresa || c.nome}</h2>
                <p>
                  {c.email} · {c.feira || 'Sem feira vinculada'}
                </p>
                <p>
                  {c.contatoNome || 'Cadastro de contato pendente'}
                  {c.telefone ? ` · ${c.telefone}` : ''}
                </p>
                <p>
                  {modelos.find((m) => m.id === c.modeloId)?.nome ||
                    'Sem projeto'}{' '}
                  · {c.ativo === false ? 'Acesso desativado' : 'Acesso ativo'}
                </p>
                <p>
                  {c.localizacao
                    ? `Estande: ${c.localizacao}`
                    : 'Localização pendente para a organizadora'}
                </p>
                <Localizacao cliente={c} aoSalvar={carregar} />
                {ehAdmin && (
                  <div className="row" style={{ gap: 8, marginTop: 16 }}>
                    <button className="btn" onClick={() => setGerenciando(c)}>
                      Gerenciar acesso
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        setVinculando(c.id)
                        setV({
                          feiraId: c.feiraId || '',
                          modeloId: c.modeloId || '',
                        })
                      }}
                    >
                      Vincular feira e projeto
                    </button>
                  </div>
                )}
                {vinculando === c.id && (
                  <form
                    className="col"
                    style={{ gap: 12, marginTop: 20 }}
                    onSubmit={vincular}
                  >
                    {campos(v, setV)}
                    <button className="btn btn-primary" disabled={ocupado}>
                      Salvar vínculo
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setVinculando(null)}
                    >
                      Cancelar
                    </button>
                    <p>
                      Propostas antigas preservam os vínculos do momento do
                      envio.
                    </p>
                  </form>
                )}
              </article>
            ))}
          {!clientes.length && <p>Nenhum expositor cadastrado.</p>}
        </section>
        {ehAdmin && (
          <form
            className="card card-pad col"
            style={{ gap: 16 }}
            onSubmit={criar}
          >
            <h2>Novo expositor</h2>
            <label>
              Nome da empresa
              <input
                required
                className="input"
                maxLength={180}
                value={f.nome}
                onChange={(e) => setF({ ...f, nome: e.target.value })}
              />
            </label>
            <label>
              E-mail
              <input
                className="input"
                required
                type="email"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </label>
            {campos(f, setF)}
            <button className="btn btn-primary" disabled={ocupado}>
              {ocupado ? 'Cadastrando…' : 'Cadastrar acesso'}
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
                  Copiar convite
                </button>
              </div>
            )}
          </form>
        )}
      </div>
      {erro && <p role="alert">{erro}</p>}
      {gerenciando && (
        <GerenciarExpositor
          cliente={gerenciando}
          modelos={modelos}
          aoMudar={carregar}
          aoFechar={() => setGerenciando(null)}
        />
      )}
    </div>
  )
}
