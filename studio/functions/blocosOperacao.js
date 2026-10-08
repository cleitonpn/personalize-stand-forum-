const {getFirestore,Timestamp}=require('firebase-admin/firestore')
const {HttpsError}=require('firebase-functions/v2/https')
const {randomUUID}=require('node:crypto')
const {podeGerir,podeOperar}=require('./operacaoPolitica')
const id=v=>{if(typeof v!=='string'||!v||v.length>180||v.includes('/'))throw new HttpsError('invalid-argument','Identificador inválido.');return v}
const ids=(v,max=30)=>{if(!Array.isArray(v)||v.length>max)throw new HttpsError('invalid-argument','Quantidade de vínculos inválida.');return [...new Set(v.map(id))]}
exports.atribuir=async(req,{perfil})=>{
  const db=getFirestore(),d=req.data||{},p=await perfil(req),feiraId=id(d.feiraId),nome=String(d.nome||'').trim().slice(0,120)
  if(!podeGerir(p,feiraId))throw new HttpsError('permission-denied','Apenas gestão da feira distribui blocos.')
  const equipeIds=ids(d.equipeIds),alvos=d.estandes
  if(!nome||!equipeIds.length||!Array.isArray(alvos)||!alvos.length||alvos.length>400||!['adicionar','substituir'].includes(d.modo))throw new HttpsError('invalid-argument','Informe nome, equipes, modo e até 400 estandes.')
  if(new Set(alvos.map(a=>id(a.id))).size!==alvos.length||alvos.some(a=>!Number.isSafeInteger(a.revisao)||a.revisao<1))throw new HttpsError('invalid-argument','Seleção de estandes inválida.')
  const blocoId=d.blocoId?id(d.blocoId):randomUUID(),blocoRef=db.doc(`blocosOperacionais/${blocoId}`),bloco=await blocoRef.get()
  if(bloco.exists&&bloco.data().feiraId!==feiraId)throw new HttpsError('permission-denied','Bloco pertence a outra feira.')
  const aplicadas=[],falhas=[],operacaoId=randomUUID()
  // Até 120 gravações por transação. Uma feira de 300 estandes não ultrapassa
  // o limite do Firestore e revisões concorrentes nunca são sobrescritas.
  for(let inicio=0;inicio<alvos.length;inicio+=40){
    const lote=alvos.slice(inicio,inicio+40)
    try{
      await db.runTransaction(async tx=>{
        const u=await perfil(req,tx),b=await tx.get(blocoRef),feira=await tx.get(db.doc(`feiras/${feiraId}`))
        if(!podeGerir(u,feiraId)||!feira.exists||(b.exists&&b.data().feiraId!==feiraId))throw new HttpsError('permission-denied','A distribuição não está mais liberada.')
        const equipes=await Promise.all(equipeIds.map(e=>tx.get(db.doc(`equipesOperacionais/${e}`)))),ordens=await Promise.all(lote.map(a=>tx.get(db.doc(`ordensProducao/${a.id}`))))
        if(equipes.some(e=>!e.exists||e.data().ativo===false||!(e.data().feiraIds||[]).includes(feiraId)))throw new HttpsError('failed-precondition','Equipe inativa ou sem vínculo com esta feira.')
        if(ordens.some((s,i)=>!s.exists||s.data().estado!=='liberada'||s.data().feiraId!==feiraId||s.data().revisao!==lote[i].revisao))throw new HttpsError('failed-precondition','Um estande mudou de revisão, feira ou aprovação. Atualize a seleção.')
        for(const s of ordens){const o=s.data(),equipes=d.modo==='substituir'?equipeIds:[...new Set([...(o.equipeIds||[]),...equipeIds])];if(equipes.length>30)throw new HttpsError('failed-precondition','Um estande ultrapassaria o limite de 30 equipes.');tx.update(s.ref,{blocoId,blocoNome:nome,equipeIds:equipes,atualizadoEm:Timestamp.now()});tx.set(db.doc(`acessosProducao/${o.propostaId}`),{equipeIds:equipes},{merge:true});tx.create(s.ref.collection('eventos').doc(),{acao:'distribuicao_bloco',blocoId,blocoNome:nome,equipeIds:equipes,modo:d.modo,operacaoId,revisao:o.revisao,autor:req.auth.uid,autorNome:u.nome||u.email||'Gestão USET',em:Timestamp.now()})}
        tx.set(blocoRef,{nome,feiraId,equipeIds,atualizadoPor:req.auth.uid,atualizadoEm:Timestamp.now()},{merge:true})
      });aplicadas.push(...lote.map(a=>a.id))
    }catch(e){falhas.push(...lote.map(a=>({id:a.id,motivo:e.message||'Não foi possível aplicar este lote.'})))}
  }
  if(!aplicadas.length)throw new HttpsError('failed-precondition',falhas[0]?.motivo||'Nenhum estande foi alterado.')
  try{
    const {gravarEvento,entregarEventos}=require('./notificacoes'),usuarios=(await db.collection('usuarios').where('ativo','==',true).get()).docs,avisosPorUsuario=new Map(),ordensAtualizadas=await db.getAll(...aplicadas.map(v=>db.doc(`ordensProducao/${v}`)),{fieldMask:['cliente','estado','feiraId','equipeIds','produtorIds','atendimentoIds','propostaId','organizadoraId']})
    for(const s of ordensAtualizadas){const o=s.data(),ordemId=s.id;for(const u of usuarios){if(u.id!==req.auth.uid&&podeOperar({...u.data(),uid:u.id},o)&&!avisosPorUsuario.has(u.id))avisosPorUsuario.set(u.id,{id:randomUUID(),autor:req.auth.uid,alvo:'operacao',tipo:'distribuicao_bloco',cliente:o.cliente,organizadoraId:o.organizadoraId||null,propostaId:o.propostaId,ordemId,titulo:'Distribuição por bloco atualizada',corpo:`Confira sua distribuição no bloco ${nome}.`,url:'/producao',destinatarios:[u.id]})}}
    let avisos=[];await db.runTransaction(async tx=>{for(const evento of avisosPorUsuario.values())avisos.push(...gravarEvento(tx,evento))});await entregarEventos(avisos)
  }catch(e){require('firebase-functions/logger').warn('Distribuição aplicada; houve falha ao preparar os avisos.',{blocoId,mensagem:e.message})}
  return {blocoId,aplicadas,falhas}
}
