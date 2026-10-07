import { useState } from 'react'
import Viewer,{useGLB} from './Viewer.jsx'
import { blobProtegido } from '../lib/arquivoProtegido.js'

export default function Proposta3D({arquivo}){
  const {cena,erro,carregando}=useGLB(arquivo.url)
  const [baixando,setBaixando]=useState(false),[falha,setFalha]=useState('')
  const baixar=async()=>{setBaixando(true);setFalha('');try{const url=URL.createObjectURL(await blobProtegido(arquivo.url));const a=document.createElement('a');a.href=url;a.download='estande-personalizado.glb';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}catch{setFalha('Não foi possível baixar. Tente novamente.')}finally{setBaixando(false)}}
  return <section><h3>Projeto personalizado enviado</h3><p className="dim">Registro 3D desta proposta, com acabamentos, inclusões e posições escolhidas pelo cliente.</p>{carregando&&<p role="status">Carregando o registro 3D…</p>}{erro&&<p role="alert">Não foi possível abrir o registro 3D. Tente baixar o arquivo.</p>}
    <div style={{height:420,maxHeight:'65vh',borderRadius:18,overflow:'hidden'}}><Viewer cena={cena} realceSuave/></div>
    <button className="btn" disabled={baixando} onClick={baixar}>{baixando?'Baixando…':'Baixar GLB personalizado'}</button>{falha&&<p role="alert">{falha}</p>}
  </section>
}
