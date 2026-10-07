self.addEventListener('push',event=>{
  let d={};try{d=event.data?.json()||{}}catch{}
  const url=typeof d.url==='string'&&d.url.startsWith('/')&&!d.url.startsWith('//')?d.url:'/notificacoes'
  event.waitUntil(self.registration.showNotification(d.titulo||'USET Studio',{body:d.corpo||'Há uma atualização no seu projeto.',tag:d.id||'uset',data:{url}}))
})
self.addEventListener('notificationclick',event=>{
  event.notification.close()
  const destino=new URL(event.notification.data?.url||'/notificacoes',self.location.origin)
  if(destino.origin!==self.location.origin)return
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async lista=>{for(const c of lista){if(new URL(c.url).origin===destino.origin){await c.navigate(destino.href);return c.focus()}}return self.clients.openWindow(destino.href)}))
})
