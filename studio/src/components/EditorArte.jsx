import { useEffect, useRef, useState } from 'react'
import { comporArte } from '../lib/glb/arte.js'

export default function EditorArte({ acabamento, proporcao=1, aoMudar }) {
  const canvas=useRef(null), [erro,setErro]=useState('')
  useEffect(()=>{
    let vivo=true
    const img=new Image();img.crossOrigin='anonymous'
    img.onload=()=>{if(!vivo||!canvas.current)return;const resultado=comporArte(img,proporcao,acabamento.cor,acabamento.enquadramento);canvas.current.width=resultado.width;canvas.current.height=resultado.height;canvas.current.getContext('2d').drawImage(resultado,0,0);setErro('')}
    img.onerror=()=>{if(vivo)setErro('Não foi possível abrir a prévia desta imagem.')}
    img.src=acabamento.arte
    return()=>{vivo=false}
  },[acabamento.arte,acabamento.cor,acabamento.enquadramento,proporcao])
  const ajustar=patch=>aoMudar({enquadramento:{...acabamento.enquadramento,...patch}})
  const e=acabamento.enquadramento||{}
  return <div className="editor-arte col">
    <strong>Enquadrar sua imagem</strong><canvas ref={canvas} aria-label="Prévia frontal da arte" />
    {erro&&<p role="alert">{erro}</p>}
    <small>{acabamento.nomeArte}</small>
    {acabamento.artePixels&&Math.max(...acabamento.artePixels)<1200&&<p className="orientacao" role="status">Esta imagem tem poucos pixels para uma impressão grande. A equipe precisa conferir a qualidade antes de produzir.</p>}
    <label className="field"><span>Ajuste da imagem</span><select className="select" value={e.modo||'conter'} onChange={ev=>ajustar({modo:ev.target.value})}><option value="conter">Mostrar imagem inteira</option><option value="cobrir">Preencher área (pode cortar bordas)</option></select></label>
    {[['zoom','Tamanho',1,3,.05,1],['x','Posição horizontal',0,1,.01,.5],['y','Posição vertical',0,1,.01,.5]].map(([k,n,min,max,step,padrao])=><label className="field" key={k}><span>{n}</span><input aria-label={n} type="range" min={min} max={max} step={step} value={e[k]??padrao} onChange={ev=>ajustar({[k]:Number(ev.target.value)})}/></label>)}
    <button className="btn btn-sm" onClick={()=>aoMudar({enquadramento:{modo:'conter',zoom:1,x:.5,y:.5}})}>Centralizar imagem</button>
  </div>
}
