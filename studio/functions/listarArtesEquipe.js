// Resumo das propostas aprovadas para CV, sem preços nem distribuição de equipes.
const {onCall,HttpsError}=require('firebase-functions/v2/https')
const {getFirestore}=require('firebase-admin/firestore')
const {podeConsultarArte}=require('./artesAcesso')
exports.listarArtesEquipe=onCall({region:'southamerica-east1'},async req=>{
  if(!req.auth)throw new HttpsError('unauthenticated','Faça login.')
  const db=getFirestore(),perfil=(await db.doc(`usuarios/${req.auth.uid}`).get()).data()
  if(!perfil||perfil.ativo===false||perfil.papel!=='analista_cv')throw new HttpsError('permission-denied','Somente a comunicação visual pode consultar esta lista.')
  const feiras=[...new Set(perfil.feiraIds||[])].filter(id=>typeof id==='string'&&id&&!id.includes('/'))
  const paginas=await Promise.all(feiras.map(id=>db.collection('ordensProducao').where('feiraId','==',id).get()))
  return {propostas:paginas.flatMap(s=>s.docs).filter(s=>podeConsultarArte(perfil,s.data())).map(s=>{
    const o=s.data()
    return {id:o.propostaId,clienteNome:o.clienteNome,modeloNome:o.modeloNome,feira:o.feira||'',feiraId:o.feiraId}
  })}
})
