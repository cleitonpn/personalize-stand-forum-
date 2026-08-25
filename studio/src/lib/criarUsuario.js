import { initializeApp, deleteApp, getApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'

/**
 * Cria o acesso de um expositor sem derrubar a sessão do admin.
 *
 * createUserWithEmailAndPassword autentica imediatamente como o usuário recém
 * criado — se usarmos a instância principal, o admin é deslogado no meio do
 * cadastro. A saída é abrir uma SEGUNDA instância do Firebase só para isso:
 * ela tem seu próprio estado de autenticação, cria o usuário, e é descartada
 * em seguida. A sessão do admin na instância principal nem toma conhecimento.
 *
 * A alternativa seria uma Cloud Function com o Admin SDK, que é o caminho certo
 * quando houver backend; por ora isto resolve sem nova infraestrutura.
 */
export async function criarExpositor({ nome, email, senha, feira, modeloId, criadoPor }) {
  const principal = getApp()
  const secundario = initializeApp(principal.options, `cadastro-${Date.now()}`)

  try {
    const auth = getAuth(secundario)
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), senha)
    const uid = cred.user.uid

    // O perfil é gravado pela sessão do ADMIN (db principal), não pela
    // secundária — as regras exigem admin para escrever em /usuarios.
    await setDoc(doc(db, 'usuarios', uid), {
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      papel: 'expositor',
      feira: feira?.trim() || null,
      modeloId: modeloId || null,
      // senha provisória: o expositor troca no primeiro acesso
      precisaTrocarSenha: true,
      criadoEm: serverTimestamp(),
      criadoPor: criadoPor || null,
    })

    await signOut(auth)
    return { uid }
  } finally {
    await deleteApp(secundario).catch(() => {})
  }
}

export const MENSAGENS_CADASTRO = {
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'permission-denied': 'Usuário criado, mas sem permissão para gravar o perfil. Confira as regras do Firestore.',
}
