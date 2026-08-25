import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './firebase.js'

// Mesma região das funções em functions/index.js. Se divergir, a chamada sai
// para a região errada e volta como "not-found" — que é indistinguível de
// "ainda não publiquei as functions".
const REGIAO = 'southamerica-east1'

const fn = (nome) => httpsCallable(getFunctions(app, REGIAO), nome)

/**
 * As Functions são opcionais: exigem o plano Blaze do Firebase. Enquanto não
 * estiverem publicadas, o app precisa seguir funcionando com o caminho que roda
 * só no navegador — então distinguimos "função ausente" de "função com erro".
 */
export const SEM_FUNCTIONS = 'sem-functions'

function traduzir(ex) {
  if (ex?.code === 'functions/not-found' || ex?.code === 'functions/internal') {
    const e = new Error('As Cloud Functions ainda não estão publicadas.')
    e.code = SEM_FUNCTIONS
    return e
  }
  const e = new Error(ex?.message || 'Falha ao executar a operação.')
  e.code = ex?.code
  return e
}

/** Apaga perfil e login de uma vez. Só isto libera o e-mail para novo cadastro. */
export async function excluirExpositorTotal(uid) {
  try { return (await fn('excluirExpositor')({ uid })).data }
  catch (ex) { throw traduzir(ex) }
}

/** Define nova senha provisória, para quando o e-mail de redefinição não chega. */
export async function definirSenhaProvisoria(uid, senha) {
  try { return (await fn('definirSenhaProvisoria')({ uid, senha })).data }
  catch (ex) { throw traduzir(ex) }
}
