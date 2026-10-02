import { useEffect, useMemo, useRef, useState } from 'react'
import PainelExpositor from './PainelExpositor.jsx'
import { listarElementos } from '../lib/glb/elementos.js'
import { opcoesAtivas, superficiesEscondidas } from '../lib/glb/complementos.js'
import { ETAPAS, ordenarCliente, pertenceEtapa, resumoEtapa, resolverConflitos } from '../lib/jornada.js'
import { fmtBRL } from '../lib/glb/precos.js'
import { nomeNapa } from '../lib/napas.js'
import PainelEletrica from './PainelEletrica.jsx'
import { pontosEletricos,marcarPonto,precoPonto,posicaoPonto } from '../lib/eletrica.js'
import { limitesDoEstande } from '../lib/glb/nomes.js'
import BotaoReiniciar from './BotaoReiniciar.jsx'

export default function JornadaExpositor({ chaveRascunho='previa', aoVista, aoCena, solicitarRevisao=0, aoRevisao, aoReiniciar, aoEvento, ...props }) {
  const { analise, superficies, objetos, complementos=[], escolhas={}, setEscolhas, acabamentos={}, supFoco, objFoco, setSupFoco, setObjFoco, setObjSel } = props
  const [navegacao,setNavegacao] = useState(() => {
    try { const n=JSON.parse(localStorage.getItem(`psf.jornada.${chaveRascunho}`)); if (n && ETAPAS.some(e=>e.id===n.etapa)) return n } catch { /* opcional */ }
    return {modo:'guiado',etapa:'ambientes'}
  })
  const {modo,etapa} = navegacao
  const [comparando,setComparando] = useState(false)
  const [enviando,setEnviando] = useState(false)
  const [confirmacao,setConfirmacao] = useState(null)
  const [imagens,setImagens] = useState([])
  const [erroCaptura,setErroCaptura] = useState('')
  const [modoEletrica,setModoEletrica]=useState(null)
  const pontos=useMemo(()=>pontosEletricos(escolhas),[escolhas._eletrica])
  const limites=useMemo(()=>analise?limitesDoEstande(analise,props.recorte):null,[analise,props.recorte])
  const alturaPiso=useMemo(()=>{
    const chaves=new Set(superficies.filter(s=>s.tipoElemento==='piso'||s.papel==='piso').flatMap(s=>s.pecas))
    const pisos=(analise?.pecas||[]).filter(p=>chaves.has(p.chave))
    return pisos.length?Math.max(...pisos.map(p=>p.bbox.max[1])):analise?.resumo?.cena?.min?.[1]||0
  },[analise,superficies])
  const alterarPontos=fn=>setEscolhas(e=>({...e,_eletrica:fn(pontosEletricos(e))}))
  const iniciarMarcacao=id=>{limparFoco();setModoEletrica(id);if(id)aoVista?.('cima')}
  useEffect(()=>{
    aoCena?.({pontosEletricos:pontos,limitesEletrica:limites,alturaEletrica:alturaPiso,modoEletrica:!comparando&&etapa==='eletrica'&&modoEletrica,
      aoMarcarEletrica:pos=>{alterarPontos(ps=>marcarPonto(ps,pos,limites,modoEletrica==='novo'?null:modoEletrica));setModoEletrica(null)}})
  },[pontos,limites,alturaPiso,modoEletrica,comparando,etapa])
  useEffect(()=>()=>aoCena?.({modoEletrica:null,pontosEletricos:[],aoMarcarEletrica:null}),[])
  const cabecalho=useRef(null)
  const dialogo=useRef(null)
  useEffect(()=>()=>aoCena?.({compararOriginal:false,focoCamera:null}),[])
  useEffect(()=>{
    if(!confirmacao)return
    const anterior=document.activeElement
    const teclado=e=>{
      if(e.key==='Escape'){e.preventDefault();setConfirmacao(null)}
      if(e.key==='Tab'){
        const botoes=dialogo.current?.querySelectorAll('button:not(:disabled)')
        if(!botoes?.length)return
        const primeiro=botoes[0],ultimo=botoes[botoes.length-1]
        if(e.shiftKey&&document.activeElement===primeiro){e.preventDefault();ultimo.focus()}
        else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primeiro.focus()}
      }
    }
    document.addEventListener('keydown',teclado)
    return()=>{document.removeEventListener('keydown',teclado);anterior?.focus()}
  },[confirmacao])
  const elementos=useMemo(()=>ordenarCliente(listarElementos(superficies,objetos,analise,props.recorte)),[superficies,objetos,analise,props.recorte])
  const resumos=ETAPAS.map(e=>({...e,...resumoEtapa(e.id,elementos,complementos,escolhas,acabamentos)}))
  const atual=resumos.find(e=>e.id===etapa) || resumos[0]
  const indice=ETAPAS.findIndex(e=>e.id===atual.id)
  const ativas=opcoesAtivas(complementos,escolhas)
  const pendentes=resumos.slice(0,-1).flatMap(e=>e.pendencias)
  const alteracoes=new Set(resumos.flatMap(e=>e.alterados.map(x=>x.id))).size + ativas.length + pontos.length
  const limparFoco=()=>{setSupFoco(null);setObjFoco(null);setObjSel(null)}
  const navegar=id=>{setModoEletrica(null);limparFoco();setNavegacao(n=>({...n,etapa:id}));aoVista?.(ETAPAS.find(e=>e.id===id)?.vista || 'perspectiva');cabecalho.current?.focus()}
  useEffect(()=>{try{localStorage.setItem(`psf.jornada.${chaveRascunho}`,JSON.stringify(navegacao))}catch{/* sem persistência */}},[chaveRascunho,navegacao])
  useEffect(()=>{aoRevisao?.(etapa==='revisao');aoEvento?.('etapa',etapa)},[etapa,aoEvento])
  useEffect(()=>{if(solicitarRevisao) navegar('revisao')},[solicitarRevisao])
  useEffect(()=>{aoVista?.(atual.vista)},[])
  // A seleção no 3D abre a categoria correspondente, inclusive no modo guiado.
  useEffect(()=>{
    if (modo!=='guiado') return
    if(supFoco?.startsWith('extra:')) {setNavegacao(n=>({...n,etapa:'mobiliario'}));return}
    const e=elementos.find(e=>e.superficies.some(s=>s.id===supFoco)||e.objetos.some(o=>o.id===objFoco))
    if(e && !pertenceEtapa(e,etapa)) {
      const proxima=e.tipo==='piso'?'piso':e.tipo==='movel'&&objFoco?'mobiliario':'marca'
      setNavegacao(n=>({...n,etapa:proxima}))
    }
  },[supFoco,objFoco,modo])
  useEffect(()=>{
    aoCena?.({marcadores:modo==='guiado'&&etapa==='marca'?elementos.filter(e=>pertenceEtapa(e,'marca')).map(e=>({numero:elementos.indexOf(e)+1,pecas:e.superficies.flatMap(s=>s.pecas)})):[]})
    return ()=>aoCena?.({marcadores:[]})
  },[modo,etapa,elementos])
  const focar=e=>aoCena?.({focoCamera:{pecas:[...e.superficies.flatMap(s=>s.pecas),...e.objetos.flatMap(o=>o.pecas)],numero:elementos.indexOf(e)+1,tempo:Date.now()}})
  const escolherSeguro=valor=>{
    const proximo=typeof valor==='function'?valor(escolhas):valor
    const resultado=resolverConflitos(complementos,escolhas,proximo)
    const antes=superficiesEscondidas(ativas),depois=superficiesEscondidas(opcoesAtivas(complementos,resultado.escolhas))
    const saem=elementos.filter(e=>e.superficies.some(s=>depois.has(s.id)&&!antes.has(s.id)))
    if(resultado.retiradas.length||saem.length) setConfirmacao({...resultado,saem})
    else setEscolhas(resultado.escolhas)
  }
  const concluir=()=>{
    aoEvento?.('concluir',etapa)
    setEscolhas(e=>({...e,_etapas:{...e?._etapas,[etapa]:true}}))
    navegar(ETAPAS[Math.min(indice+1,ETAPAS.length-1)].id)
  }
  const capturar=()=>{
    try { const vistas=window.__psfVistas?.(); if(!vistas?.length)throw Error();setImagens(vistas);setErroCaptura('') }
    catch {setErroCaptura('Não foi possível gerar as imagens. Use os botões de vista para conferir o estande.')}
  }
  useEffect(()=>{setImagens([])},[acabamentos,escolhas,objetos])
  return <div className="jornada">
    {aoReiniciar && <BotaoReiniciar disabled={enviando} aoReiniciar={() => {
      aoReiniciar()
      limparFoco(); setNavegacao({modo:'guiado',etapa:'ambientes'})
      setComparando(false); setModoEletrica(null); setConfirmacao(null); setImagens([]); setErroCaptura('')
      aoCena?.({compararOriginal:false,focoCamera:null,modoEletrica:null,pontosEletricos:[],marcadores:[]})
      aoVista?.('perspectiva')
    }} />}
    <details className="jornada-ferramentas"><summary>Modo de navegação e comparação</summary><div className="modos-cliente" aria-label="Modo de personalização">
      {[['guiado','Passo a passo'],['livre','Explorar livremente']].map(([id,nome])=><button className={`btn ${modo===id?'btn-primary':''}`} key={id} aria-pressed={modo===id} disabled={enviando} onClick={()=>setNavegacao(n=>({...n,modo:id,etapa:id==='livre'&&n.etapa==='revisao'?'marca':n.etapa}))}>{nome}</button>)}
    </div>
    <div className="jornada-utilidades">
      <button className="btn btn-sm" onClick={()=>{limparFoco();aoVista?.('perspectiva')}}>Visão geral</button>
      <button className={`btn btn-sm ${comparando?'btn-primary':''}`} aria-pressed={comparando} disabled={enviando} onClick={()=>{setComparando(!comparando);aoCena?.({compararOriginal:!comparando})}}>{comparando?'Voltar à minha versão':'Comparar com original'}</button>
    </div>
    </details>
    {comparando&&<p className="orientacao" role="status">Você está vendo o projeto original. <button className="btn btn-sm" onClick={()=>{setComparando(false);aoCena?.({compararOriginal:false})}}>Voltar para editar</button></p>}
    {modo==='guiado'&&<><div className="jornada-progresso" aria-label={`Etapa ${indice+1} de ${ETAPAS.length}`}>{ETAPAS.map((e,i)=><span key={e.id} className={i===indice?'atual':escolhas._etapas?.[e.id]?'feito':''}/>)}</div><details className="jornada-mapa"><summary>Ver etapas e escolhas</summary><nav className="passos-cliente" aria-label="Etapas da personalização">{resumos.map((e,i)=><button key={e.id} aria-current={etapa===e.id?'step':undefined} disabled={enviando||comparando} onClick={()=>navegar(e.id)}><b>{i+1}</b><span>{e.nome}<small>{e.id==='revisao'?'Conferir':e.status}</small></span></button>)}</nav></details></>}
    <div ref={cabecalho} tabIndex={-1} className="jornada-cabecalho"><small>{modo==='guiado'?`Etapa ${indice+1} de ${ETAPAS.length}`:'Suas escolhas, na sua ordem'}</small><h2>{modo==='livre'&&etapa!=='revisao'?'Explore seu estande':atual.pergunta}</h2><p>{modo==='livre'&&etapa!=='revisao'?'Escolha uma categoria ou clique no estande. Você pode voltar ao passo a passo sem perder nada.':atual.dica}</p></div>
    <fieldset disabled={comparando} className="jornada-conteudo">
      {etapa==='ambientes'&&modo==='guiado'&&<section className="incluido-projeto"><strong>✓ Já incluído no projeto</strong><p>Estes itens fazem parte da base do seu estande. Mantê-los como estão não gera adicional.</p><ul>{elementos.filter(e=>['movel','parede','piso'].includes(e.tipo)).map(e=><li key={e.id}>{e.nome}</li>)}</ul><p>As opções abaixo são mudanças opcionais. Você pode seguir sem escolher nenhuma.</p></section>}
      {etapa==='eletrica'?<PainelEletrica pontos={pontos} valor={precoPonto(props.precos)} limites={limites} modo={modoEletrica} aoMarcar={iniciarMarcacao} aoMudar={(id,patch)=>alterarPontos(ps=>ps.map(p=>p.id===id?{...p,...patch}:p))} aoRemover={id=>{setModoEletrica(null);alterarPontos(ps=>ps.filter(p=>p.id!==id))}}/>:
      etapa==='revisao'?<>
        <div className="jornada-utilidades">{[['frente','Frente'],['esquerda','Lateral esquerda'],['direita','Lateral direita'],['cima','Vista de cima']].map(([v,n])=><button className="btn btn-sm" key={v} onClick={()=>aoVista?.(v)}>{n}</button>)}</div>
        <button className="btn" onClick={capturar}>Gerar imagens da revisão</button>
        {erroCaptura&&<p role="status">{erroCaptura}</p>}
        <div className="vistas-revisao">{imagens.map(i=><figure key={i.nome}><img src={i.url} alt={`Seu estande: ${i.nome}`} /><figcaption>{i.nome}</figcaption></figure>)}</div>
        {pendentes.length>0&&<p className="orientacao" role="status">Arte pendente em {new Set(pendentes.map(e=>e.id)).size} elemento(s). Você pode enviar a proposta para atendimento com essa pendência; a arte ainda precisa ser entregue.</p>}
        {resumos.slice(0,-1).map(e=><article key={e.id} className="card card-pad"><div className="row" style={{justifyContent:'space-between'}}><strong>{e.nome}</strong><button className="btn btn-sm" onClick={()=>{setNavegacao(n=>({...n,modo:'guiado'}));navegar(e.id)}}>Editar {e.nome.toLowerCase()}</button></div><small>{e.status==='A escolher'?'Original — ainda não revisado':e.status}</small>
          <ul>{e.alterados.map(x=><li key={x.id}>{x.nome}{[...new Set(x.superficies.map(s=>acabamentos[s.id]).filter(a=>a?.materialNome).map(a=>nomeNapa({nome:a.materialNome,codigo:a.materialCodigo})))].map(n=><small key={n} style={{display:'block'}}>{n}</small>)}{e.pendencias.some(p=>p.id===x.id)?' — arte pendente':''}</li>)}{e.adicionais.map(o=><li key={o.id}>{o.nome} — {o.esconde?.length?'substituição':'inclusão'}</li>)}</ul>
        </article>)}
        {pontos.length>0&&<article className="card card-pad"><strong>{pontos.length} ponto(s) elétrico(s) adicional(is)</strong><ol>{pontos.map(p=><li key={p.id}>{p.uso||'Uso a informar'} · {p.tensao} · {posicaoPonto(p,limites)}</li>)}</ol></article>}
        <details className="card card-pad"><summary>Detalhar valores dos adicionais</summary>{props.orcamento?.itens.map((i,n)=><p key={`${i.id}:${n}`}>{i.nome}: {fmtBRL(i.total)}</p>)}</details>
      </>:<PainelExpositor {...props} elementosOrdenados={elementos} etapaGuiada={modo==='guiado'?etapa:null} aoFocarElemento={focar} aoVista={aoVista} setEscolhas={escolherSeguro}
        aoEnviarArte={v=>{setEnviando(v);props.aoEnviarArte?.(v)}} />}
      {modo==='guiado'&&etapa!=='revisao'&&<div className="jornada-navegar"><button className="btn" disabled={indice===0||enviando} onClick={()=>navegar(ETAPAS[indice-1].id)}>Voltar</button><button className="btn btn-primary" disabled={enviando||!!modoEletrica} onClick={concluir}>{atual.personalizado?'Salvar escolhas e continuar':'Manter o incluído e continuar'} →</button><small>Próximo: {ETAPAS[indice+1]?.nome}</small></div>}
      {modo==='livre'&&etapa!=='eletrica'&&etapa!=='revisao'&&<button className="btn" onClick={()=>navegar('eletrica')}>Pontos elétricos adicionais</button>}
      {modo==='livre'&&etapa==='eletrica'&&<button className="btn" onClick={()=>navegar('marca')}>Voltar às personalizações</button>}
      {modo==='livre'&&etapa!=='revisao'&&<button className="btn btn-primary" disabled={enviando} onClick={()=>navegar('revisao')}>Revisar personalização</button>}
    </fieldset>
    <small className="dim">{alteracoes} alteração(ões) · adicionais {fmtBRL(props.orcamento?.total)}. O projeto padrão já está incluso.</small>
    {confirmacao&&<div ref={dialogo} className="confirmacao-escolha" role="dialog" aria-modal="true" aria-labelledby="titulo-troca"><div className="card card-pad col"><h3 id="titulo-troca">Confira o que muda</h3>
      {confirmacao.saem.length>0&&<><p>Estes itens saem do estande:</p><ul>{confirmacao.saem.map(e=><li key={e.id}>{e.nome}{e.superficies.some(s=>acabamentos[s.id]?.arte||acabamentos[s.id]?.cor||acabamentos[s.id]?.artePendente)?' — personalização guardada para restaurar':''}</li>)}</ul></>}
      {confirmacao.retiradas.length>0&&<><p>Estas opções não podem ser combinadas com a nova escolha:</p><ul>{confirmacao.retiradas.map(o=><li key={o.id}>{o.nome}</li>)}</ul></>}
      <p>Você pode desfazer ou voltar ao projeto original depois.</p><button autoFocus className="btn btn-primary" onClick={()=>{setEscolhas(confirmacao.escolhas);setConfirmacao(null)}}>Aplicar esta troca</button><button className="btn" onClick={()=>setConfirmacao(null)}>Cancelar</button>
    </div></div>}
  </div>
}
