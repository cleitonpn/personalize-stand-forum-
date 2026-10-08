const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')
const { validarAlvo } = require('./adminPolitica')
const { sincronizarArquivos } = require('./acessos')

const colecoes = { usuario: 'usuarios', feira: 'feiras', organizadora: 'organizadoras' }
function identificador(v) {
  if (typeof v !== 'string' || !v || v.length > 128 || v.includes('/')) throw new HttpsError('invalid-argument', 'Cadastro inválido.')
  return v
}
async function exigirAdmin(req, tx) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Faça login.')
  const ref = getFirestore().doc(`usuarios/${req.auth.uid}`), s = tx ? await tx.get(ref) : await ref.get()
  if (s.data()?.papel !== 'admin' || s.data().ativo === false) throw new HttpsError('permission-denied', 'Somente o admin pode excluir cadastros.')
}
function confirmar(d, alvo) {
  const esperado = d.tipo === 'usuario' ? alvo.email || d.id : alvo.nome || d.id
  if (typeof d.confirmacao !== 'string' || d.confirmacao.trim() !== esperado) throw new HttpsError('failed-precondition', 'Confira o cadastro e digite a confirmação indicada na tela.')
}
async function consultar(db, d, tx) {
  const ler = ref => tx ? tx.get(ref) : ref.get()
  const ref = db.doc(`${colecoes[d.tipo]}/${d.id}`), s = await ler(ref)
  const arquivo = d.tipo === 'usuario' ? await ler(db.doc(`usuariosExcluidos/${d.id}`)) : null
  if (!s.exists && !arquivo?.exists) throw new HttpsError('not-found', 'Cadastro não encontrado.')
  const alvo = s.data() || arquivo.data()
  const campo = d.tipo === 'usuario' ? 'cliente' : d.tipo === 'feira' ? 'feiraId' : 'organizadoraId'
  const [propostas, retiradas] = await Promise.all(['propostas', 'propostasExcluidas'].map(c => ler(db.collection(c).where(campo, '==', d.id))))
  const usuarios = d.tipo === 'usuario' ? null : await ler(db.collection('usuarios').where(campo, '==', d.id))
  const feiras = d.tipo === 'organizadora' ? await ler(db.collection('feiras').where('organizadoraId', '==', d.id)) : null
  const dependentes = usuarios?.docs.filter(u => d.tipo !== 'organizadora' || u.data().papel !== 'organizadora') || []
  const feirasAtivas = feiras?.docs.filter(f => !f.data().excluidaEm) || []
  const logins = d.tipo === 'usuario' ? s.exists ? [s] : [] : d.tipo === 'organizadora' ? usuarios.docs.filter(u => u.data().papel === 'organizadora') : []
  const bloqueios = []
  if (dependentes.length) bloqueios.push(`Há ${dependentes.length} usuário(s) vinculado(s). Reatribua os expositores ou exclua esses usuários primeiro, inclusive os bloqueados.`)
  if (feirasAtivas.length) bloqueios.push(`Há ${feirasAtivas.length} feira(s) vinculada(s). Exclua essas feiras primeiro.`)
  if (logins.some(u => u.id === d.autor)) bloqueios.push('Você não pode excluir sua própria conta.')
  return { ref, s, arquivo, alvo, logins, dependentes, feirasAtivas, resumo: {
    nome: alvo.nome || alvo.empresa || alvo.email || d.id,
    confirmacao: d.tipo === 'usuario' ? alvo.email || d.id : alvo.nome || d.id,
    propostas: propostas.size + retiradas.size, usuarios: dependentes.length, feiras: feirasAtivas.length,
    logins: logins.length, excluido: !!alvo.excluidaEm && !s.exists || d.tipo !== 'usuario' && !!alvo.excluidaEm,
    exclusaoPendente: alvo.exclusaoPendente === true, bloqueios,
    vinculados: [...dependentes.slice(0, 10).map(u => ({ nome: u.data().empresa || u.data().nome || u.data().email || u.id, tipo: 'usuario' })), ...feirasAtivas.slice(0, 10).map(f => ({ nome: f.data().nome || f.id, tipo: 'feira' }))],
  } }
}
function iniciarLogin(tx, req, s) {
  if (s.data().exclusaoPendente) return
  tx.set(getFirestore().doc(`usuariosExcluidos/${s.id}`), { ...s.data(), ativo: false, excluidaPor: req.auth.uid, excluidaEm: FieldValue.serverTimestamp(), estadoExclusao: 'pendente' })
  tx.update(s.ref, { ativo: false, exclusaoPendente: true })
}
async function concluirLogin(req, uid) {
  const db = getFirestore(), auth = getAuth()
  try { await auth.deleteUser(uid) }
  catch (e) {
    if (e.code !== 'auth/user-not-found') throw new HttpsError('internal', 'O acesso já está bloqueado, mas o login não pôde ser removido. Repita a exclusão para concluir.')
  }
  // Cancela convites ainda não enviados e elimina assinaturas de dispositivos.
  const [emails, dispositivos] = await Promise.all([
    db.collection('emailsSaida').where('destinatarioId', '==', uid).get(),
    db.collection('dispositivosPush').where('uid', '==', uid).get(),
  ])
  const operacoes = [...emails.docs.filter(s => ['pendente', 'pendente_integracao'].includes(s.data().status)).map(s => [s.ref, { status: 'cancelado', motivo: 'usuario_excluido' }]), ...dispositivos.docs.map(s => [s.ref, null])]
  for (let i = 0; i < operacoes.length; i += 400) {
    const batch = db.batch()
    for (const [ref, dados] of operacoes.slice(i, i + 400)) dados ? batch.update(ref, dados) : batch.delete(ref)
    await batch.commit()
  }
  await db.runTransaction(async tx => {
    await exigirAdmin(req, tx)
    const ref = db.doc(`usuarios/${uid}`), arquivo = db.doc(`usuariosExcluidos/${uid}`)
    const [s, a] = await Promise.all([tx.get(ref), tx.get(arquivo)])
    if (!a.exists || s.exists && !s.data().exclusaoPendente) throw new HttpsError('failed-precondition', 'O cadastro mudou. Confira antes de tentar novamente.')
    const perfil = s.data() || a.data(), orgRef = perfil.papel === 'organizadora' ? db.doc(`organizadoras/${perfil.organizadoraId || uid}`) : null
    const org = orgRef ? await tx.get(orgRef) : null
    const outros = org?.exists ? await tx.get(db.collection('usuarios').where('organizadoraId', '==', org.id)) : null
    if (org?.exists) tx.update(org.ref, { loginExcluido: !outros.docs.some(u => u.id !== uid && u.data().papel === 'organizadora' && !u.data().exclusaoPendente) })
    if (s.exists) tx.delete(ref)
    if (a.data().estadoExclusao !== 'concluida') {
      tx.update(arquivo, { estadoExclusao: 'concluida', concluidaEm: FieldValue.serverTimestamp() })
      tx.create(db.collection('auditoriaAdmin').doc(), { autor: req.auth.uid, acao: 'excluir_usuario', alvo: uid, em: FieldValue.serverTimestamp() })
    }
  })
}

