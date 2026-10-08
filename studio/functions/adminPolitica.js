function validarAlvo(autor, uid, acao) {
  if (typeof uid !== 'string' || !uid || uid.length > 128 || uid.includes('/')) throw Error('Usuário inválido.')
  if (uid === autor && ['acesso', 'sessoes', 'senha', 'excluir'].includes(acao)) throw Error('Sua própria conta não pode ser bloqueada ou excluída por aqui. Gerencie sua senha na tela Minha conta.')
}
function podeExcluirPagamento(p) {
  return !p || ['aguardando_integracao', 'cancelada', 'cancelado'].includes(p.status)
}
module.exports = { validarAlvo, podeExcluirPagamento }
