const ehGestor=p=>['admin','gerente_operacional','analista_operacional'].includes(p?.papel)
export const STATUS_PENDENCIAS={aguardando_aprovacao:'Aguarda aprovação do atendimento',aberta:'Aberta',em_execucao:'Em execução',aguardando_validacao:'Executada · aguarda validação',concluida:'Concluída e validada',recusada:'Recusada'}
export function permissoesPendencia(p,o,a={}){
  const gestor=ehGestor(p),papel=p?.papel
  return {criar:papel!=='analista_projeto',validar:gestor,aprovar:gestor||papel==='atendimento_comercial',anotar:gestor||papel==='analista_projeto',editar:gestor||(p?.uid===a.autor&&['aberta','aguardando_aprovacao'].includes(a.status)),executar:gestor||papel==='produtor'||(papel==='mobiliario'&&a.especialidade==='mobiliario')||(papel==='analista_cv'&&a.especialidade==='cv')||(papel==='equipe_producao'&&(p.equipeIds||[]).includes(a.equipeId))}
}

