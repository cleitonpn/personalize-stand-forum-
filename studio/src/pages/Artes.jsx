import {useEffect,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {collection,doc,onSnapshot,query,where} from 'firebase/firestore'
import {db} from '../lib/firebase.js'
import {useAuth} from '../store/AuthContext.jsx'
import {executarComercial} from '../lib/comercial.js'
import AreaArte from '../components/AreaArte.jsx'
import ChatCliente from '../components/ChatCliente.jsx'

export default function Artes(){
  const {id}=useParams(),{user,perfil}=useAuth(),[propostas,setPropostas]=useState(null),[proposta,setProposta]=useState(null),[workspace,setWorkspace]=useState(null),[areas,setAreas]=useState([]),[erro,setErro]=useState(''),[pronto,setPronto]=useState(false),[prazo,setPrazo]=useState(''),[ocupado,setOcupado]=useState(false)
  useEffect(()=>{setErro('');setPronto(false);setProposta(null);setWorkspace(null);setAreas([])
    if(!id){const base=collection(db,'propostas'),q=perfil.papel==='admin'?base:query(base,where(perfil.papel==='expositor'?'cliente':'organizadoraId','==',perfil.papel==='expositor'?user.uid:perfil.organizadoraId));return onSnapshot(q,s=>setPropostas(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.criadoEm?.seconds||0)-(a.criadoEm?.seconds||0))),e=>setErro(e.message))}
    let vivo=true,unsubs=[]
    executarComercial('artesProposta',{acao:'iniciar',propostaId:id}).then(()=>{if(!vivo)return
      unsubs.push(onSnapshot(doc(db,'propostas',id),s=>setProposta({id:s.id,...s.data()}),e=>setErro(e.message)))
      unsubs.push(onSnapshot(doc(db,'artesPropostas',id),s=>{setWorkspace(s.data());const t=s.data()?.prazo?.toDate?.();setPrazo(t?new Date(t.getTime()-t.getTimezoneOffset()*60000).toISOString().slice(0,16):'')},e=>setErro(e.message)))
      unsubs.push(onSnapshot(collection(db,'artesPropostas',id,'areas'),s=>{setAreas(s.docs.map(d=>({id:d.id,...d.data()})));setPronto(true)},e=>setErro(e.message)))
    }).catch(e=>{if(vivo)setErro(e.message)})
    return()=>{vivo=false;unsubs.forEach(f=>f())}
  },[id,user.uid,perfil.papel,perfil.organizadoraId])
  const vencido=workspace?.prazo?.toMillis()<Date.now(),pendentes=areas.filter(a=>!['aprovada','em_impressao','impressa'].includes(a.status)).length
  return <div className="comercial-page artes-pagina"><header className="admin-cabecalho"><span className="admin-eyebrow">USET · PRODUÇÃO</span><h1>{id?'Artes do seu estande':'Artes e aprovação'}</h1><p>{id?'Cada área tem seu gabarito, arquivo final e prova. Acompanhe tudo aqui, sem perder as versões anteriores.':'Escolha uma proposta para enviar artes finais ou acompanhar a aprovação.'}</p><Link className="btn" to={perfil.papel==='expositor'?'/meu-estande':'/propostas'}>Voltar {perfil.papel==='expositor'?'ao estande':'às propostas'}</Link>{id&&<Link className="btn" to="/artes">Todas as propostas</Link>}</header>
    {erro&&<p role="alert">{erro}</p>}
    {!id&&<div className="artes-lista">{propostas===null&&!erro&&<p>Carregando propostas…</p>}{propostas?.length===0&&<p>Envie sua proposta de personalização para abrir o envio de artes.</p>}{propostas?.map(p=><Link className="card card-pad arte-proposta" key={p.id} to={`/artes/${p.id}`}><span><strong>{p.modeloNome}</strong><small>{p.clienteNome} · {p.feira||'Feira'} · {p.criadoEm?.toDate?.().toLocaleDateString('pt-BR')}</small></span><span>Ver artes e provas →</span></Link>)}</div>}
    {id&&!pronto&&!erro&&<p role="status">Preparando as áreas da proposta…</p>}
    {id&&pronto&&<><div className="arte-resumo"><span>{proposta?.clienteNome} · {proposta?.modeloNome}</span><strong>{areas.length-pendentes}/{areas.length} áreas com prova aprovada</strong>{workspace?.prazo&&<span>Prazo de envio: {workspace.prazo.toDate().toLocaleString('pt-BR')}</span>}</div>
      {vencido&&<p className="orientacao">O prazo de envio terminou. Peça uma extensão pelo chat; você ainda pode consultar os arquivos e responder às provas.</p>}
      {perfil.papel==='admin'&&<details className="card card-pad"><summary>Prazo para envio de artes</summary><label>Data e hora limite<input className="input" type="datetime-local" value={prazo} onChange={e=>setPrazo(e.target.value)}/></label><button className="btn" disabled={ocupado} onClick={async()=>{setOcupado(true);setErro('');try{await executarComercial('artesProposta',{acao:'prazo',propostaId:id,prazo:prazo?new Date(prazo).toISOString():null})}catch(e){setErro(e.message)}finally{setOcupado(false)}}}>Salvar prazo{prazo?'':' sem limite'}</button></details>}
      {!areas.length&&<p className="orientacao">Esta proposta não tem áreas com arte escolhida. Não é necessário enviar arquivos finais. Para incluir arte, personalize o estande e envie uma nova proposta.</p>}
      <div className="artes-lista">{areas.map(a=><AreaArte key={a.id} area={a} propostaId={id} papel={perfil.papel} prazoVencido={vencido}/>)}</div>
      {perfil.papel!=='expositor'&&proposta?.cliente&&<section className="card card-pad"><h2>Conversa com {proposta.clienteNome}</h2><ChatCliente clienteId={proposta.cliente} propostaId={id}/></section>}
    </>}
  </div>
}
