export function destinoAposLogin({user,perfil,carregando,erroPerfil}) {
  if(carregando)return null
  if(!user)return '/entrar'
  if(erroPerfil||!perfil)return null
  if(['gerente_operacional','analista_operacional','analista_cv','equipe_producao'].includes(perfil.papel))return '/producao'
  return ['admin','organizadora'].includes(perfil.papel)?'/modelos':'/meu-estande'
}
