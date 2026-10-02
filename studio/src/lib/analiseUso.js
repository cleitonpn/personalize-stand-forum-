import { ETAPAS } from './jornada.js'
export const ACOES=['reinicio','alteracao','desfazer','refazer','ajuda','upload_erro','envio_erro','glb_erro','cliques_repetidos','envio','carregamento']
export const mediana=ns=>{const a=ns.filter(Number.isFinite).sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length?(a.length%2?a[m]:(a[m-1]+a[m])/2):0}
const ms=ts=>ts?.toMillis?.()??(typeof ts==='number'?ts:0)
export function analisarUso(sessoes,agora=Date.now()){
  const finalizadas=sessoes.filter(s=>s.enviou)
  const etapas=ETAPAS.map(e=>{
    const visitas=sessoes.filter(s=>(s.etapas?.[e.id]?.visitas||0)>0)
    const semEnvio=visitas.filter(s=>!s.enviou&&s.ultimaEtapa===e.id&&agora-ms(s.atualizadoEm)>30*60*1000)
    const concluidas=visitas.filter(s=>s.etapas[e.id].concluiu)
    const repetidas=visitas.filter(s=>(s.etapas[e.id].visitas||0)>2)
    const erros=visitas.filter(s=>(s.etapas[e.id].erros||0)>0)
    const tempo=mediana(visitas.map(s=>s.etapas[e.id].segundos||0))
    const taxa=visitas.length?semEnvio.length/visitas.length:0
    const score=visitas.length<5?null:Math.round(100*(taxa*.5+erros.length/visitas.length*.3+repetidas.length/visitas.length*.2))
    return {...e,visitas:visitas.length,concluidas:concluidas.length,semEnvio:semEnvio.length,repetidas:repetidas.length,erros:erros.length,tempo,score}
  })
  return {total:sessoes.length,enviadas:finalizadas.length,usuarios:new Set(sessoes.map(s=>s.uid)).size,
    mediana:mediana(sessoes.map(s=>s.segundos||0)),etapas,
    sugestoes:etapas.filter(e=>e.score!=null&&e.score>=20).sort((a,b)=>b.score-a.score).map(e=>({etapa:e.nome,score:e.score,texto:e.erros?`Reproduzir os erros em ${e.nome} antes de alterar o layout.`:e.repetidas?`Rever os nomes e a explicação das opções em ${e.nome}; há retornos repetidos.`:`Testar a clareza do próximo passo em ${e.nome}; há sessões sem envio que pararam aqui.`}))}
}
