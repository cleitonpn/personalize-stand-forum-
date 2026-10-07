const {createHash}=require('node:crypto')
function destinoValido(endpoint){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&endpoint.length<=4096&&(['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname)||/^[a-z0-9.-]+\.notify\.windows\.com$/.test(u.hostname))}catch{return false}}
function destinatarios(usuarios,evento){return usuarios.filter(u=>u.ativo!==false&&u.id!==evento.autor&&((evento.alvo==='cliente'&&u.id===evento.cliente)||(evento.alvo==='equipe'&&(u.papel==='admin'||(u.papel==='organizadora'&&evento.organizadoraId&&u.organizadoraId===evento.organizadoraId))))).map(u=>u.id)}
const chave=(evento,uid)=>createHash('sha256').update(`${evento}|${uid}`).digest('hex')
module.exports={destinoValido,destinatarios,chave}
