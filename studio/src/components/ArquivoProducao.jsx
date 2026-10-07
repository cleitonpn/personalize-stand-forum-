import {useEffect,useState} from 'react'
import {getBlob,ref} from 'firebase/storage'
import {storage} from '../lib/firebase.js'
import {baixarPrivado} from '../lib/producao/envio.js'
export default function ArquivoProducao({arquivo,titulo='Arquivo'}){
  const [url,setUrl]=useState(''),[erro,setErro]=useState(''),[ver,setVer]=useState(false)
  useEffect(()=>{let ativo=true,endereco='';setUrl('');setErro('');if(!arquivo||!ver)return
    getBlob(ref(storage,arquivo.caminho)).then(blob=>{if(ativo){endereco=URL.createObjectURL(blob);setUrl(endereco)}}).catch(()=>{if(ativo)setErro('Não foi possível abrir a prévia. Tente baixar o arquivo.')})
    return()=>{ativo=false;if(endereco)URL.revokeObjectURL(endereco)}
  },[arquivo?.caminho,ver])
  if(!arquivo)return null
  return <section className="arte-arquivo"><h4>{titulo}</h4><p className="muted">{arquivo.nome}</p>{erro&&<p role="alert">{erro}</p>}
    <button className="btn" onClick={()=>setVer(!ver)}>{ver?'Fechar prévia':'Abrir prévia do arquivo'}</button>{ver&&!url&&!erro&&<p role="status">Carregando arquivo…</p>}
    {url&&(arquivo.mime==='application/pdf'?<iframe title={titulo} src={url} sandbox="allow-same-origin"/>:<img src={url} alt={titulo}/>)}
    <button className="btn" onClick={()=>baixarPrivado(arquivo).catch(e=>setErro(e.message))}>Baixar {titulo.toLowerCase()}</button>
  </section>
}
