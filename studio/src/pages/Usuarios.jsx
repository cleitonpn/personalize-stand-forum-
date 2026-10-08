import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { executarComercial } from '../lib/comercial.js'
import { useAuth } from '../store/AuthContext.jsx'
import { PAPEIS_OPERACIONAIS } from '../lib/operacao.js'

const papeis={admin:'Administrador',organizadora:'Organizadora',expositor:'Expositor',...PAPEIS_OPERACIONAIS}
const api=d=>executarComercial('administrarUsuarios',d)

export default function Usuarios() {
  const {user}=useAuth()
  const [usuarios,setUsuarios]=useState([]),[cursor,setCursor]=useState(null),[carregando,setCarregando]=useState(true)
  const [busca,setBusca]=useState(''),[papel,setPapel]=useState(''),[status,setStatus]=useState('')
  const [selecionado,setSelecionado]=useState(null),[form,setForm]=useState({nome:'',telefone:''}),[senha,setSenha]=useState('')
  const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[aviso,setAviso]=useState(''),[link,setLink]=useState('')
  async function carregar(mais=false) {
    setCarregando(true)
    try{const r=await api({acao:'listar',...(mais?{cursor}:{})});setUsuarios(prev=>mais?[...prev,...r.usuarios]:r.usuarios);setCursor(r.cursor)}
    catch(e){setErro(e.message)}finally{setCarregando(false)}
  }
  useEffect(()=>{carregar()},[])
  function abrir(u){setSelecionado(u);setForm({nome:u.nome,telefone:u.telefone});setSenha('');setLink('');setErro('');setAviso('')}
  async function executar(acao,dados={}) {
    setOcupado(true);setErro('');setAviso('');setLink('')
    try {
      const r=await api({acao,uid:selecionado.uid,...dados})
      if(acao==='redefinir') {
        setLink(r.link)
        try{await sendPasswordResetEmail(auth,r.email);setAviso(`E-mail de redefinição enviado pelo Firebase para ${r.email}.`)}
        catch{setAviso('O envio do e-mail não foi confirmado. O link abaixo permite redefinir a senha e pode ser compartilhado com este usuário.')}
      } else {
        setAviso(acao==='sessoes'?'A renovação das sessões foi revogada. Para bloquear o acesso imediatamente, use Bloquear acesso.':acao==='provisoria'?'Senha provisória definida. O usuário precisa criar uma nova senha ao entrar.':'Alteração salva.')
        if(acao==='provisoria')setSenha('')
        if(acao==='acesso')setSelecionado(u=>({...u,ativo:dados.ativo}))
        if(acao==='editar')setSelecionado(u=>({...u,...dados}))
        setUsuarios(prev=>prev.map(u=>u.uid!==selecionado.uid?u:{...u,...(acao==='acesso'?{ativo:dados.ativo}:acao==='editar'?{...dados,...(u.papel==='expositor'?{empresa:dados.nome}:{})}:acao==='provisoria'?{precisaTrocarSenha:true}:{})}))
      }
    } catch(e){setErro(e.message)}finally{setOcupado(false)}
  }
  const filtrados=usuarios.filter(u=>(!papel||u.papel===papel)&&(!status||(status==='bloqueado'?!u.ativo:u.ativo))&&`${u.nome} ${u.empresa} ${u.email} ${u.feira}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')))
  const propria=selecionado?.uid===user.uid
  return <div className="comercial-page">
    <header className="admin-cabecalho"><span className="admin-eyebrow">USET · ADMINISTRAÇÃO</span><h1>Usuários e acessos</h1><p>Gerencie todos os tipos de login, recupere senhas e controle quem pode entrar.</p></header>
    <div className="row" style={{flexWrap:'wrap',gap:10,marginBottom:20}}><Link className="btn" to="/expositores">Cadastrar expositor e vincular projeto</Link><Link className="btn" to="/organizadoras">Cadastrar organizadora</Link><Link className="btn" to="/equipes">Cadastrar equipe e acesso operacional</Link></div>
    <div className="row" style={{flexWrap:'wrap',gap:12,marginBottom:20}}>
      <label style={{flex:2,minWidth:200}}>Buscar usuário<input className="input" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Nome, empresa, e-mail ou feira"/></label>
      <label>Tipo de acesso<select className="select" value={papel} onChange={e=>setPapel(e.target.value)}><option value="">Todos</option>{Object.entries(papeis).map(([p,n])=><option key={p} value={p}>{n}</option>)}</select></label>
      <label>Status<select className="select" value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option><option value="ativo">Liberado</option><option value="bloqueado">Bloqueado</option></select></label>
    </div>
    {erro&&<p role="alert" className="erro">{erro}</p>}{aviso&&<p role="status">{aviso}</p>}
    <div className="comercial-grid">
      <section className="col" style={{gap:12}}><p>{filtrados.length} usuário(s) nesta lista{cursor?' · carregue mais para consultar os demais':''}</p>
        {filtrados.map(u=><article className="card card-pad" key={u.uid}><h2>{u.empresa||u.nome||u.email}</h2><p>{u.email}</p><p>{papeis[u.papel]||u.papel} · <strong>{u.ativo?'Acesso liberado':'Acesso bloqueado'}</strong>{u.semLogin?' · Login ausente no Firebase':''}</p>{u.feira&&<p>{u.feira}</p>}<p>Último login: {u.ultimoAcesso?new Date(u.ultimoAcesso).toLocaleString('pt-BR'):'Ainda não entrou'}{u.cadastroPendente?' · Cadastro pendente':''}{u.precisaTrocarSenha?' · Troca de senha pendente':''}</p><button className="btn" disabled={ocupado} onClick={()=>abrir(u)}>Gerenciar acesso</button></article>)}
        {carregando&&<p role="status">Carregando usuários…</p>}{!carregando&&!filtrados.length&&<p>Nenhum usuário encontrado.</p>}
        {cursor&&<button className="btn" disabled={carregando||ocupado} onClick={()=>carregar(true)}>Carregar mais usuários</button>}
      </section>
      {selecionado&&<section className="card card-pad" aria-label="Gerenciar usuário"><h2>{selecionado.nome||selecionado.email}</h2><p>{selecionado.email} · {papeis[selecionado.papel]}</p><button className="btn" disabled={ocupado} onClick={()=>{setSelecionado(null);setSenha('');setLink('')}}>Fechar</button>
        {propria&&<p>Esta é sua conta. Altere sua senha em <Link to="/conta">Minha conta</Link>.</p>}
        <form className="col" style={{gap:12,marginTop:20}} onSubmit={e=>{e.preventDefault();executar('editar',form)}}><label>Nome<input className="input" required maxLength={180} value={form.nome} disabled={ocupado} onChange={e=>setForm({...form,nome:e.target.value})}/></label><label>Telefone<input className="input" type="tel" maxLength={30} value={form.telefone} disabled={ocupado} onChange={e=>setForm({...form,telefone:e.target.value})}/></label><button className="btn" disabled={ocupado||selecionado.semLogin}>Salvar dados</button></form>
        <hr/><h3>Permissão para entrar</h3><p>O bloqueio impede login, acesso aos dados e novas ações. O histórico fica preservado.</p>
        <button className="btn" disabled={ocupado||propria||selecionado.semLogin} onClick={()=>{if(window.confirm(`${selecionado.ativo?'Bloquear':'Liberar'} o acesso de ${selecionado.email}?`))executar('acesso',{ativo:!selecionado.ativo})}}>{selecionado.ativo?'Bloquear acesso':'Liberar acesso'}</button>
        <hr/><h3>Senha e sessões</h3><button className="btn" disabled={ocupado||propria||!selecionado.ativo||selecionado.semLogin} onClick={()=>executar('redefinir')}>Enviar e-mail de redefinição de senha</button>
        {link&&<div style={{marginTop:12}}><label>Link de redefinição<input className="input" readOnly value={link} onFocus={e=>e.target.select()}/></label><button className="btn" onClick={async()=>{try{await navigator.clipboard.writeText(link);setAviso('Link copiado.')}catch{setErro('Selecione e copie o link manualmente.')}}}>Copiar link</button></div>}
        <details style={{marginTop:16}}><summary>Definir senha provisória</summary><p>Use quando o usuário não conseguir receber o e-mail. Ele deverá trocar a senha no próximo acesso.</p><form className="col" style={{gap:12}} onSubmit={e=>{e.preventDefault();if(window.confirm(`Alterar a senha de ${selecionado.email}?`))executar('provisoria',{senha})}}><label>Senha provisória<input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={senha} disabled={ocupado||propria||!selecionado.ativo} onChange={e=>setSenha(e.target.value)}/></label><button className="btn" disabled={ocupado||propria||!selecionado.ativo||selecionado.semLogin}>Definir senha provisória</button></form></details>
        <button className="btn" style={{marginTop:16}} disabled={ocupado||propria||selecionado.semLogin} onClick={()=>{if(window.confirm(`Revogar a renovação das sessões de ${selecionado.email}?`))executar('sessoes')}}>Encerrar sessões</button>
        {ocupado&&<p role="status">Salvando alteração…</p>}
      </section>}
    </div>
  </div>
}
