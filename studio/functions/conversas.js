const {onCall,HttpsError}=require('firebase-functions/v2/https')
const {getFirestore,FieldValue,Timestamp}=require('firebase-admin/firestore')
const {randomUUID}=require('node:crypto')
function acesso(perfil,uid,clienteId,cliente){return perfil?.ativo!==false&&cliente?.papel==='expositor'&&(perfil?.papel==='admin'||(perfil?.papel==='expositor'&&uid===clienteId)||(perfil?.papel==='organizadora'&&perfil.organizadoraId&&perfil.organizadoraId===cliente.organizadoraId))}
exports.conversaCliente=onCall({region:'southamerica-east1'},async req=>{
  if(!req.auth)throw new HttpsError('unauthenticated','Faça login.')
  const db=getFirestore(),d=req.data||{},clienteId=d.clienteId||req.auth.uid
  if(typeof clienteId!=='string'||!clienteId||clienteId.includes('/'))throw new HttpsError('invalid-argument','Cliente inválido.')
  const ref=db.doc(`conversas/${clienteId}`)
  await db.runTransaction(async tx=>{
    const [u,c,s]=await Promise.all([tx.get(db.doc(`usuarios/${req.auth.uid}`)),tx.get(db.doc(`usuarios/${clienteId}`)),tx.get(ref)])
    const perfil=u.data(),cliente=c.data()
    if(!acesso(perfil,req.auth.uid,clienteId,cliente))throw new HttpsError('permission-denied','Conversa indisponível.')
    const antigo=s.data()||{},equipe=perfil.papel!=='expositor',dados={cliente:clienteId,clienteNome:cliente.empresa||cliente.nome||'Expositor',organizadoraId:cliente.organizadoraId||null,feiraId:cliente.feiraId||null}
    if(d.acao==='enviar'){
      const texto=typeof d.texto==='string'?d.texto.trim():''
      if(!texto||texto.length>2000)throw new HttpsError('invalid-argument','Escreva uma mensagem de até 2.000 caracteres.')
      const mensagemId=typeof d.mensagemId==='string'&&/^[a-zA-Z0-9-]{10,80}$/.test(d.mensagemId)?d.mensagemId:randomUUID(),msgRef=ref.collection('mensagens').doc(mensagemId)
      const existente=await tx.get(msgRef);if(existente.exists)return
      if(antigo.ultimoUid===req.auth.uid&&antigo.ultimaEm?.toMillis()>Date.now()-1000)throw new HttpsError('resource-exhausted','Aguarde um instante antes de enviar outra mensagem.')
      let propostaId=null
      if(d.propostaId){if(typeof d.propostaId!=='string'||d.propostaId.includes('/'))throw new HttpsError('invalid-argument','Proposta inválida.');const p=await tx.get(db.doc(`propostas/${d.propostaId}`));if(!p.exists||p.data().cliente!==clienteId)throw new HttpsError('permission-denied','Proposta não pertence à conversa.');propostaId=p.id}
      tx.create(msgRef,{texto,autor:req.auth.uid,papel:perfil.papel,nome:equipe?(perfil.nome||'Equipe USET'):(cliente.contatoNome||cliente.empresa||cliente.nome),propostaId,em:FieldValue.serverTimestamp()})
      Object.assign(dados,{ultimaMensagem:texto.slice(0,180),ultimoUid:req.auth.uid,ultimaEm:FieldValue.serverTimestamp(),pendenteCliente:equipe,pendenteEquipe:!equipe})
    }else if(d.acao==='ler'){
      // Só marca como lida a mensagem efetivamente exibida, nunca uma resposta
      // que chegou enquanto o painel estava carregando.
      if(d.ultimaEm===antigo.ultimaEm?.toMillis())dados[equipe?'pendenteEquipe':'pendenteCliente']=false
    }else if(d.acao!=='iniciar')throw new HttpsError('invalid-argument','Ação inválida.')
    if(!s.exists)Object.assign(dados,{criadoEm:Timestamp.now(),pendenteCliente:false,pendenteEquipe:false,...(d.acao==='enviar'?{pendenteCliente:equipe,pendenteEquipe:!equipe}:{})})
    tx.set(ref,dados,{merge:true})
  });return{ok:true,clienteId}
})
