const {podeOperar,podeGerir}=require('./operacaoPolitica')
function permissoes(p,o,a={}) {
  const acesso=podeOperar(p,o),gestor=acesso&&podeGerir(p,o?.feiraId)
  const executar=acesso&&(gestor||p.papel==='produtor'||(p.papel==='mobiliario'&&a.especialidade==='mobiliario')||(p.papel==='analista_cv'&&a.especialidade==='cv')||(p.papel==='equipe_producao'&&(p.equipeIds||[]).includes(a.equipeId)))
  return{ler:acesso,criar:acesso&&p.papel!=='analista_projeto',executar,validar:gestor,aprovar:gestor||(acesso&&p.papel==='atendimento_comercial'),editar:gestor||(acesso&&a.autor===p.uid&&['aberta','aguardando_aprovacao'].includes(a.status)),anotar:gestor||(acesso&&p.papel==='analista_projeto')}
}
function transicao(p,o,a,status,nota='',automatica=false) {
  const m=permissoes(p,o,a)
  if(!m.ler)throw Error('Acesso indisponível.')
  if(a.revisao!==o.revisao)throw Error('Esta pendência pertence a uma revisão anterior.')
  const etapas={aguardando_aprovacao:['aberta','recusada'],aberta:['em_execucao'],em_execucao:['aguardando_validacao'],aguardando_validacao:['concluida','aberta'],concluida:['aberta'],recusada:['aguardando_aprovacao']}
  if(!(etapas[a.status]||[]).includes(status))throw Error('Siga as etapas de aprovação, execução e validação.')
  if(['aguardando_aprovacao','recusada'].includes(a.status)||status==='recusada'){if(!m.aprovar)throw Error('Apenas gestão e atendimento aprovam solicitações.');if(status==='recusada'&&!nota.trim())throw Error('Informe o motivo da recusa.')}
  else if(['concluida','aberta'].includes(status)){if(!m.validar)throw Error('Apenas a gestão valida ou reabre serviços.');if(status==='aberta'&&!nota.trim())throw Error('Informe o ajuste necessário.')}
  else if(!m.executar)throw Error('Seu acesso não permite executar este serviço.')
  return status==='aguardando_validacao'&&automatica?'concluida':status
}
module.exports={permissoes,transicao}
