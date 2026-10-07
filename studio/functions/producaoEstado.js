// A prova aprovada pertence a uma versão da arte e uma revisão do gabarito.
// Nenhum resultado enviado pelo navegador libera produção.
const EDITAVEIS = ['aguardando','devolvida','reprovada','contestada','recebida']
function transicao(area, acao, papel, dados={}) {
  const admin=papel==='admin', cliente=papel==='expositor'
  const exigir=(cond,mensagem)=>{if(!cond)throw Error(mensagem)}
  if(acao==='configurar'){
    exigir(admin,'Somente o admin confere medidas.')
    exigir(!['em_impressao','impressa'].includes(area.status),'A produção já começou.')
    return {status:'aguardando',versao:area.versao||0,prova:null,arquivo:null,relatorio:null,motivo:'',revisao:(area.revisao||0)+1}
  }
  if(acao==='enviar'){
    exigir(cliente&&area.confirmada&&EDITAVEIS.includes(area.status),'O envio não está liberado nesta etapa.')
    exigir(dados.revisao===area.revisao&&dados.versao===(area.versao||0),'O gabarito ou o envio mudou. Recarregue.')
    return {status:dados.contestar?'contestada':'recebida',versao:(area.versao||0)+1,prova:null}
  }
  if(acao==='prova'){
    exigir(admin&&['recebida','contestada','reprovada','em_prova'].includes(area.status)&&area.arquivo,'Envie uma arte antes da prova.')
    return {status:'em_prova',prova:dados.prova}
  }
  if(acao==='devolver'){
    exigir(admin&&['recebida','contestada','em_prova','reprovada'].includes(area.status),'Não é possível devolver esta arte.')
    exigir(dados.motivo?.trim(),'Explique o ajuste necessário.')
    return {status:'devolvida',prova:null,motivo:dados.motivo.trim()}
  }
  if(acao==='responder'){
    exigir(cliente&&area.status==='em_prova'&&dados.provaId===area.prova?.id&&dados.versao===area.versao,'Esta prova já mudou. Abra a versão atual.')
    exigir(dados.aprovar===true||dados.motivo?.trim(),'Explique o que deve mudar na prova.')
    return {status:dados.aprovar?'aprovada':'reprovada',motivo:dados.aprovar?'':dados.motivo.trim()}
  }
  if(acao==='impressao'){
    exigir(admin&&((area.status==='aprovada'&&dados.status==='em_impressao')||(area.status==='em_impressao'&&dados.status==='impressa')),'A impressão exige a aprovação da prova atual pelo cliente.')
    return {status:dados.status}
  }
  throw Error('Ação inválida.')
}
module.exports={transicao,EDITAVEIS}
