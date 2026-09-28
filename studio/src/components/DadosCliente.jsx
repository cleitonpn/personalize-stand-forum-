import { useRef, useState } from 'react'
import { enviarArte } from '../lib/artes.js'

export default function DadosCliente({ dados, mudar, enviarArquivoLocal }) {
  const arquivo=useRef(null),[enviando,setEnviando]=useState(false),[erro,setErro]=useState('')
  const enviar=async ev=>{
    const f=ev.target.files?.[0];ev.target.value='';if(!f)return
    setEnviando(true);setErro('')
    try {
      if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>10*1024*1024)throw Error('Use PNG, JPG ou WebP de até 10 MB.')
      const imagem=await createImageBitmap(f),canvas=document.createElement('canvas'),escala=Math.min(1,480/Math.max(imagem.width,imagem.height))
      canvas.width=Math.round(imagem.width*escala);canvas.height=Math.round(imagem.height*escala)
      const ctx=canvas.getContext('2d');ctx.fillStyle='#56647d';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(imagem,0,0,canvas.width,canvas.height);imagem.close()
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85))
      const thumb=new File([blob],'miniatura.jpg',{type:'image/jpeg'})
      const resultado=enviarArquivoLocal?await enviarArquivoLocal(thumb):await enviarArte(thumb)
      mudar({miniatura:resultado.url||resultado.arte})
    }catch(e){setErro(e.message||'Falha ao enviar miniatura.')}finally{setEnviando(false)}
  }
  return <details className="orientacao"><summary>Apresentação para o cliente</summary>
    <label className="field"><span>Ordem na lista (menores primeiro)</span><input className="input" type="number" min="0" step="1" value={dados.ordemCliente??100} onChange={e=>mudar({ordemCliente:Math.max(0,Number(e.target.value)||0)})}/></label>
    <p>A miniatura é gerada pelo modelo. Você pode usar uma imagem comercial no lugar.</p>
    {dados.miniatura&&<img src={dados.miniatura} alt="Miniatura do cliente" style={{width:'100%',maxHeight:150,objectFit:'contain'}}/>}
    <button className="btn btn-sm" disabled={enviando} onClick={()=>arquivo.current?.click()}>{enviando?'Enviando…':'Enviar miniatura'}</button>
    {dados.miniatura&&<button className="btn btn-sm" onClick={()=>mudar({miniatura:null})}>Usar miniatura automática</button>}
    <input ref={arquivo} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={enviar}/>
    {erro&&<p role="alert">{erro}</p>}
  </details>
}
