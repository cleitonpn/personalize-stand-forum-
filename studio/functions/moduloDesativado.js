// Mantém o nome publicado para impedir gravações por APKs antigos.
// Nenhum cadastro, equipe, bloco ou pendência é alterado por este endpoint.
const {onCall,HttpsError}=require('firebase-functions/v2/https')
exports.operacao=onCall({region:'southamerica-east1'},async req=>{
  if(!req.auth)throw new HttpsError('unauthenticated','Faça login.')
  throw new HttpsError('failed-precondition','A gestão da produção foi retirada do Personalização. Equipes, blocos e pendências serão gerenciados no app irmão.')
})
