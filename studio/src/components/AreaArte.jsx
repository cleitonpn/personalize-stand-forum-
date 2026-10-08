import {useEffect,useRef,useState} from 'react'
import {collection,onSnapshot,query,orderBy,limit} from 'firebase/firestore'
import {db} from '../lib/firebase.js'
import {executarComercial} from '../lib/comercial.js'
import {PERFIS_PADRAO} from '../lib/producao/perfis.js'
import {especificacao} from '../lib/producao/core/regras.js'
import {especificacaoEmPdf,nomeDoArquivo} from '../lib/producao/core/especificacaoPdf.js'
import {STATUS_ARTES,formatarCm,subirArquivo,perfilDaArea,baixarPrivado} from '../lib/producao/envio.js'
import ArquivoProducao from './ArquivoProducao.jsx'

function Relatorio({relatorio}){return relatorio&&<details className="arte-laudo" open={relatorio.veredicto!=='aprovado'}><summary>{relatorio.veredicto==='aprovado'?'Conferência automática: dentro dos critérios':relatorio.veredicto==='ressalva'?'Conferência automática: pontos de atenção':'Conferência automática: ajustes necessários'} · escala 1:{relatorio.escalaFator}</summary><p>A análise técnica ajuda a conferir o arquivo. A aprovação para impressão depende da prova.</p>{relatorio.achados?.map((a,i)=><div key={i} className={`arte-achado ${a.nivel}`}><strong>{a.titulo}</strong><p>{a.detalhe}</p></div>)}</details>}

