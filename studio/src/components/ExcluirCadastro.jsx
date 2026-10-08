import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { executarComercial } from '../lib/comercial.js'

const rotulos = { usuario: 'usuário', feira: 'feira', organizadora: 'organizadora' }
export default function ExcluirCadastro({ tipo, id, aoCancelar, aoExcluir }) {
  const [resumo, setResumo] = useState(null), [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false)
  async function conferir() {
    setResumo(null); setErro(''); setConfirmacao('')
    try { setResumo(await executarComercial('excluirCadastroAdmin', { acao: 'consultar', tipo, id })) }
    catch (e) { setErro(e.message) }
  }
  useEffect(() => { let atual = true; setResumo(null); setConfirmacao(''); setErro('')
    executarComercial('excluirCadastroAdmin', { acao: 'consultar', tipo, id }).then(r => { if (atual) setResumo(r) }).catch(e => { if (atual) setErro(e.message) })
    return () => { atual = false }
  }, [tipo, id])
  async function excluir(e) {
    e.preventDefault(); setOcupado(true); setErro('')
    try { await executarComercial('excluirCadastroAdmin', { acao: 'excluir', tipo, id, confirmacao }); await aoExcluir() }
    catch (ex) { setErro(ex.message) }
    finally { setOcupado(false) }
  }
  return <section className="cadastro-exclusao" aria-label={`Excluir ${rotulos[tipo]}`} aria-busy={ocupado}>
    <h3>Excluir {rotulos[tipo]}{resumo ? `: ${resumo.nome}` : ''}</h3>
    {!resumo && !erro && <p role="status">Conferindo vínculos…</p>}
    {resumo && <>
      <p>{tipo === 'usuario' ? 'O perfil e o login serão removidos. Para voltar a acessar, será necessário um novo cadastro. A exclusão do login não cancela propostas nem ordens de produção.' : tipo === 'organizadora' ? `A organizadora sairá dos cadastros disponíveis e ${resumo.logins} login(s) de organizadora será(ão) removido(s).` : 'A feira sairá dos cadastros disponíveis e deixará de aceitar novos vínculos.'}</p>
      <p>Propostas e arquivos permanecem no histórico{resumo.propostas ? ` · ${resumo.propostas} proposta(s) vinculada(s)` : ''}. Para cancelar um envio à produção, use a exclusão na tela de propostas.</p>
      {!!resumo.bloqueios.length && <div role="alert"><p><strong>Resolva os vínculos antes de excluir:</strong></p><ul>{resumo.bloqueios.map(b => <li key={b}>{b}</li>)}</ul>
        {!!resumo.vinculados.length && <ul>{resumo.vinculados.map((v, i) => <li key={i}>{v.tipo === 'feira' ? 'Feira' : 'Usuário'}: {v.nome}</li>)}</ul>}
        <div className="row"><Link className="btn" to="/expositores">Reatribuir expositores</Link><Link className="btn" to="/usuarios">Gerenciar usuários</Link>{tipo === 'organizadora' && <Link className="btn" to="/feiras">Gerenciar feiras</Link>}</div>
      </div>}
      {!resumo.bloqueios.length && <form className="col" onSubmit={excluir}>
        <label>Para confirmar, digite <strong>{resumo.confirmacao}</strong><input className="input" autoComplete="off" required value={confirmacao} disabled={ocupado} onChange={e => setConfirmacao(e.target.value)} /></label>
        <button className="btn btn-danger" disabled={ocupado || confirmacao.trim() !== resumo.confirmacao}>{ocupado ? 'Excluindo…' : `Confirmar exclusão de ${rotulos[tipo]}`}</button>
      </form>}
    </>}
    {erro && <p role="alert">{erro}</p>}
    <div className="row"><button className="btn" disabled={ocupado} onClick={aoCancelar}>Cancelar exclusão</button><button className="btn" disabled={ocupado} onClick={conferir}>Conferir vínculos novamente</button></div>
  </section>
}
