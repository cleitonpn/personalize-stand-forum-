import {useEffect,useRef,useState} from 'react'
import {collection,doc,onSnapshot,orderBy,query,limit,getDocs,startAfter} from 'firebase/firestore'
import {Link,useLocation} from 'react-router-dom'
import {db} from '../lib/firebase.js'
import {executarComercial} from '../lib/comercial.js'
import {useAuth} from '../store/AuthContext.jsx'
export default function ChatCliente({clienteId,propostaId}){
  const {user}=useAuth(),[mensagens,setMensagens]=useState([]),[anteriores,setAnteriores]=useState([]),[primeira,setPrimeira]=useState(null),[haMais,setHaMais]=useState(false),[texto,setTexto]=useState(''),[erro,setErro]=useState(''),[enviando,setEnviando]=useState(false),[historico,setHistorico]=useState(false)
  const painel=useRef(null),pedido=useRef(null),paginaAntiga=useRef(false)
  const [conversa,setConversa]=useState(null)
  useEffect(()=>{let ativo=true,parar=[];setMensagens([]);setAnteriores([]);setErro('');setTexto('');pedido.current=null
    paginaAntiga.current=false;setConversa(null)
    executarComercial('conversaCliente',{acao:'iniciar',clienteId}).then(()=>{if(!ativo)return
      parar.push(onSnapshot(query(collection(db,'conversas',clienteId,'mensagens'),orderBy('em','desc'),limit(50)),s=>{setMensagens(s.docs.map(d=>({id:d.id,...d.data()})).reverse());if(!paginaAntiga.current){setPrimeira(s.docs.at(-1));setHaMais(s.size===50)}},e=>setErro(e.message)))
      parar.push(onSnapshot(doc(db,'conversas',clienteId),s=>setConversa(s.data()),e=>setErro(e.message)))
    }).catch(e=>{if(ativo)setErro(e.message)})
    return()=>{ativo=false;parar.forEach(f=>f())}
  },[clienteId])
  useEffect(()=>{const em=conversa?.ultimaEm?.toMillis(),lida=mensagens.at(-1)?.em?.toMillis(),pendente=clienteId===user.uid?conversa?.pendenteCliente:conversa?.pendenteEquipe
    if(pendente&&em&&em===lida)executarComercial('conversaCliente',{acao:'ler',clienteId,ultimaEm:em}).catch(()=>{})
  },[conversa,mensagens,clienteId,user.uid])
  useEffect(()=>{if(painel.current&&!historico)painel.current.scrollTop=painel.current.scrollHeight},[mensagens,historico])
  const enviar=async e=>{e.preventDefault();if(!texto.trim()||enviando)return;setEnviando(true);setErro('');pedido.current??=crypto.randomUUID()
    try{await executarComercial('conversaCliente',{acao:'enviar',clienteId,propostaId:propostaId||null,texto,mensagemId:pedido.current});setTexto('');pedido.current=null;setHistorico(false)}catch(ex){setErro(ex.message)}finally{setEnviando(false)}}
  const mais=async()=>{if(!primeira)return;setHistorico(true);paginaAntiga.current=true;try{const s=await getDocs(query(collection(db,'conversas',clienteId,'mensagens'),orderBy('em','desc'),startAfter(primeira),limit(50)));setAnteriores(a=>[...s.docs.map(d=>({id:d.id,...d.data()})).reverse(),...a]);setPrimeira(s.docs.at(-1));setHaMais(s.size===50)}catch(e){setErro(e.message)}}
  const todas=[...new Map([...anteriores,...mensagens].map(m=>[m.id,m])).values()].sort((a,b)=>(a.em?.toMillis()||0)-(b.em?.toMillis()||0))
  return <div className="chat-corpo"><p className="dim">Converse com a USET e sua organizadora. As respostas aparecem aqui; o atendimento não é instantâneo.</p><div className="chat-mensagens" ref={painel} role="log" aria-label="Mensagens do atendimento" aria-live="polite">{haMais&&<button className="btn btn-sm" onClick={mais}>Mensagens anteriores</button>}{!todas.length&&<p>Como podemos ajudar com seu estande?</p>}{todas.map(m=><article className={`chat-mensagem ${m.autor===user.uid?'minha':''}`} key={m.id}><strong>{m.nome}{m.papel==='organizadora'?' · Organizadora':m.papel==='admin'?' · USET':''}</strong><p>{m.texto}</p><small>{m.em?.toDate?.().toLocaleString('pt-BR')||'Enviando…'}</small>{m.propostaId&&<Link to={`/artes/${m.propostaId}`}>Ver proposta relacionada</Link>}</article>)}</div>
    <form onSubmit={enviar}><label htmlFor={`chat-${clienteId}`}>Sua mensagem</label><textarea id={`chat-${clienteId}`} className="input" rows="3" maxLength="2000" value={texto} onChange={e=>{setTexto(e.target.value);pedido.current=null}} disabled={enviando}/><button className="btn btn-primary" disabled={!texto.trim()||enviando}>{enviando?'Enviando…':'Enviar mensagem'}</button></form>{erro&&<p role="alert">{erro}</p>}
  </div>
}

export function ChatFlutuante(){
  const {user,perfil}=useAuth(),{pathname}=useLocation(),[aberto,setAberto]=useState(false),[pendente,setPendente]=useState(false)
  const disponivel=user&&perfil?.papel==='expositor'&&perfil.ativo!==false&&!perfil.precisaTrocarSenha&&perfil.cadastroCompleto!==false&&pathname!=='/'&&pathname!=='/entrar'
  useEffect(()=>{if(!disponivel)return;return onSnapshot(doc(db,'conversas',user.uid),s=>setPendente(s.data()?.pendenteCliente===true),()=>{})},[disponivel,user?.uid])
  useEffect(()=>{const abrir=()=>setAberto(true);window.addEventListener('uset:chat',abrir);return()=>window.removeEventListener('uset:chat',abrir)},[])
  if(!disponivel)return null
  return <div className="chat-flutuante">{aberto&&<section className="card chat-painel" aria-label="Atendimento USET"><header><h2>Precisa de ajuda?</h2><button className="btn btn-sm" onClick={()=>setAberto(false)} aria-label="Fechar atendimento">Fechar</button></header><ChatCliente clienteId={user.uid} propostaId={pathname.startsWith('/artes/')?pathname.split('/')[2]:null}/></section>}</div>
}

export function ChatAtalho(){const {user}=useAuth(),[pendente,setPendente]=useState(false);useEffect(()=>onSnapshot(doc(db,'conversas',user.uid),s=>setPendente(s.data()?.pendenteCliente===true),()=>{}),[user.uid]);return <button className="btn btn-ghost btn-sm" onClick={()=>window.dispatchEvent(new Event('uset:chat'))}>{pendente?'● Nova mensagem':'Falar com a equipe'}</button>}
