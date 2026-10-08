import {ehPerfilAppIrmao} from './papeis.js'

export function destinoAposLogin({user,perfil,carregando,erroPerfil}) {
  if(carregando)return null
  if(!user)return '/entrar'
  if(erroPerfil||!perfil)return null
  if(perfil.papel==='analista_cv')return '/artes'
  if(ehPerfilAppIrmao(perfil))return '/app-producao'
  return ['admin','organizadora'].includes(perfil.papel)?'/modelos':'/meu-estande'
}
