export function destinoAposLogin({user,perfil,carregando,erroPerfil}) {
  if(carregando)return null
  if(!user)return '/entrar'
  if(erroPerfil||!perfil)return null
  return ['admin','organizadora'].includes(perfil.papel)?'/modelos':'/meu-estande'
}