export default function AreaArte({area,propostaId,papel,prazoVencido}){
  const admin=['admin','analista_cv'].includes(papel),cliente=papel==='expositor',perfil=perfilDaArea(area,PERFIS_PADRAO)
  const [aberta,setAberta]=useState(false),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[mensagem,setMensagem]=useState('')
  const [largura,setLargura]=useState(area.larguraCm),[altura,setAltura]=useState(area.alturaCm),[perfilId,setPerfilId]=useState(area.perfilId)
  const [sangria,setSangria]=useState(perfil.sangriaMm),[margem,setMargem]=useState(perfil.margemMm)
  const [arquivo,setArquivo]=useState(null),[resultado,setResultado]=useState(null),[miniatura,setMiniatura]=useState(''),[etapa,setEtapa]=useState(''),[progresso,setProgresso]=useState(0)
  const [escala,setEscala]=useState(1),[motivo,setMotivo]=useState(''),[aceite,setAceite]=useState(false),[versoes,setVersoes]=useState([]),[eventos,setEventos]=useState([])
  const tarefa=useRef(0)
  useEffect(()=>{setLargura(area.larguraCm);setAltura(area.alturaCm);setPerfilId(area.perfilId);setSangria(perfil.sangriaMm);setMargem(perfil.margemMm);setArquivo(null);setResultado(null);setMiniatura('');setAceite(false);setOcupado(false);setEtapa('');tarefa.current++},[area.revisao,area.versao,area.prova?.id])
  useEffect(()=>()=>{tarefa.current++},[])
  useEffect(()=>{if(!aberta)return;const erros=e=>setErro(e.message)
    const v=onSnapshot(query(collection(db,'artesPropostas',propostaId,'areas',area.id,'versoes'),orderBy('enviadoEm','desc'),limit(30)),s=>setVersoes(s.docs.map(d=>({id:d.id,...d.data()}))),erros)
    const e=onSnapshot(query(collection(db,'artesPropostas',propostaId,'areas',area.id,'eventos'),orderBy('em','desc'),limit(60)),s=>setEventos(s.docs.map(d=>({id:d.id,...d.data()}))),erros)
    return()=>{v();e()}
  },[aberta,area.id,propostaId])
  const executar=async(acao,dados={})=>{setOcupado(true);setErro('');setMensagem('');try{await executarComercial('artesProposta',{acao,propostaId,areaId:area.id,revisao:area.revisao,versao:area.versao,...dados});setMensagem('Atualização registrada.')}catch(e){setErro(e.message)}finally{setOcupado(false)}}
  const conferir=async(f,fator=escala)=>{
    const pedido=++tarefa.current;setArquivo(null);setResultado(null);setMiniatura('');setOcupado(true);setErro('');setEtapa('Abrindo arquivo')
    try{
      if(!/\.(pdf|ai|png|jpe?g)$/i.test(f.name)||f.size>300*1024*1024)throw Error('Envie PDF, PNG ou JPG de até 300 MB.')
      const {analisar}=await import('../lib/producao/core/analise.js')
      const r=await analisar(f,{...area,rotulo:area.nome},perfil,{escalaFator:fator,politica:{sangriaMinimaMm:0},aoAndar:e=>{if(pedido===tarefa.current)setEtapa(({lendo:'Lendo arquivo',abrindo:'Abrindo arte',medindo:'Conferindo medidas',escala:'Conferindo escala',decidindo:'Conferindo requisitos',pronto:'Conferência concluída'})[e]||'Analisando qualidade')}})
      const fonte=r.medidas?.fonteVisual
      if(pedido===tarefa.current){setArquivo(f);setResultado({veredicto:r.veredicto,escalaFator:r.escalaFator,achados:r.achados,hash:r.medidas.arquivo.hash});setMiniatura(r.medidas.miniaturaUrl||'');setEscala(r.escalaFator)}
      fonte?.imagem?.close?.();await fonte?.doc?.destroy?.()
    }catch(e){if(pedido===tarefa.current)setErro(`Não foi possível conferir: ${e.message}`)}finally{if(pedido===tarefa.current){setOcupado(false);setEtapa('')}}
  }
  const enviar=async(tipo,f)=>{
    setOcupado(true);setErro('');setMensagem('');setProgresso(0);setEtapa(tipo==='arte'?'Enviando arte':'Enviando prova')
    try{
      const uploadId=await subirArquivo({propostaId,area,tipo,arquivo:f,aoProgresso:setProgresso})
      setEtapa('Registrando arquivo e versão')
      await executarComercial('artesProposta',{acao:tipo==='arte'?'enviar':'prova',propostaId,areaId:area.id,uploadId,revisao:area.revisao,versao:area.versao,...(tipo==='arte'?{relatorio:resultado,contestar:resultado.veredicto==='reprovado',motivo}:{})})
      setArquivo(null);setResultado(null);setMensagem(tipo==='arte'?'Arte enviada. A USET fará a conferência.':'Prova enviada para aprovação do cliente.')
    }catch(e){setErro(e.message)}finally{setOcupado(false);setEtapa('')}
  }
  const gabarito=()=>{try{const bytes=especificacaoEmPdf({peca:{...area,rotulo:area.nome},perfil,politica:{sangriaMinimaMm:0},escalaFator:escala}),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=nomeDoArquivo({...area,rotulo:area.nome},perfil);a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}catch(e){setErro(e.message)}}
  const spec=especificacao(area,perfil,{sangriaMinimaMm:0})
  const recebe=cliente&&!area.semGabarito&&area.confirmada&&!prazoVencido&&['aguardando','devolvida','reprovada','contestada','recebida'].includes(area.status)
  return <article className="card arte-area">
    <button className="arte-area-cabecalho" aria-expanded={aberta} onClick={()=>setAberta(!aberta)}><span><strong>{area.nome}</strong><small>{area.semGabarito?'Logo · sem gabarito':area.confirmada?`${formatarCm(area.larguraCm)} × ${formatarCm(area.alturaCm)} cm`:'Medidas aguardando conferência da USET'}</small></span><span className="tag">{STATUS_ARTES[area.status]} {aberta?'−':'+'}</span></button>
    {aberta&&<div className="arte-area-conteudo">
      <fieldset disabled={ocupado}>
      {area.semGabarito&&<p className="orientacao">Esta área é um logo e dispensa gabarito. Envie o logo vetorizado e o manual de marca na seção Arquivos de apoio abaixo. A USET preparará a aplicação e enviará uma prova para sua aprovação.</p>}
      {!area.confirmada&&<p className="orientacao">A USET vai conferir as medidas antes de liberar o gabarito. {area.larguraCm>0?`Estimativa do GLB: ${formatarCm(area.larguraCm)} × ${formatarCm(area.alturaCm)} cm.`:''}</p>}
      {admin&&!area.semGabarito&&!['em_impressao','impressa'].includes(area.status)&&<details open={!area.confirmada}><summary>Conferir medidas e requisitos de produção</summary><p>Confirme a área visível de impressão. Alterar o gabarito exige novo envio e nova aprovação; os arquivos anteriores ficam no histórico.</p><div className="arte-form-grid">
        <label>Largura (cm)<input className="input" type="number" min="0.01" step="0.01" value={largura} onChange={e=>setLargura(e.target.value)}/></label>
        <label>Altura (cm)<input className="input" type="number" min="0.01" step="0.01" value={altura} onChange={e=>setAltura(e.target.value)}/></label>
        <label>Tipo de impressão<select className="select" value={perfilId} onChange={e=>{setPerfilId(e.target.value);const p=PERFIS_PADRAO.find(p=>p.id===e.target.value);setSangria(p.sangriaMm);setMargem(p.margemMm)}}>{PERFIS_PADRAO.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
        <label>Sangria por lado (mm)<input className="input" type="number" min="0" max="500" value={sangria} onChange={e=>setSangria(e.target.value)}/></label>
        <label>Margem segura (mm)<input className="input" type="number" min="0" max="500" value={margem} onChange={e=>setMargem(e.target.value)}/></label>
      </div><button className="btn btn-primary" onClick={()=>executar('configurar',{larguraCm:Number(largura),alturaCm:Number(altura),perfilId,sangriaMm:Number(sangria),margemMm:Number(margem)})}>Confirmar medidas e liberar gabarito</button></details>}
      {area.confirmada&&!area.semGabarito&&<section className="arte-gabarito"><div className="arte-mini-gabarito" style={{aspectRatio:Math.max(.4,Math.min(3,area.larguraCm/area.alturaCm))}}><span>{formatarCm(area.larguraCm)} × {formatarCm(area.alturaCm)} cm</span></div><div><h3>Prepare sua arte</h3><p>Área visível: <strong>{formatarCm(area.larguraCm)} × {formatarCm(area.alturaCm)} cm</strong><br/>Arquivo com sangria: <strong>{formatarCm(spec.comSangria.larguraCm)} × {formatarCm(spec.comSangria.alturaCm)} cm</strong><br/>Sangria: {spec.sangriaMm} mm por lado · margem segura: {spec.margemMm} mm<br/>Resolução mínima: {spec.minimo.dpi} dpi no tamanho final</p><button className="btn" onClick={gabarito}>Baixar gabarito PDF com medidas</button></div></section>}
      {area.motivo&&<p className="orientacao"><strong>Ajuste solicitado:</strong> {area.motivo}</p>}
      {recebe&&<section><h3>{area.versao?'Enviar nova versão da arte':'Envie a arte final desta área'}</h3><p>O arquivo aplicado no 3D é uma prévia. Envie aqui o arquivo final para produção.</p><label>Escala do arquivo<select className="select" value={escala} onChange={e=>{const f=Number(e.target.value);setEscala(f);if(arquivo)conferir(arquivo,f)}}>{[1,2,4,10].map(f=><option key={f} value={f}>1:{f}{f===1?' — tamanho real':''}</option>)}</select></label><label className="arte-escolher">Selecionar arte<input type="file" accept=".pdf,.ai,.png,.jpg,.jpeg" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)conferir(f)}}/></label><p className="dim">PDF (ou AI salvo como PDF), PNG e JPG · até 300 MB · análise local antes do envio.</p>
        {miniatura&&<img className="arte-miniatura" src={miniatura} alt="Prévia do arquivo selecionado"/>}<Relatorio relatorio={resultado}/>
        {resultado&&<><p>{arquivo?.name}</p>{resultado.veredicto==='reprovado'&&<label>Prefere pedir conferência da equipe? Explique o motivo<textarea className="input" maxLength="2000" value={motivo} onChange={e=>setMotivo(e.target.value)}/></label>}<button className="btn btn-primary" disabled={resultado.veredicto==='reprovado'&&!motivo.trim()} onClick={()=>enviar('arte',arquivo)}>{resultado.veredicto==='reprovado'?'Enviar para revisão técnica':'Enviar arte para conferência'}</button></>}
      </section>}
      {area.arquivo&&<><ArquivoProducao arquivo={area.arquivo} titulo={`Arte final — versão ${area.versao}`}/><Relatorio relatorio={area.relatorio}/></>}
      {admin&&area.semGabarito&&['aguardando','devolvida','reprovada','recebida'].includes(area.status)&&<><p>Após conferir os arquivos de apoio, prepare a prova da aplicação do logo.</p><button className="btn" onClick={()=>executar('logoPronto')}>Usar arquivos de apoio para preparar a prova</button></>}
      {admin&&['recebida','contestada','reprovada','em_prova'].includes(area.status)&&<section><h3>Conferência da produção</h3><p>Confira o arquivo e envie a prova desta versão para o cliente. Uma nova prova invalida a anterior.</p><label className="arte-escolher">Enviar prova<input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)enviar('prova',f)}}/></label><p className="dim">PDF, PNG ou JPG · até 30 MB</p><label>Orientação para ajustes<textarea className="input" maxLength="2000" value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><button className="btn" disabled={!motivo.trim()} onClick={()=>executar('devolver',{motivo})}>Devolver arte para correção</button></section>}
      {area.prova&&<ArquivoProducao arquivo={area.prova} titulo="Prova para aprovação"/>}
      {cliente&&area.status==='em_prova'&&<section><h3>Confira a prova antes de aprovar</h3><label className="arte-aceite"><input type="checkbox" checked={aceite} onChange={e=>setAceite(e.target.checked)}/> Conferi a prova desta versão, incluindo conteúdo, posicionamento e medidas, e autorizo sua produção.</label><button className="btn btn-primary" disabled={!aceite} onClick={()=>executar('responder',{aprovar:true,provaId:area.prova.id})}>Aprovar esta prova</button><label>Precisa ajustar algo?<textarea className="input" maxLength="2000" value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><button className="btn" disabled={!motivo.trim()} onClick={()=>executar('responder',{aprovar:false,motivo,provaId:area.prova.id})}>Pedir ajuste na prova</button></section>}
      {admin&&['aprovada','em_impressao'].includes(area.status)&&<button className="btn btn-primary" onClick={()=>executar('impressao',{status:area.status==='aprovada'?'em_impressao':'impressa'})}>{area.status==='aprovada'?'Iniciar impressão':'Marcar como impressa'}</button>}
      </fieldset>
      {ocupado&&<div className="arte-progresso" role="status"><span className="spinner"/>{etapa||'Salvando…'}{etapa.startsWith('Enviando')&&<progress max="100" value={progresso}/>}</div>}
      {erro&&<p role="alert">{erro}</p>}{mensagem&&<p role="status">{mensagem}</p>}
      <details><summary>Histórico de arquivos e decisões</summary>{versoes.map(v=><p key={v.id}>Arte v{v.versao} · {v.enviadoEm?.toDate?.().toLocaleString('pt-BR')} {v.arquivo&&<button className="btn btn-sm" onClick={()=>baixarPrivado(v.arquivo).catch(e=>setErro(e.message))}>Baixar</button>}{v.apoio?.map(a=><button className="btn btn-sm" key={a.id} onClick={()=>baixarPrivado(a.arquivo).catch(e=>setErro(e.message))}>{a.arquivo.nome}</button>)}</p>)}{eventos.map(e=><p key={e.id}>{({logoPronto:'Logo enviado para preparação de prova',configurar:'Gabarito confirmado',enviar:'Arte enviada',prova:'Prova enviada',devolver:'Arquivo devolvido',responder:e.aprovou?'Prova aprovada pelo cliente':'Cliente pediu ajuste',impressao:'Produção atualizada'})[e.acao]} · arte v{e.versao} · {e.em?.toDate?.().toLocaleString('pt-BR')}{e.motivo&&` · ${e.motivo}`}{e.prova&&<button className="btn btn-sm" onClick={()=>baixarPrivado(e.prova).catch(ex=>setErro(ex.message))}>Baixar prova</button>}</p>)}</details>
    </div>}
  </article>
}
