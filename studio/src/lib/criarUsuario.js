import { executarComercial } from './comercial.js'

// Mantém o ponto de entrada anterior, agora com criação exclusiva no servidor.
export const criarExpositor = dados => executarComercial('cadastrarExpositor', dados)
export const MENSAGENS_CADASTRO = {
  'functions/already-exists': 'Este e-mail já possui acesso.',
  'functions/permission-denied': 'Somente o admin pode cadastrar expositores.',
}
