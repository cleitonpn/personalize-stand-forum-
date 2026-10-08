import {areaDaSuperficie} from './glb/precos.js'

export const CATEGORIAS_QUANTIDADES=['Carpete','Bagum','Napa','Madeira','Lona','Adesivo','Vidro','Metal','Outros revestimentos','Ignorar']
export function levantarQuantidades(superficies,analise,recorte,cadastradas={},objetos=[]) {
  return Object.fromEntries((superficies||[]).map(s=>{
    const p=analise?.pecas?.find(p=>(s.pecas||[]).includes(p.chave)),movel=['movel','mobiliario','estrutura'].includes(s.tipoElemento)||objetos.some(o=>(o.pecas||[]).some(k=>(s.pecas||[]).includes(k)))
    const base={categoria:movel?'Ignorar':({piso:'Carpete',bagum:'Bagum',madeira:'Madeira',lona:'Lona',adesivo:'Adesivo',vidro:'Vidro',metal:'Metal'}[s.papel]||'Ignorar'),material:s.origem||s.nome,cor:p?.materialCor||'',codigo:'',areaM2:analise?Math.round(areaDaSuperficie(s,analise,recorte)*10000)/10000:null,origem:'glb',manual:false,manterSobArte:!['bagum','lona','adesivo'].includes(s.papel)}
    return [s.id,cadastradas[s.id]?.manual?{...base,...cadastradas[s.id]}:analise?base:{...base,...cadastradas[s.id]}]
  }))
}
