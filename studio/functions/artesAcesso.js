function podeCV(perfil,feiraId){
  return perfil?.ativo!==false&&(perfil?.papel==='admin'||(perfil?.papel==='analista_cv'&&!!feiraId&&(perfil.feiraIds||[]).includes(feiraId)))
}
function podeConsultarArte(perfil,acesso){
  return acesso?.estado==='liberada'&&podeCV(perfil,acesso.feiraId)
}
module.exports={podeCV,podeConsultarArte}
