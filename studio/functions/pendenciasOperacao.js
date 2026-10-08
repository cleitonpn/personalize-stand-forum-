const {getFirestore,Timestamp,FieldValue}=require('firebase-admin/firestore')
const {getStorage}=require('firebase-admin/storage')
const {HttpsError}=require('firebase-functions/v2/https')
const {randomUUID}=require('node:crypto')
const {podeOperar,podeGerir}=require('./operacaoPolitica')
const {permissoes,transicao}=require('./pendenciaPolitica')
const {revogarLinks}=require('./acessos')
const {gravarEvento,entregarEventos}=require('./notificacoes')
const id=v=>{if(typeof v!=='string'||!v||v.length>180||v.includes('/'))throw new HttpsError('invalid-argument','Identificador inválido.');return v}
const texto=(v,max=2000)=>String(v||'').trim().slice(0,max)
const exigir=v=>{if(!v)throw new HttpsError('permission-denied','Ação não permitida para seu acesso.')}
const tempo=v=>v?.toMillis?.()||null
exports.executar=async function(req,{perfil,avisoOperacional}) {
  const db=getFirestore(),d=req.data||{},p=await perfil(req)
  if(d.acao==='relatorio'){
    const ordens=p.papel==='admin'?(await db.collection('ordensProducao').get()).docs:(await Promise.all((p.feiraIds||[]).map(f=>db.collection('ordensProducao').where('feiraId','==',f).get()))).flatMap(s=>s.docs)
    const permitidas=ordens.filter(s=>podeOperar(p,s.data())&&(!d.feiraId||s.data().feiraId===d.feiraId)&&(!d.depois||s.id>d.depois)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),pagina=permitidas.slice(0,100)
    const linhas=(await Promise.all(pagina.map(async s=>{
      const ps=await s.ref.collection('pendencias').get(),o=s.data()
      return ps.docs.map(a=>{const x=a.data();return{id:a.id,ordemId:s.id,clienteNome:o.clienteNome,feira:o.feira,feiraId:o.feiraId,localizacao:o.localizacao,...x,criadoEm:tempo(x.criadoEm),executadoEm:tempo(x.executadoEm),validadoEm:tempo(x.validadoEm),atualizadoEm:tempo(x.atualizadoEm),revisaoAtual:o.revisao}})
    }))).flat()
    return{linhas,proximaPagina:permitidas.length>pagina.length?pagina.at(-1).id:null}
  }
  const ordemRef=db.doc(`ordensProducao/${id(d.ordemId)}`),s=await ordemRef.get(),o=s.data()
  exigir(podeOperar(p,o))
  if(d.revisao!==o.revisao)throw new HttpsError('failed-precondition','A versão aprovada mudou. Recarregue a ordem.')
  if(d.acao==='atribuirResponsaveis'){
    exigir(podeGerir(p,o.feiraId))
    const produtorIds=[...new Set(d.produtorIds||[])],atendimentoIds=[...new Set(d.atendimentoIds||[])]
    if(produtorIds.length>20||atendimentoIds.length>20)throw new HttpsError('invalid-argument','Selecione até 20 responsáveis por tipo.')
    await db.runTransaction(async tx=>{
      const u=await perfil(req,tx),ordem=await tx.get(ordemRef),atual=ordem.data()
      exigir(podeGerir(u,atual?.feiraId)&&atual?.estado==='liberada')
      if(atual.revisao!==d.revisao)throw new HttpsError('failed-precondition','A revisão mudou.')
      const conferir=async(list,papel)=>{for(const uid of list){const v=await tx.get(db.doc(`usuarios/${id(uid)}`));if(!v.exists||v.data().ativo===false||v.data().papel!==papel||!(v.data().feiraIds||[]).includes(atual.feiraId))throw new HttpsError('invalid-argument','Responsável sem permissão para esta feira.')}}
      await conferir(produtorIds,'produtor');await conferir(atendimentoIds,'atendimento_comercial')
      tx.update(ordemRef,{produtorIds,atendimentoIds,atualizadoEm:Timestamp.now()});tx.set(db.doc(`acessosProducao/${atual.propostaId}`),{produtorIds,atendimentoIds},{merge:true})
      tx.create(ordemRef.collection('eventos').doc(),{acao:'responsaveis',autor:req.auth.uid,autorNome:texto(u.nome||u.email||'Equipe USET',180),produtorIds,atendimentoIds,revisao:atual.revisao,em:Timestamp.now()})
    })
  } else if(d.acao==='configurarValidacao') {
    exigir(podeGerir(p,o.feiraId));if(typeof d.automatica!=='boolean')throw new HttpsError('invalid-argument','Informe a configuração de validação.')
    await db.runTransaction(async tx=>{const u=await perfil(req,tx),ordem=await tx.get(ordemRef);exigir(podeGerir(u,ordem.data()?.feiraId)&&ordem.data()?.estado==='liberada');if(ordem.data().revisao!==d.revisao)throw new HttpsError('failed-precondition','A revisão mudou.');tx.set(db.doc(`feiras/${o.feiraId}`),{validacaoAutomatica:d.automatica},{merge:true});tx.create(ordemRef.collection('eventos').doc(),{acao:'validacao_automatica',valor:d.automatica,autor:req.auth.uid,autorNome:texto(u.nome||u.email||'Equipe USET',180),revisao:o.revisao,em:Timestamp.now()})})
  } else if(d.acao==='notaAnalista') {
    exigir(permissoes(p,o).anotar);if(!texto(d.nota,4000))throw new HttpsError('invalid-argument','Escreva uma orientação.')
    await db.runTransaction(async tx=>{const u=await perfil(req,tx),ordem=await tx.get(ordemRef);exigir(permissoes(u,ordem.data()).anotar);if(ordem.data().revisao!==d.revisao)throw new HttpsError('failed-precondition','A revisão mudou.');tx.create(ordemRef.collection('eventos').doc(),{acao:'orientacao_analista',nota:texto(d.nota,4000),autor:req.auth.uid,autorNome:texto(u.nome||u.email||'Equipe USET',180),revisao:o.revisao,em:Timestamp.now()})})
  } else if(d.acao==='concluirEstande') {
    exigir(podeGerir(p,o.feiraId)||p.papel==='produtor')
    if(d.reabrir){exigir(podeGerir(p,o.feiraId));if(!texto(d.nota))throw new HttpsError('invalid-argument','Informe o motivo da reabertura.')}
    await db.runTransaction(async tx=>{
      const u=await perfil(req,tx),ordem=await tx.get(ordemRef),ps=await tx.get(ordemRef.collection('pendencias')),atual=ordem.data()
      exigir(podeOperar(u,atual)&&(podeGerir(u,atual.feiraId)||u.papel==='produtor'))
      if(atual.revisao!==d.revisao)throw new HttpsError('failed-precondition','A revisão mudou.')
      if(ps.docs.some(x=>x.data().revisao===atual.revisao&&!['concluida','recusada'].includes(x.data().status)))throw new HttpsError('failed-precondition','Resolva e valide as pendências antes de concluir o estande.')
      const validada=podeGerir(u,atual.feiraId)
      tx.update(ordemRef,{montagemStatus:d.reabrir?'em_montagem':validada?'concluida':'aguardando_validacao',montagemNota:texto(d.nota),montagemAutor:req.auth.uid,montagemAutorNome:texto(u.nome||u.email||'Equipe USET',180),montagemEm:Timestamp.now(),...(validada?{montagemValidadoPor:req.auth.uid,montagemValidadoNome:texto(u.nome||u.email||'Equipe USET',180)}: {montagemExecutadoPor:req.auth.uid,montagemExecutadoNome:texto(u.nome||u.email||'Equipe USET',180)})})
      tx.create(ordemRef.collection('eventos').doc(),{acao:'conclusao_estande',autor:req.auth.uid,autorNome:texto(u.nome||u.email||'Equipe USET',180),nota:texto(d.nota),revisao:atual.revisao,em:Timestamp.now()})
    })
  } else if(['reservarFotoPendencia','anexarFotoPendencia'].includes(d.acao)) {
    const ref=ordemRef.collection('pendencias').doc(id(d.id)),a=(await ref.get()).data(),m=permissoes(p,o,a)
    if(!a||a.revisao!==o.revisao)throw new HttpsError('failed-precondition','Pendência indisponível nesta revisão.')
    const fase=d.fase==='conclusao'?'conclusao':'abertura'
    exigir(fase==='conclusao'?m.executar||m.validar:m.editar)
    if(fase==='conclusao'&&a.status!=='em_execucao'&&!m.validar)throw new HttpsError('failed-precondition','Registre as fotos durante a execução do serviço.')
    if(d.acao==='reservarFotoPendencia'){
      if(!['image/jpeg','image/png','image/webp'].includes(d.mime)||!Number.isSafeInteger(d.bytes)||d.bytes<1||d.bytes>15*1024*1024)throw new HttpsError('invalid-argument','Envie uma foto JPG, PNG ou WebP de até 15 MB.')
      const uploadId=randomUUID(),caminho=`fotosPendencias/${s.id}/${a.revisao}/${ref.id}/${uploadId}`
      await db.doc(`uploadsFotosPendencias/${uploadId}`).set({uid:req.auth.uid,ordemId:s.id,pendenciaId:ref.id,revisao:a.revisao,feiraId:o.feiraId,caminho,fase,bytes:d.bytes,mime:d.mime,nome:texto(d.nome,180),usado:false,expiraEm:Timestamp.fromMillis(Date.now()+3600000)})
      return{uploadId,caminho}
    }
    const reservaRef=db.doc(`uploadsFotosPendencias/${id(d.uploadId)}`),r=(await reservaRef.get()).data()
    exigir(r?.uid===req.auth.uid&&r.ordemId===s.id&&r.pendenciaId===ref.id&&r.fase===fase&&!r.usado&&r.expiraEm.toMillis()>Date.now())
    const file=getStorage().bucket().file(r.caminho),[met]=await file.getMetadata()
    if(Number(met.size)!==r.bytes||met.contentType!==r.mime)throw new HttpsError('invalid-argument','Foto diferente do envio reservado.')
    const [cabecalho]=await file.download({start:0,end:11})
    const formato=cabecalho.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':cabecalho[0]===255&&cabecalho[1]===216&&cabecalho[2]===255?'image/jpeg':cabecalho.subarray(0,4).toString()==='RIFF'&&cabecalho.subarray(8,12).toString()==='WEBP'?'image/webp':null
    if(formato!==r.mime)throw new HttpsError('invalid-argument','O arquivo não corresponde a uma foto JPG, PNG ou WebP.')
    await revogarLinks(file)
    await db.runTransaction(async tx=>{
      const u=await perfil(req,tx),ordem=await tx.get(ordemRef),pend=await tx.get(ref),rs=await tx.get(reservaRef),mp=permissoes(u,ordem.data(),pend.data())
      exigir(fase==='conclusao'?mp.executar||mp.validar:mp.editar)
      if(fase==='conclusao'&&pend.data()?.status!=='em_execucao'&&!mp.validar)throw new HttpsError('failed-precondition','A execução já foi enviada para validação.')
      if(rs.data()?.usado||pend.data()?.revisao!==ordem.data()?.revisao||r.revisao!==ordem.data()?.revisao)throw new HttpsError('failed-precondition','O registro mudou.')
      const campo=fase==='conclusao'?'fotosConclusao':'fotos'
      if((pend.data()[campo]||[]).length>=12)throw new HttpsError('failed-precondition','Limite de 12 fotos por etapa.')
      tx.update(ref,{[campo]:FieldValue.arrayUnion({caminho:r.caminho,nome:r.nome,mime:r.mime,bytes:r.bytes,autor:req.auth.uid}),atualizadoEm:Timestamp.now()});tx.update(reservaRef,{usado:true})
      tx.create(ordemRef.collection('eventos').doc(),{acao:'foto_pendencia',pendenciaId:ref.id,fase,autor:req.auth.uid,autorNome:texto(u.nome||u.email||'Equipe USET',180),revisao:o.revisao,em:Timestamp.now()})
    })
  } else if(['pendencia','validarLote'].includes(d.acao)) {
    const pendenciaIds=d.acao==='validarLote'?[...new Set(d.ids||[])]:[d.id||randomUUID()]
    if(!pendenciaIds.length||pendenciaIds.length>30)throw new HttpsError('invalid-argument','Escolha até 30 pendências.')
    await db.runTransaction(async tx=>{
      const u=await perfil(req,tx),ordem=await tx.get(ordemRef),atual=ordem.data(),feira=await tx.get(db.doc(`feiras/${o.feiraId}`))
      exigir(podeOperar(u,atual));if(atual.revisao!==d.revisao)throw new HttpsError('failed-precondition','A revisão mudou.')
      const refs=pendenciaIds.map(v=>ordemRef.collection('pendencias').doc(id(v))),ps=await Promise.all(refs.map(r=>tx.get(r)))
      const equipe=(!ps[0].exists||(d.editar&&d.equipeId))?await tx.get(db.doc(`equipesOperacionais/${id(d.equipeId)}`)):null
      for(let i=0;i<ps.length;i++) {
        const a=ps[i].data(),ref=refs[i],agora=Timestamp.now();let historicoStatus=a?.status
        if(!a){
          if(d.acao==='validarLote')throw new HttpsError('not-found','Pendência não encontrada.')
          const especialidade=equipe.data()?.especialidade,m=permissoes(u,atual,{equipeId:d.equipeId,especialidade})
          exigir(m.criar);if(u.papel==='mobiliario')exigir(especialidade==='mobiliario');if(u.papel==='analista_cv')exigir(especialidade==='cv');if(u.papel==='equipe_producao')exigir((u.equipeIds||[]).includes(d.equipeId))
          if(!texto(d.descricao)||!equipe.exists||equipe.data().ativo===false||!(atual.equipeIds||[]).includes(d.equipeId))throw new HttpsError('invalid-argument','Informe descrição e uma equipe ativa atribuída ao estande.')
          const itens=(d.itens||[]).map(id);if(itens.length>30||itens.some(v=>![...(atual.manifesto?.moveis||[]),...(atual.manifesto?.extras||[])].some(x=>x.id===v)))throw new HttpsError('invalid-argument','Item fora da configuração aprovada.')
          const origem=['cliente','organizadora'].includes(d.origem)?d.origem:'equipe',status=origem==='organizadora'?'aguardando_aprovacao':'aberta'
          historicoStatus=status
          tx.create(ref,{descricao:texto(d.descricao),equipeId:d.equipeId,especialidade,equipeNome:equipe.data().nome,responsavel:texto(d.responsavel,180),prioridade:['baixa','alta','urgente'].includes(d.prioridade)?d.prioridade:'normal',origem,itens,itensMobiliario:[...(atual.manifesto?.moveis||[]),...(atual.manifesto?.extras||[])].filter(x=>itens.includes(x.id)).map(x=>({id:x.id,nome:x.nome,origem:x.origem})),status,autor:req.auth.uid,autorNome:texto(u.nome||u.email||'Equipe USET',180),revisao:atual.revisao,criadoEm:agora,fotos:[],fotosConclusao:[]})
          tx.update(ordemRef,{montagemStatus:'em_montagem'})
        } else {
          if(d.editar){
            exigir(permissoes(u,atual,a).editar);if(!texto(d.descricao))throw new HttpsError('invalid-argument','Informe a descrição.')
            let destino={}
            if(d.equipeId&&d.equipeId!==a.equipeId){
              exigir(podeGerir(u,atual.feiraId))
              if(!equipe?.exists||equipe.data().ativo===false||!(atual.equipeIds||[]).includes(d.equipeId))throw new HttpsError('invalid-argument','Selecione uma equipe ativa atribuída ao estande.')
              destino={equipeId:d.equipeId,equipeNome:equipe.data().nome,especialidade:equipe.data().especialidade}
            }
            tx.update(ref,{...destino,descricao:texto(d.descricao),responsavel:texto(d.responsavel,180),prioridade:['baixa','alta','urgente'].includes(d.prioridade)?d.prioridade:'normal',atualizadoEm:agora})
          }
          else {
            const solicitado=d.acao==='validarLote'?'concluida':d.status;let status
            try{status=transicao(u,atual,a,solicitado,texto(d.nota),feira.data()?.validacaoAutomatica===true)}catch(e){throw new HttpsError('failed-precondition',e.message)}
            historicoStatus=status
            const executada=solicitado==='aguardando_validacao',validada=status==='concluida'
            tx.update(ref,{status,nota:texto(d.nota),atualizadoPor:req.auth.uid,atualizadoEm:agora,...(executada?{executadoPor:req.auth.uid,executadoNome:texto(u.nome||u.email||'Equipe USET',180),executadoEm:agora,notaExecucao:texto(d.nota)}:{}),...(validada?{validadoPor:req.auth.uid,validadoNome:texto(u.nome||u.email||'Equipe USET',180),validadoEm:agora,validacaoAutomatica:executada&&status==='concluida',notaValidacao:texto(d.nota)}:{})})
            if(status==='aberta')tx.update(ordemRef,{montagemStatus:'em_montagem'})
          }
        }
        tx.create(ordemRef.collection('eventos').doc(),{acao:d.editar?'editar_pendencia':'pendencia',pendenciaId:ref.id,status:historicoStatus,nota:texto(d.nota),autor:req.auth.uid,autorNome:texto(u.nome||u.email||'Equipe USET',180),revisao:atual.revisao,em:agora})
      }
    })
    if(d.acao==='pendencia'&&!d.id)d.id=pendenciaIds[0]
  }
  const atual={...(await ordemRef.get()).data(),id:s.id},evento=await avisoOperacional(atual,req.auth.uid,'Operação do estande atualizada',`${atual.clienteNome}: confira os serviços, fotos e orientações.`)
  let avisos=[];await db.runTransaction(async tx=>{avisos=gravarEvento(tx,evento)});await entregarEventos(avisos)
  return{ok:true,id:d.id||null}
}
