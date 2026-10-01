export function destinoAposLogin({user,perfil,carregando,erroPerfil}) {
  if(carregando)return null
  if(!user)return '/entrar'
  if(erroPerfil||!perfil)return null
  return perfil.papel==='admin'?'/modelos':'/meu-estande'
}
