import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { enviarArte } from '../lib/artes.js'
import { useNapas } from '../store/NapasContext.jsx'
import { nomeNapa, validarNapa } from '../lib/napas.js'

export default function Acabamentos() {
  const {catalogo,erro,carregando}=useNapas()
  const [edicao,setEdicao]=useState(null),[busca,setBusca]=useState(''),[ocupado,setOcupado]=useState(false),[aviso,setAviso]=useState('')
  const mudar=p=>setEdicao(n=>({...n,...p}))
  const salvar=async()=>{
    const problema=validarNapa(edicao);if(problema){setAviso(problema);return}
    setOcupado(true);setAviso('')
    try{await setDoc(doc(db,'acabamentos',edicao.id),{...edicao,nome:edicao.nome.trim(),atualizadoEm:serverTimestamp()});setEdicao(null);setAviso('Acabamento salvo na biblioteca compartilhada.')}catch{setAviso('Não foi possível salvar. Confira sua conexão e tente novamente.')}finally{setOcupado(false)}
  }
  const enviar=async e=>{
    const f=e.target.files?.[0];e.target.value='';if(!f)return
    setOcupado(true);setAviso('')
    try{const a=await enviarArte(f);mudar({textura:a.arte,familia:'especial'})}catch(e){setAviso(e.message)}finally{setOcupado(false)}
  }
  return <div className="container col" style={{maxWidth:1000,margin:'30px auto',padding:20,gap:18}}>
    <h1>Biblioteca de acabamentos</h1><p>Reutilize napas entre os projetos. As 40 referências de napas lisas são da Casa Brasil; as cores na tela são aproximações do catálogo.</p>
    {(erro||aviso)&&<p role="status" className="orientacao">{erro||aviso}</p>}
    {carregando&&<p>Consultando biblioteca…</p>}
    {edicao?<section className="card card-pad col" style={{gap:14}}><h2>{edicao.nome||'Novo acabamento'}</h2><fieldset disabled={ocupado} className="col" style={{border:0,padding:0,gap:12}}>
      <label className="field">Nome<input className="input" value={edicao.nome} onChange={e=>mudar({nome:e.target.value})}/></label>
      <label className="field">Código do fornecedor<input className="input" value={edicao.codigo||''} onChange={e=>mudar({codigo:e.target.value.trim()||null})}/></label>
      <label className="field">Fornecedor<input className="input" value={edicao.fornecedor||''} onChange={e=>mudar({fornecedor:e.target.value})}/></label>
      <label className="field">Tipo<select className="select" value={edicao.familia} onChange={e=>mudar({familia:e.target.value,textura:e.target.value==='lisa'?null:edicao.textura})}><option value="lisa">Napa lisa</option><option value="especial">Napa especial com textura</option></select></label>
      <label className="field">Cor aproximada<input type="color" value={edicao.cor} onChange={e=>mudar({cor:e.target.value})}/></label>
      {edicao.familia==='especial'&&<><label className="field">Imagem da textura (PNG, JPG ou WebP, menos de 25 MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={enviar}/></label>
        {edicao.textura&&<img src={edicao.textura} alt="Amostra do acabamento" style={{maxWidth:240,maxHeight:200,objectFit:'contain'}}/>}
        <label className="field">Largura real da amostra (metros)<input className="input" type="number" min="0.01" max="10" step="0.01" value={edicao.escala} onChange={e=>mudar({escala:Number(e.target.value)})}/></label>
        <small className="dim">Use uma imagem de frente, sem sombras e com bordas que se repitam. A altura acompanha a proporção da imagem. Confira a escala no 3D antes de liberar.</small></>}
      <label className="field">Brilho aproximado<input type="range" min="0" max="1" step="0.05" value={edicao.brilho??.15} onChange={e=>mudar({brilho:Number(e.target.value)})}/></label>
      <label className="field">Preço por m² (vazio usa a regra do projeto)<input className="input" type="number" min="0" step="0.01" value={edicao.preco??''} onChange={e=>mudar({preco:e.target.value===''?null:Number(e.target.value)})}/></label>
      <small className="dim">Este preço substitui a regra de cor do projeto. Com arte aplicada, vale a regra de impressão do projeto.</small>
      <strong>Aplicável em</strong><div className="filtros-elementos">{[['parede','Paredes'],['movel','Móveis'],['piso','Piso'],['logo','Logos']].map(([id,n])=><label key={id}><input type="checkbox" checked={edicao.tipos.includes(id)} onChange={e=>mudar({tipos:e.target.checked?[...edicao.tipos,id]:edicao.tipos.filter(x=>x!==id)})}/>{n}</label>)}</div>
      <label><input type="checkbox" checked={edicao.ativo!==false} onChange={e=>mudar({ativo:e.target.checked})}/>Disponível para novas escolhas</label>
      <button className="btn btn-primary" onClick={salvar}>Salvar acabamento</button><button className="btn" onClick={()=>{setEdicao(null);setAviso('')}}>Cancelar edição</button>
    </fieldset></section>:<>
      <button className="btn btn-primary" disabled={!!erro||carregando} onClick={()=>{setAviso('');setEdicao({id:crypto.randomUUID(),nome:'',codigo:null,fornecedor:'',familia:'especial',cor:'#ffffff',ativo:false,tipos:['parede'],preco:null,textura:null,escala:.25,brilho:.15})}}>Cadastrar napa especial</button>
      <input className="input" aria-label="Buscar acabamento" placeholder="Buscar nome ou código" value={busca} onChange={e=>setBusca(e.target.value)}/>
      <div className="biblioteca-napas">{catalogo.filter(n=>nomeNapa(n).toLowerCase().includes(busca.toLowerCase())).map(n=><button key={n.id} className="card card-pad" onClick={()=>{setEdicao({...n});setAviso('')}}><span className="napa-preview" style={{backgroundColor:n.cor,backgroundImage:n.textura?`url("${n.textura}")`:undefined}}/><strong>{nomeNapa(n)}</strong><small>{n.ativo===false?'Indisponível':n.familia==='lisa'?'Napa lisa':'Napa especial'}</small></button>)}</div>
    </>}
  </div>
}
