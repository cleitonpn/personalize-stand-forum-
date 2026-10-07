import { useEffect, useState } from 'react'
import { useAuth } from '../store/AuthContext.jsx'
import { listarComercial } from '../lib/comercial.js'
import {
  resumirComercial,
  agruparComercial,
} from '../lib/metricasComerciais.js'
import { fmtBRL } from '../lib/glb/precos.js'
function ResumoGrupos({ titulo, campo, propostas, nome }) {
  return (
    <section>
      <h2>{titulo}</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="comercial-table">
          <thead>
            <tr>
              <th>{titulo}</th>
              <th>Expositores</th>
              <th>Itens personalizados</th>
              <th>Valor proposto</th>
            </tr>
          </thead>
          <tbody>
            {agruparComercial(propostas, campo).map((g) => (
              <tr key={g.id}>
                <td>{nome(g.id, g.lista)}</td>
                <td>{g.clientes}</td>
                <td>
                  {g.itens}
                  {g.semContagem > 0
                    ? ' + contagens antigas indisponíveis'
                    : ''}
                </td>
                <td>{fmtBRL(g.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
export default function MetricasComerciais() {
  const { perfil, ehAdmin } = useAuth(),
    [propostas, setPropostas] = useState([]),
    [orgs, setOrgs] = useState([]),
    [erro, setErro] = useState(''),
    [carregando, setCarregando] = useState(true)
  const [org, setOrg] = useState(''),
    [feira, setFeira] = useState(''),
    [cliente, setCliente] = useState('')
  useEffect(() => {
    Promise.all([
      listarComercial('propostas', perfil),
      ehAdmin ? listarComercial('organizadoras', perfil) : Promise.resolve([]),
    ])
      .then(([ps, os]) => {
        setPropostas(ps)
        setOrgs(os)
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [])
  const base = propostas.filter(
    (p) => !org || (p.organizadoraId || 'legado') === org,
  )
  const fs = [
    ...new Map(
      base.map((p) => [
        p.feiraId || p.feira || 'legado',
        p.feira || 'Sem feira vinculada',
      ]),
    ).entries(),
  ]
  const cs = [
    ...new Map(
      base
        .filter((p) => !feira || (p.feiraId || p.feira || 'legado') === feira)
        .map((p) => [p.cliente, p.clienteNome]),
    ).entries(),
  ]
  const filtradas = base.filter(
    (p) =>
      (!feira || (p.feiraId || p.feira || 'legado') === feira) &&
      (!cliente || p.cliente === cliente),
  )
  const r = resumirComercial(filtradas)
  return (
    <div className="comercial-page">
      <h1>Métricas comerciais</h1>
      <p>
        Valores propostos no último envio de cada expositor por feira. Revisões
        não duplicam os totais; os valores não representam pagamentos recebidos.
      </p>
      <div
        className="row"
        style={{ flexWrap: 'wrap', gap: 14, margin: '24px 0' }}
      >
        {ehAdmin && (
          <label>
            Organizadora
            <select
              className="select"
              value={org}
              onChange={(e) => {
                setOrg(e.target.value)
                setFeira('')
                setCliente('')
              }}
            >
              <option value="">Todas</option>
              {orgs.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.nome}
                </option>
              ))}
              <option value="legado">Sem vínculo (legado)</option>
            </select>
          </label>
        )}
        <label>
          Feira
          <select
            className="select"
            value={feira}
            onChange={(e) => {
              setFeira(e.target.value)
              setCliente('')
            }}
          >
            <option value="">Todas</option>
            {fs.map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Expositor
          <select
            className="select"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          >
            <option value="">Todos</option>
            {cs.map(([id, n]) => (
              <option key={id} value={id}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      {carregando ? (
        <p>Carregando métricas…</p>
      ) : (
        <>
          <div className="comercial-kpis">
            {[
              ['Valor proposto', fmtBRL(r.total)],
              ['Itens personalizados', r.itens],
              ['Expositores com proposta', r.clientes],
              ['Envios recebidos', r.propostas],
            ].map(([n, v]) => (
              <article className="card card-pad" key={n}>
                <p>{n}</p>
                <strong style={{ fontSize: 28 }}>{v}</strong>
              </article>
            ))}
          </div>
          {ehAdmin && (
            <ResumoGrupos
              titulo="Por organizadora"
              campo="organizadoraId"
              propostas={filtradas}
              nome={(id) =>
                orgs.find((o) => o.id === id)?.nome || 'Sem vínculo (legado)'
              }
            />
          )}
          <ResumoGrupos
            titulo="Por feira"
            campo="feiraId"
            propostas={filtradas}
            nome={(id, ls) => ls[0]?.feira || 'Sem feira vinculada'}
          />
          {r.semContagem > 0 && (
            <p>
              {r.semContagem} proposta(s) antiga(s) sem contagem de
              personalizações. Seus valores entram no total.
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className="comercial-table">
              <thead>
                <tr>
                  <th>Expositor</th>
                  <th>Organizadora</th>
                  <th>Feira</th>
                  <th>Itens personalizados</th>
                  <th>Último valor proposto</th>
                </tr>
              </thead>
              <tbody>
                {r.lista.map((p) => (
                  <tr key={p.id}>
                    <td>{p.clienteNome}</td>
                    <td>
                      {orgs.find((o) => o.id === p.organizadoraId)?.nome ||
                        (ehAdmin ? 'Sem vínculo' : 'Sua organizadora')}
                    </td>
                    <td>{p.feira || '—'}</td>
                    <td>{p.quantidadePersonalizada ?? 'Não registrado'}</td>
                    <td>{fmtBRL(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!r.lista.length && (
            <p>Nenhuma proposta para os filtros escolhidos.</p>
          )}
        </>
      )}
      {erro && <p role="alert">{erro}</p>}
    </div>
  )
}
