// Executado no deploy depois do novo frontend, com a conta de serviço do CI.
const { initializeApp } = require('firebase-admin/app')
initializeApp({
  projectId: process.env.GCLOUD_PROJECT || 'personalizacao-stand',
  storageBucket:
    process.env.STORAGE_BUCKET || 'personalizacao-stand.firebasestorage.app',
})
const { sincronizarArquivos, migrarPropostas } = require('./acessos.js')
async function main() {
  console.log(await sincronizarArquivos())
  console.log(await migrarPropostas())
}
main().catch((e) => {
  console.error('Migração de permissões falhou:', e.message)
  process.exitCode = 1
})
