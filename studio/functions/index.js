// ============================================================================
//  Cloud Functions — o que o navegador não pode fazer.
//
//  Pelo cliente, deleteUser só age sobre quem está logado: não há como o admin
//  apagar a conta de outro usuário. Isso exige o Admin SDK, que só roda no
//  servidor. É a única razão desta função existir.
// ============================================================================

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore } = require('firebase-admin/firestore')

initializeApp()

const REGIAO = 'southamerica-east1'

/** O chamador é admin? Confere no Firestore, nunca no que o cliente afirma. */
async function exigirAdmin(auth) {
  if (!auth) throw new HttpsError('unauthenticated', 'Faça login para continuar.')
  const snap = await getFirestore().doc(`usuarios/${auth.uid}`).get()
  if (!snap.exists || snap.data().papel !== 'admin') {
    throw new HttpsError('permission-denied', 'Somente o time da montadora pode fazer isso.')
  }
}

/**
 * Exclui um expositor por completo: o perfil e o login.
 * Sem isto o login sobreviveria à exclusão do perfil e o e-mail ficaria preso,
 * impedindo cadastrar a mesma pessoa de novo.
 */
exports.excluirExpositor = onCall({ region: REGIAO }, async (req) => {
  await exigirAdmin(req.auth)

  const uid = req.data?.uid
  if (!uid) throw new HttpsError('invalid-argument', 'Informe o uid do expositor.')
  if (uid === req.auth.uid) {
    throw new HttpsError('failed-precondition', 'Você não pode excluir a própria conta por aqui.')
  }

  const ref = getFirestore().doc(`usuarios/${uid}`)
  const snap = await ref.get()
  if (snap.exists && snap.data().papel === 'admin') {
    throw new HttpsError('failed-precondition', 'Contas de administrador não são excluídas por aqui.')
  }

  // O perfil sai primeiro: se a remoção do login falhar, o acesso já está
  // bloqueado pelas regras, que exigem perfil existente.
  if (snap.exists) await ref.delete()

  try {
    await getAuth().deleteUser(uid)
  } catch (e) {
    // conta já removida no Console é sucesso, não erro
    if (e.code !== 'auth/user-not-found') throw e
  }

  return { ok: true }
})

/**
 * Define uma nova senha provisória, para quando o expositor não recebe o e-mail
 * de redefinição (caixa corporativa costuma barrar) e precisa da senha na mão.
 */
exports.definirSenhaProvisoria = onCall({ region: REGIAO }, async (req) => {
  await exigirAdmin(req.auth)

  const { uid, senha } = req.data || {}
  if (!uid || !senha) throw new HttpsError('invalid-argument', 'Informe uid e senha.')
  if (String(senha).length < 6) {
    throw new HttpsError('invalid-argument', 'A senha precisa ter pelo menos 6 caracteres.')
  }

  await getAuth().updateUser(uid, { password: String(senha) })
  await getFirestore().doc(`usuarios/${uid}`).update({ precisaTrocarSenha: true })

  return { ok: true }
})
