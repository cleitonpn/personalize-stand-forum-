import { useState } from 'react'
import Viewer,{useGLB} from './Viewer.jsx'
import { blobProtegido } from '../lib/arquivoProtegido.js'
import {salvarBlob} from '../lib/baixarArquivo.js'

export default function Proposta3D({arquivo}){
  const {cena,erro,carregando}=useGLB(arquivo.url)
  const [baixando,setBaixando]=useState(false),[falha,setFalha]=useState('')
  const baixar=async()=>{setBaixando(true);setFalha('');try{await salvarBlob(await blobProtegido(arquivo.url),'estande-personalizado.glb')}catch{setFalha('Não foi possível baixar. Tente novamente.')}finally{setBaixando(false)}}
  return <section><h3>Projeto personalizado enviado</h3><p className="dim">Registro 3D desta proposta, com acabamentos, inclusões e posições escolhidas pelo cliente.</p>{carregando&&<p role="status">Carregando o registro 3D…</p>}{erro&&<p role="alert">Não foi possível abrir o registro 3D. Tente baixar o arquivo.</p>}
    <div style={{height:420,maxHeight:'65vh',borderRadius:18,overflow:'hidden'}}><Viewer cena={cena} realceSuave/></div>
    <button className="btn" disabled={baixando} onClick={baixar}>{baixando?'Baixando…':'Baixar GLB personalizado'}</button>{falha&&<p role="alert">{falha}</p>}
  </section>
}