async function gerenciarCadastro(req) {
  await exigirAdmin(req)
  const d = { ...req.data, autor: req.auth.uid }, db = getFirestore()
  if (!['usuario', 'feira', 'organizadora'].includes(d.tipo) || !['consultar', 'excluir'].includes(d.acao)) throw new HttpsError('invalid-argument', 'Operação inválida.')
  identificador(d.id)
  if (d.tipo === 'usuario') {
    try { validarAlvo(req.auth.uid, d.id, 'excluir') } catch (e) { throw new HttpsError('failed-precondition', e.message) }
  }
  if (d.acao === 'consultar') return (await consultar(db, d)).resumo
  let uids = []
  await db.runTransaction(async tx => {
    await exigirAdmin(req, tx)
    const r = await consultar(db, d, tx)
    confirmar(d, r.alvo)
    if (r.resumo.bloqueios.length) throw new HttpsError('failed-precondition', r.resumo.bloqueios.join(' '))
    uids = r.logins.map(s => s.id)
    if (d.tipo === 'usuario') {
      if (r.s.exists) iniciarLogin(tx, req, r.s)
      else uids = [d.id] // Permite retomar uma falha após remover o perfil.
      return
    }
    if (r.logins.length > 100) throw new HttpsError('failed-precondition', 'Exclua os acessos desta organizadora pela tela de usuários antes de excluir o cadastro.')
    const orgId = d.tipo === 'organizadora' ? d.id : r.alvo.organizadoraId
    const valido = typeof orgId === 'string' && orgId && !orgId.includes('/')
    const feiras = valido ? await tx.get(db.collection('feiras').where('organizadoraId', '==', orgId)) : { docs: [] }
    const modelos = valido ? await tx.get(db.collection('modelos').where('organizadoraIds', 'array-contains', orgId)) : { docs: [], size: 0 }
    if (modelos.size + r.logins.length * 2 > 450) throw new HttpsError('failed-precondition', 'Remova os vínculos de projetos ou os acessos antes de excluir este cadastro.')
    for (const m of modelos.docs) {
      const manter = d.tipo === 'feira' && feiras.docs.some(f => f.id !== d.id && !f.data().excluidaEm && f.data().ativo !== false && f.data().modeloIds?.includes(m.id))
      if (!manter) tx.update(m.ref, { organizadoraIds: FieldValue.arrayRemove(orgId) })
    }
    if (!r.alvo.excluidaEm) {
      tx.update(r.ref, { ativo: false, excluidaEm: FieldValue.serverTimestamp(), excluidaPor: req.auth.uid })
      tx.create(db.collection('auditoriaAdmin').doc(), { autor: req.auth.uid, acao: `excluir_${d.tipo}`, alvo: d.id, em: FieldValue.serverTimestamp() })
    }
    for (const s of r.logins) iniciarLogin(tx, req, s)
  })
  for (const uid of uids) await concluirLogin(req, uid)
  if (d.tipo !== 'usuario') await sincronizarArquivos()
  return { ok: true }
}

exports.excluirCadastroAdmin = onCall({ region: 'southamerica-east1', timeoutSeconds: 300 }, gerenciarCadastro)
// Compatibilidade com a tela antiga de gestão de expositores; mesma proteção.
exports.excluirExpositor = onCall({ region: 'southamerica-east1', timeoutSeconds: 300 }, async req => {
  await exigirAdmin(req)
  const uid = identificador(req.data?.uid), db = getFirestore()
  const s = await db.doc(`usuarios/${uid}`).get(), a = s.exists ? s : await db.doc(`usuariosExcluidos/${uid}`).get()
  if (a.exists && a.data().papel !== 'expositor') throw new HttpsError('failed-precondition', 'Esta operação exclui somente contas de expositor.')
  return gerenciarCadastro({ ...req, data: { tipo: 'usuario', id: uid, acao: 'excluir', confirmacao: a.data()?.email || uid } })
})
