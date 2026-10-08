import {PushNotifications} from '@capacitor/push-notifications'
import {executarComercial} from './comercial.js'
const chaveLocal='uset.push.dispositivo'
let acaoListener,registroEmAndamento
async function registrar(){
  if(registroEmAndamento)return registroEmAndamento
  registroEmAndamento=(async()=>{
    if(!acaoListener)acaoListener=await PushNotifications.addListener('pushNotificationActionPerformed',({notification})=>{const url=notification.data?.url;if(typeof url==='string'&&/^\/(producao|artes|notificacoes|propostas|equipes|atendimento|modelos|meu-estande)(\/|$)/.test(url))window.location.assign(url)})
    let ok,falha,timer
    try{
      const token=await new Promise(async(resolve,reject)=>{
        try{ok=await PushNotifications.addListener('registration',t=>resolve(t.value));falha=await PushNotifications.addListener('registrationError',()=>reject(Error('Não foi possível registrar o push Android. Confira a configuração Firebase do aplicativo.')));timer=setTimeout(()=>reject(Error('O registro Android não respondeu. Tente novamente com conexão.')),15000);await PushNotifications.register()}catch(e){reject(e)}
      })
      const r=await executarComercial('notificacoesUsuario',{acao:'registrarNativo',token,plataforma:'android'});localStorage.setItem(chaveLocal,r.id)
    }finally{clearTimeout(timer);await ok?.remove();await falha?.remove()}
  })().finally(()=>{registroEmAndamento=null})
  return registroEmAndamento
}
export async function ativarPushNativo(){let p=await PushNotifications.checkPermissions();if(p.receive!=='granted')p=await PushNotifications.requestPermissions();if(p.receive!=='granted')throw Error('Autorize as notificações nas configurações do Android.');await registrar()}
export async function restaurarPushNativo(){if((await PushNotifications.checkPermissions()).receive==='granted')await registrar()}
export async function desativarPushNativo(){const id=localStorage.getItem(chaveLocal);if(id)await executarComercial('notificacoesUsuario',{acao:'desativar',id});await PushNotifications.unregister();await PushNotifications.removeAllDeliveredNotifications();localStorage.removeItem(chaveLocal)}
