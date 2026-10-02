import { useEffect,useState } from 'react'
import { Link } from 'react-router-dom'
import { collection,doc,getDocs,setDoc,runTransaction,serverTimestamp } from 'firebase/firestore'
import { ref,uploadBytesResumable,getDownloadURL } from 'firebase/storage'
import { db,storage } from '../lib/firebase.js'
import Viewer,{carregarGLB,useGLB} from '../components/Viewer.jsx'
import { caixaDe } from '../lib/glb/complementos.js'
import { relacionarMobiliario } from '../lib/bibliotecaMobiliario.js'
import { fmtBRL } from '../lib/glb/precos.js'

function PreviaMovel({item}){const {cena,erro,carregando}=useGLB(item.arquivo.url);return <section className="card card-pad"><h2>{item.nome}</h2>{erro&&<p role="alert">Não foi possível abrir o móvel.</p>}{carregando&&<p>Carregando…</p>}<div style={{height:350}}><Viewer cena={cena} realceSuave/></div></section>}
const alternar=(lista,id)=>lista.includes(id)?lista.filter(x=>x!==id):[...lista,id]
export default function BibliotecaMobiliario(){
  const [itens,setItens]=useState([]),[modelos,setModelos]=useState([]),[selecionados,setSelecionados]=useState([]),[projetos,setProjetos]=useState([]),[arquivo,setArquivo]=useState(null),[nome,setNome]=useState(''),[valor,setValor]=useState(''),[limite,setLimite]=useState(10),[ocupado,setOcupado]=useState(false),[status,setStatus]=useState(''),[erro,setErro]=useState(''),[previa,setPrevia]=useState(null),[carregando,setCarregando]=useState(true)
  const carregar=async()=>{const [a,b]=await Promise.all([getDocs(collection(db,'mobiliario')),getDocs(collection(db,'modelos'))]);setItens(a.docs.map(d=>({id:d.id,...d.data()})));setModelos(b.docs.map(d=>({id:d.id,...d.data()})))}
  useEffect(()=>{carregar().catch(e=>setErro(e.message)).finally(()=>setCarregando(false))},[])
  const enviar=async e=>{
    e.preventDefault();const formulario=e.currentTarget;if(!arquivo)return;setOcupado(true);setErro('');setStatus('Conferindo o GLB…')
    try{
      if(!arquivo.name.toLowerCase().endsWith('.glb')||arquivo.size>=200*1024*1024)throw Error('Use um GLB menor que 200 MB.')
      if(!nome.trim()||valor===''||!Number.isFinite(Number(valor))||Number(valor)<0)throw Error('Preencha o nome e um preço válido, inclusive zero.')
      const cena=await carregarGLB(arquivo),bbox=caixaDe(cena)
      if(!bbox||![bbox.largura,bbox.altura,bbox.profundidade].every(v=>Number.isFinite(v)&&v>=0)||!cena.children.length)throw Error('O GLB não contém um móvel válido.')
      const documento=doc(collection(db,'mobiliario')),caminho=`modelos/biblioteca_${documento.id}.glb`,destino=ref(storage,caminho)
      const tarefa=uploadBytesResumable(destino,arquivo,{contentType:'model/gltf-binary'})
      tarefa.on('state_changed',s=>setStatus(`Enviando móvel… ${Math.round(100*s.bytesTransferred/s.totalBytes)}%`))
      await tarefa
      const item={nome:nome.trim(),valor:Number(valor),limite:Number(limite),bbox,arquivo:{url:await getDownloadURL(destino),caminho,bytes:arquivo.size,nomeOriginal:arquivo.name},criadoEm:serverTimestamp()}
      await setDoc(documento,item);await carregar();setSelecionados(ids=>[...ids,documento.id]);setStatus('Móvel cadastrado. Selecione os projetos abaixo para disponibilizá-lo.');formulario.reset();setArquivo(null);setNome('');setValor('')
    }catch(e){setErro(e.message);setStatus('')}finally{setOcupado(false)}
  }
  const relacionar=async()=>{
    setOcupado(true);setErro('');setStatus('Relacionando mobiliário…');const falhas=[],ok=[]
    for(const id of projetos){try{await runTransaction(db,async tx=>{const r=doc(db,'modelos',id),s=await tx.get(r);if(!s.exists())throw Error('Projeto removido');tx.update(r,{complementos:relacionarMobiliario(s.data(),itens.filter(i=>selecionados.includes(i.id))),atualizadoEm:serverTimestamp()})});ok.push(id)}catch(e){falhas.push({id,mensagem:e.message})}}
    setStatus(`${ok.length} projeto(s) atualizado(s). Os móveis estão disponíveis na etapa Mobiliário do cliente.`)
    if(falhas.length){setErro(falhas.map(f=>`${modelos.find(m=>m.id===f.id)?.nome}: ${f.mensagem}`).join(' · '));setProjetos(falhas.map(f=>f.id))}
    try{await carregar()}catch(e){setErro(e.message)}finally{setOcupado(false)}
  }
  return <div className="admin-pagina"><header className="admin-cabecalho"><span className="admin-eyebrow">BIBLIOTECA COMPARTILHADA</span><h1>Mobiliário para seus projetos</h1><p>Envie o móvel uma vez e escolha em quais estandes ele estará disponível. O cliente poderá acrescentar unidades e distribuí-las no piso.</p></header>
    <form className="card card-pad" onSubmit={enviar}><fieldset disabled={ocupado} className="admin-form"><h2>Cadastrar mobiliário</h2><label className="field">Arquivo GLB<input type="file" accept=".glb" required onChange={e=>{const f=e.target.files?.[0];setArquivo(f);if(f)setNome(f.name.replace(/\.glb$/i,''))}}/></label><div className="admin-filtros"><label>Nome<input className="input" required value={nome} onChange={e=>setNome(e.target.value)}/></label><label>Adicional por unidade (R$)<input className="input" required type="number" min="0" step="0.01" value={valor} onChange={e=>setValor(e.target.value)}/></label><label>Máximo por projeto<input className="input" type="number" required min="1" max="30" step="1" value={limite} onChange={e=>setLimite(e.target.value)}/></label></div><button className="btn btn-primary" type="submit">Cadastrar GLB</button></fieldset></form>
    {status&&<p className="orientacao" role="status">{status}</p>}{erro&&<p className="erro-inline" role="alert">{erro}</p>}{carregando&&<p>Carregando biblioteca…</p>}
    <fieldset disabled={ocupado||carregando} className="admin-form"><div className="admin-duas-colunas"><section className="card card-pad"><h2>1. Selecione os móveis</h2><label className="admin-check"><input type="checkbox" checked={itens.length>0&&selecionados.length===itens.length} onChange={e=>setSelecionados(e.target.checked?itens.map(i=>i.id):[])}/> Todos os móveis</label>{!itens.length&&<p>Cadastre o primeiro móvel acima.</p>}{itens.map(i=><div className="admin-check" key={i.id}><label style={{flex:1}}><input type="checkbox" checked={selecionados.includes(i.id)} onChange={()=>setSelecionados(s=>alternar(s,i.id))}/> {i.nome}<small>{fmtBRL(i.valor)} / unidade · até {i.limite} unidades</small></label><button className="btn btn-sm" onClick={()=>setPrevia(i)}>Ver 3D</button></div>)}</section>
    <section className="card card-pad"><h2>2. Selecione os projetos</h2><label className="admin-check"><input type="checkbox" checked={modelos.length>0&&projetos.length===modelos.length} onChange={e=>setProjetos(e.target.checked?modelos.map(m=>m.id):[])}/> Todos os projetos atuais</label>{modelos.map(m=><label className="admin-check" key={m.id}><input type="checkbox" checked={projetos.includes(m.id)} onChange={()=>setProjetos(s=>alternar(s,m.id))}/><span>{m.nome}<small>{(m.complementos||[]).flatMap(g=>g.opcoes||[]).filter(o=>o.bibliotecaId).length} móveis da biblioteca vinculados</small></span></label>)}</section></div>
    <p className="muted">Relacionar novamente não duplica móveis nem altera preços e posições já ajustados no projeto. Para definir quais itens serão substituídos, abra “Mobiliário” no editor do projeto.</p>
    <button className="btn btn-primary" disabled={!selecionados.length||!projetos.length} onClick={relacionar}>Disponibilizar {selecionados.length} móvel(is) em {projetos.length} projeto(s)</button>
    <div className="row" style={{flexWrap:'wrap'}}>{modelos.filter(m=>projetos.includes(m.id)).map(m=><Link className="btn btn-sm" key={m.id} to={`/modelos/${m.id}`}>Configurar {m.nome}</Link>)}</div></fieldset>
    {previa&&<><button className="btn" onClick={()=>setPrevia(null)}>Fechar prévia</button><PreviaMovel key={previa.id} item={previa}/></>}
  </div>
}
