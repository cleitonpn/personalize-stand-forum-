function validarAlvo(autor, uid, acao) {
  if (typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/')) throw Error('Usuário inválido.')
  if (uid === autor && ['acesso', 'sessoes', 'senha'].includes(acao)) throw Error('Gerencie sua própria senha na tela Minha conta. Seu próprio acesso não pode ser bloqueado por aqui.')
}
function podeExcluirPagamento(p) {
  return !p || ['aguardando_integracao', 'cancelada', 'cancelado'].includes(p.status)
}
module.exports = { validarAlvo, podeExcluirPagamento }
