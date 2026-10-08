import { ref,uploadBytesResumable,getBlob } from 'firebase/storage'
import { storage } from '../firebase.js'
import { executarComercial } from '../comercial.js'
import {detectarFormato} from './core/arquivo.js'
import {salvarBlob} from '../baixarArquivo.js'
export const STATUS_ARTES={aguardando:'Aguardando arte',recebida:'Em conferência pela USET',contestada:'Revisão técnica solicitada',em_prova:'Aprove a prova',aprovada:'Prova aprovada',devolvida:'Ajuste o arquivo',reprovada:'Ajuste solicitado na prova',em_impressao:'Em impressão',impressa:'Impressa'}
export const formatarCm=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2})
export async function subirArquivo({propostaId,area,tipo,arquivo,aoProgresso}){
  const mime=({pdf:'application/pdf',png:'image/png',jpeg:'image/jpeg'})[detectarFormato(await arquivo.slice(0,8).arrayBuffer())]
  if(!mime||arquivo.size>(tipo==='arte'?300:30)*1024*1024)throw Error(`Envie PDF, PNG ou JPG de até ${tipo==='arte'?300:30} MB.`)
  const reserva=await executarComercial('artesProposta',{acao:'reservar',propostaId,areaId:area.id,tipo,bytes:arquivo.size,mime,nome:arquivo.name,revisao:area.revisao,versao:area.versao})
  await new Promise((resolve,reject)=>{const upload=uploadBytesResumable(ref(storage,reserva.caminho),arquivo,{contentType:mime});upload.on('state_changed',s=>aoProgresso?.(Math.round(s.bytesTransferred/s.totalBytes*100)),reject,resolve)})
  return reserva.uploadId
}
export async function baixarPrivado(arquivo){
  await salvarBlob(await getBlob(ref(storage,arquivo.caminho)),arquivo.nome||'arte')
}
export function perfilDaArea(area,perfis){const base=perfis.find(p=>p.id===area.perfilId)||perfis[0];return{...base,sangriaMm:area.sangriaMm??base.sangriaMm,margemMm:area.margemMm??base.margemMm,sangriaPropria:true}}
