import {useEffect,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {collection,doc,onSnapshot} from 'firebase/firestore'
import {db} from '../lib/firebase.js'
import {useAuth} from '../store/AuthContext.jsx'
import {operacao,ehGestor,estadoItem,ESPECIALIDADES} from '../lib/operacao.js'
import {executarComercial} from '../lib/comercial.js'
import {STATUS_ARTES} from '../lib/producao/envio.js'
import AreaArte from '../components/AreaArte.jsx'
import AnexosOperacionais from '../components/AnexosOperacionais.jsx'
import VistasProducao from '../components/VistasProducao.jsx'
import PendenciasOperacionais from '../components/PendenciasOperacionais.jsx'
import ResumoOperacional from '../components/ResumoOperacional.jsx'
const metros=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2})
function MapaEletrica({eletrica}){
  const l=eletrica?.limites,ps=eletrica?.pontos||[]
  if(!ps.length||!l||![l.x0,l.x1,l.z0,l.z1].every(Number.isFinite)||l.x1<=l.x0||l.z1<=l.z0)return null
  return <svg viewBox="0 0 500 270" role="img" aria-label="Localização dos pontos elétricos no piso" style={{width:'100%',maxHeight:280}}><rect x="35" y="20" width="430" height="200" fill="#e7ecdf" stroke="#173b32"/><text x="250" y="255" textAnchor="middle" fontSize="12">FRENTE DO ESTANDE · esquema sem escala</text>{ps.map((pt,i)=>{const x=35+(pt.x-l.x0)/(l.x1-l.x0)*430,y=20+(pt.z-l.z0)/(l.z1-l.z0)*200;return <g key={pt.id}><circle cx={x} cy={y} r="11" fill="#173b32"/><text x={x} y={y+4} textAnchor="middle" fill="white" fontSize="11">{i+1}</text></g>})}</svg>
}
export default function Producao(){
  const {id}=useParams(),{perfil,user}=useAuth(),[dados,setDados]=useState(null),[ordem,setOrdem]=useState(null),[erro,setErro]=useState(''),[feira,setFeira]=useState(''),[busca,setBusca]=useState(''),[equipes,setEquipes]=useState([]),[areas,setAreas]=useState([]),[pendencias,setPendencias]=useState([]),[historico,setHistorico]=useState([]),[ocupado,setOcupado]=useState(false),[f,setF]=useState({descricao:'',equipeId:''})
  const carregar=()=>operacao({acao:'listar'}).then(setDados).catch(e=>setErro(e.message))
  useEffect(()=>{carregar()},[])
  useEffect(()=>{setErro('');setOrdem(null);setAreas([]);setPendencias([]);setHistorico([]);if(!id)return;return onSnapshot(doc(db,'ordensProducao',id),s=>{if(!s.exists()){setErro('Ordem não encontrada.');return}setOrdem({id:s.id,...s.data()});setEquipes(s.data().equipeIds||[])},e=>{setOrdem(null);setErro('A ordem foi suspensa ou seu acesso mudou. '+e.message)})},[id])
  useEffect(()=>{if(!ordem)return;let vivo=true,desligar=[]; // Inicializa áreas existentes sem criar cópias ou versões paralelas.
    executarComercial('artesProposta',{acao:'iniciar',propostaId:ordem.propostaId}).then(()=>{if(!vivo)return;desligar.push(onSnapshot(collection(db,'artesPropostas',ordem.propostaId,'areas'),s=>setAreas(s.docs.map(d=>({id:d.id,...d.data()}))),e=>{setAreas([]);setErro(e.message)}))}).catch(e=>{if(vivo)setErro(e.message)})
    desligar.push(onSnapshot(collection(db,'ordensProducao',id,'pendencias'),s=>setPendencias(s.docs.map(d=>({id:d.id,...d.data()}))),e=>setErro(e.message)))
    desligar.push(onSnapshot(collection(db,'ordensProducao',id,'eventos'),s=>setHistorico(s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.em?.seconds||0)-(a.em?.seconds||0))),e=>setErro(e.message)))
    return()=>{vivo=false;desligar.forEach(f=>f())}
  },[ordem?.propostaId,id])
  async function executar(d){setErro('');setOcupado(true);try{await operacao({...d,ordemId:id,revisao:ordem.revisao});return true}catch(e){setErro(e.message);return false}finally{setOcupado(false)}}
  const m=ordem?.manifesto,lista=dados?.ordens.filter(o=>(!feira||o.feiraId===feira)&&`${o.clienteNome} ${o.localizacao} ${o.modeloNome}`.toLowerCase().includes(busca.toLowerCase()))||[],impressas=areas.filter(a=>a.status==='impressa').length
  return <div className="admin-pagina operacao-pagina"><header className="admin-cabecalho"><span className="admin-eyebrow">USET · OPERAÇÃO</span><h1>{ordem?ordem.clienteNome:'Produção dos estandes'}</h1><p>{ordem?`${ordem.feira} · ${ordem.modeloNome} · revisão ${ordem.revisao}`:'Consulte os projetos aprovados e acompanhe equipes, artes e pendências.'}</p>{id&&<Link className="btn" to="/producao">Todos os estandes</Link>}</header>{erro&&<p role="alert">{erro}</p>}
    {!id&&<><div className="admin-filtros"><label>Feira<select className="select" value={feira} onChange={e=>setFeira(e.target.value)}><option value="">Todas as suas feiras</option>{dados?.feiras.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label><label>Buscar empresa ou localização<input className="input" value={busca} onChange={e=>setBusca(e.target.value)}/></label><button className="btn" onClick={carregar}>Atualizar</button></div>{!dados&&!erro&&<p>Carregando ordens…</p>}{dados&&!lista.length&&<p>Nenhuma ordem liberada. O admin precisa aprovar a proposta; equipes de campo também precisam estar atribuídas ao estande.</p>}<div className="operacao-lista">{lista.map(o=><Link className="card card-pad" key={o.id} to={`/producao/${o.id}`}><h2>{o.clienteNome}</h2><p>{o.feira} · {o.localizacao||'Localização pendente'}</p><p>{o.modeloNome} · revisão {o.revisao}</p><span>Consultar estande →</span></Link>)}</div></>}
    {ordem&&<><section className="arte-resumo"><span><strong>Localização:</strong> {ordem.localizacao||'Pendente — solicitar à organizadora'}</span><span>{ordem.contatoNome} · {ordem.telefone}</span><span><strong>CV:</strong> {areas.length?`${impressas}/${areas.length} artes impressas`:'Sem áreas de arte nesta proposta'}</span></section>
      <section className="card card-pad"><h2>Equipes do estande</h2>{dados?.equipes.filter(e=>equipes.includes(e.id)).map(e=><p key={e.id}>{e.nome} · {ESPECIALIDADES[e.especialidade]} · {e.responsavelNome||'Encarregado a definir'}</p>)}{ehGestor(perfil)&&<><div className="operacao-selecao">{dados?.equipes.filter(e=>e.ativo&&e.feiraIds.includes(ordem.feiraId)).map(e=><label className="operacao-check" key={e.id}><input type="checkbox" checked={equipes.includes(e.id)} onChange={ev=>setEquipes(ev.target.checked?[...equipes,e.id]:equipes.filter(x=>x!==e.id))}/>{e.nome}</label>)}</div><button className="btn btn-primary" disabled={ocupado} onClick={()=>executar({acao:'vincular',equipeIds:equipes})}>Salvar distribuição das equipes</button></>}</section>
      {m?.origem==='legado_conferido_manualmente'&&<p className="orientacao">Proposta anterior ao registro completo: itens originais conferidos manualmente pelo admin a partir do mapeamento disponível na aprovação.</p>}
      <ResumoOperacional manifesto={m}/>
      <section className="card card-pad"><h2>Pontos elétricos adicionais</h2><MapaEletrica eletrica={m?.eletrica}/>{!m?.eletrica?.pontos?.length&&<p>Nenhum ponto adicional solicitado.</p>}<ol>{m?.eletrica?.pontos?.map(pt=><li key={pt.id}>{pt.uso||'Uso a confirmar'} · {pt.tensao||'Tensão a confirmar'} · X {metros(pt.x)} m / Z {metros(pt.z)} m</li>)}</ol></section>
      {ordem.arquivoPersonalizado?.url&&<VistasProducao key={`${ordem.propostaId}:${ordem.revisao}`} arquivo={ordem.arquivoPersonalizado} ordemId={id} revisao={ordem.revisao} podeSalvar={ehGestor(perfil)}/>}
      <section className="card card-pad"><h2>Artes e comunicação visual</h2><p>Prova aprovada não significa arte impressa. Consulte o estado de cada peça.</p>{areas.map(a=><div key={a.id}><p><strong>{a.nome}</strong> · {STATUS_ARTES[a.status]} · arte v{a.versao}</p><AreaArte area={a} propostaId={ordem.propostaId} papel={perfil.papel}/></div>)}{['admin','analista_cv'].includes(perfil.papel)&&<Link className="btn" to={`/artes/${ordem.propostaId}`}>Conferência, provas e prazo</Link>}</section>
      <section className="card card-pad"><AnexosOperacionais tipo="ordensProducao" parentId={id} podeRemover={ehGestor(perfil)} titulo="Fotos da montagem e documentos"/></section>
      {ehGestor(perfil)&&<details className="card card-pad operacao-acordeao"><summary>Validação dos serviços nesta feira</summary><p>O padrão é validar cada execução. Ao habilitar a opção abaixo, novas execuções são concluídas automaticamente para todos os estandes desta feira.</p><label className="operacao-check"><input type="checkbox" disabled={ocupado} checked={dados?.feiras.find(f=>f.id===ordem.feiraId)?.validacaoAutomatica===true} onChange={e=>executar({acao:'configurarValidacao',automatica:e.target.checked}).then(ok=>{if(ok)carregar()})}/>Validação automática da execução</label></details>}
      <PendenciasOperacionais key={id} ordem={ordem} perfil={{...perfil,uid:user.uid}} pendencias={pendencias} equipes={dados?.equipes||[]} usuarios={dados?.usuarios||[]} aoAtualizar={carregar}/>
      <details className="card card-pad"><summary>Histórico da operação</summary>{historico.map(e=><p key={e.id}>{e.em?.toDate?.().toLocaleString('pt-BR')} · {e.acao} · revisão {e.revisao} · {e.nota||e.status||e.motivo||''} · responsável {e.autorNome||dados?.usuarios.find(u=>u.uid===e.autor)?.nome||e.autor}</p>)}</details>
    </>}
  </div>
}
