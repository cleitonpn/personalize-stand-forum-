import {useEffect,useState} from 'react'
import {collection,onSnapshot} from 'firebase/firestore'
import {ref,uploadBytes} from 'firebase/storage'
import {db,storage} from '../lib/firebase.js'
import {operacao} from '../lib/operacao.js'
import {baixarPrivado} from '../lib/producao/envio.js'
export default function AnexosOperacionais({tipo,parentId,podeEnviar=true,podeRemover=false}){
  const [lista,setLista]=useState([]),[erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false)
  useEffect(()=>onSnapshot(collection(db,tipo,parentId,'anexos'),s=>setLista(s.docs.map(d=>({id:d.id,...d.data()}))),e=>setErro(e.message)),[tipo,parentId])
  async function enviar(f){setOcupado(true);setErro('');try{const mime=f.type||(/\.glb$/i.test(f.name)?'model/gltf-binary':'');const r=await operacao({acao:'reservarAnexo',tipo,parentId,bytes:f.size,mime,nome:f.name});await uploadBytes(ref(storage,r.caminho),f,{contentType:mime});await operacao({acao:'anexar',tipo,parentId,uploadId:r.uploadId})}catch(e){setErro(e.message)}finally{setOcupado(false)}}
  async function baixar(a){setErro('');try{await baixarPrivado(a)}catch(e){setErro(e.message)}}
  return <section className="operacao-anexos"><h3>Documentos e orientações</h3><p>PDF, fotos ou GLB · até 30 MB por arquivo.</p>{podeEnviar&&<label className="btn">{ocupado?'Enviando…':'Anexar arquivo'}<input type="file" hidden disabled={ocupado} accept=".pdf,.jpg,.jpeg,.png,.webp,.glb" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)enviar(f)}}/></label>}{!lista.length&&<p className="dim">Nenhum anexo.</p>}<ul>{lista.map(a=><li key={a.id}><button className="btn btn-ghost" onClick={()=>baixar(a)}>{a.nome}</button>{a.revisao&&<small>Versão {a.revisao}</small>}{podeRemover&&<button className="btn btn-sm" disabled={ocupado} onClick={async()=>{setOcupado(true);try{await operacao({acao:'removerAnexo',tipo,parentId,uploadId:a.id})}catch(e){setErro(e.message)}finally{setOcupado(false)}}}>Remover anexo</button>}</li>)}</ul>{erro&&<p role="alert">{erro}</p>}</section>
}
