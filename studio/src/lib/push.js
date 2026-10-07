import {executarComercial} from './comercial.js'
const chaveLocal='uset.push.dispositivo'
export const suportaPush=()=>typeof window!=='undefined'&&window.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window
async function registrar(subscription){const r=await executarComercial('notificacoesUsuario',{acao:'registrar',subscription:subscription.toJSON()});localStorage.setItem(chaveLocal,r.id)}
export async function ativarPush(){
  if(!suportaPush())throw Error('Este navegador não oferece push. Você pode consultar os avisos nesta tela.')
  const permissao=await Notification.requestPermission()
  if(permissao!=='granted')throw Error('O recebimento não foi autorizado. Você pode liberar as notificações nas configurações do navegador.')
  const reg=await navigator.serviceWorker.register('/push-sw.js',{updateViaCache:'none'});await navigator.serviceWorker.ready
  const {publicKey}=await executarComercial('notificacoesUsuario',{acao:'chave'})
  const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),key=Uint8Array.from(raw,c=>c.charCodeAt(0))
  const subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})
  await registrar(subscription)
}
export async function restaurarPush(){if(!suportaPush()||Notification.permission!=='granted')return;const reg=await navigator.serviceWorker.getRegistration('/');const s=await reg?.pushManager.getSubscription();if(s)await registrar(s)}
export async function desativarPush(){
  const id=localStorage.getItem(chaveLocal)
  if(suportaPush()){const reg=await navigator.serviceWorker.getRegistration('/');await (await reg?.pushManager.getSubscription())?.unsubscribe();for(const n of await reg?.getNotifications()||[])n.close()}
  localStorage.removeItem(chaveLocal)
  if(id)await executarComercial('notificacoesUsuario',{acao:'desativar',id})
}
