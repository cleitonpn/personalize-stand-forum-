import {useSearchParams} from 'react-router-dom'
import {useEffect,useState} from 'react'
import {collection,onSnapshot,query,where} from 'firebase/firestore'
import {db} from '../lib/firebase.js'
import {useAuth} from '../store/AuthContext.jsx'
import ChatCliente from '../components/ChatCliente.jsx'
export default function Atendimento(){
  const [params]=useSearchParams()
  const {perfil}=useAuth(),[lista,setLista]=useState(null),[clientes,setClientes]=useState([]),[selecionado,setSelecionado]=useState(params.get('cliente')||''),[erro,setErro]=useState('')
  useEffect(()=>{const q=nome=>perfil.papel==='admin'?collection(db,nome):query(collection(db,nome),where('organizadoraId','==',perfil.organizadoraId)),falha=e=>setErro(e.message)
    const a=onSnapshot(q('conversas'),s=>setLista(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>Number(b.pendenteEquipe)-Number(a.pendenteEquipe)||(b.ultimaEm?.seconds||0)-(a.ultimaEm?.seconds||0))),falha)
    const b=onSnapshot(perfil.papel==='admin'?query(collection(db,'usuarios'),where('papel','==','expositor')):q('usuarios'),s=>setClientes(s.docs.filter(d=>d.data().papel==='expositor').map(d=>({id:d.id,...d.data()}))),falha)
    return()=>{a();b()}
  },[perfil.papel,perfil.organizadoraId])
  return <div className="comercial-page"><header className="admin-cabecalho"><span className="admin-eyebrow">RELACIONAMENTO</span><h1>Atendimento aos expositores</h1><p>Dúvidas durante a personalização e a aprovação das artes, em uma conversa por cliente.</p></header>{erro&&<p role="alert">{erro}</p>}<div className="atendimento-grid"><aside><label>Abrir conversa com<select className="select" value={selecionado} onChange={e=>setSelecionado(e.target.value)}><option value="">Selecione o expositor</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.empresa||c.nome}</option>)}</select></label>{lista===null&&<p>Carregando conversas…</p>}{lista?.map(c=><button className="card chat-lista-item" aria-pressed={selecionado===c.id} key={c.id} onClick={()=>setSelecionado(c.id)}><strong>{c.clienteNome} {c.pendenteEquipe?'● Aguardando resposta':''}</strong><p>{c.ultimaMensagem||'Conversa iniciada'}</p><small>{c.ultimaEm?.toDate?.().toLocaleString('pt-BR')}</small></button>)}</aside><section className="card card-pad">{selecionado?<ChatCliente key={selecionado} clienteId={selecionado}/>:<p>Escolha uma conversa para atender o expositor.</p>}</section></div></div>
}
