import { useCallback, useEffect, useRef } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'
import { ACOES } from './analiseUso.js'
import { ETAPAS } from './jornada.js'

export function useTelemetria(uid,modeloId,habilitada=true){
  const atual=useRef(null), etapaPendente=useRef('')
  const registrar=useCallback((acao,valor)=>{
    if(acao==='etapa'&&ETAPAS.some(e=>e.id===valor))etapaPendente.current=valor
    const s=atual.current;if(!s)return
    s.atividade=Date.now();s.revisao++
    if(acao==='etapa'&&ETAPAS.some(e=>e.id===valor)){
      if(s.dados.ultimaEtapa!==valor){s.dados.ultimaEtapa=valor;s.dados.etapas[valor].visitas=Math.min(10000,s.dados.etapas[valor].visitas+1)}
    }else if(acao==='concluir'&&s.dados.etapas[valor])s.dados.etapas[valor].concluiu=true
    else if(ACOES.includes(acao)){
      s.dados.acoes[acao]=Math.min(10000,(s.dados.acoes[acao]||0)+1)
      if(acao==='envio')s.dados.enviou=true
      if(acao.endsWith('_erro')&&s.dados.ultimaEtapa)s.dados.etapas[s.dados.ultimaEtapa].erros=Math.min(10000,s.dados.etapas[s.dados.ultimaEtapa].erros+1)
    }
  },[])
  useEffect(()=>{
    if(!uid||!modeloId||!habilitada)return
    const s={atividade:Date.now(),revisao:0,salva:0,enviando:false,
      dados:{uid,modeloId,dispositivo:matchMedia('(max-width:700px)').matches?'celular':'desktop',segundos:0,enviou:false,ultimaEtapa:'',acoes:{},
        etapas:Object.fromEntries(ETAPAS.map(e=>[e.id,{visitas:0,segundos:0,erros:0,concluiu:false}]))}}
    const destino=doc(db,'sessoesUso',crypto.randomUUID());atual.current=s
    if(etapaPendente.current){s.dados.ultimaEtapa=etapaPendente.current;s.dados.etapas[etapaPendente.current].visitas=1}
    const enviar=async()=>{
      if(s.enviando||s.salva===s.revisao)return
      s.enviando=true;const versao=s.revisao
      try{await setDoc(destino,{...structuredClone(s.dados),atualizadoEm:serverTimestamp()});s.salva=versao}catch{/* Métricas nunca bloqueiam o trabalho; próximo lote tenta de novo. */}finally{s.enviando=false}
    }
    let anterior=Date.now(),ultimoClique={alvo:null,hora:0,quantidade:0}
    const atividade=e=>{
      s.atividade=Date.now()
      if(e.type!=='pointerdown')return
      const alvo=e.target.closest?.('button');if(!alvo)return
      ultimoClique=ultimoClique.alvo===alvo&&Date.now()-ultimoClique.hora<1200?{alvo,hora:Date.now(),quantidade:ultimoClique.quantidade+1}:{alvo,hora:Date.now(),quantidade:1}
      if(ultimoClique.quantidade===3)registrar('cliques_repetidos')
    }
    const tic=setInterval(()=>{
      const agora=Date.now(),delta=Math.min(10,(agora-anterior)/1000);anterior=agora
      if(!document.hidden&&agora-s.atividade<60000&&s.dados.segundos<86400){
        s.dados.segundos=Math.min(86400,s.dados.segundos+delta)
        if(s.dados.ultimaEtapa)s.dados.etapas[s.dados.ultimaEtapa].segundos=Math.min(86400,s.dados.etapas[s.dados.ultimaEtapa].segundos+delta)
        s.revisao++
      }
    },10000)
    const lote=setInterval(enviar,20000)
    const visibilidade=()=>{anterior=Date.now();if(document.hidden)void enviar()}
    document.addEventListener('pointerdown',atividade);document.addEventListener('keydown',atividade)
    document.addEventListener('visibilitychange',visibilidade);window.addEventListener('pagehide',enviar)
    return()=>{clearInterval(tic);clearInterval(lote);document.removeEventListener('pointerdown',atividade);document.removeEventListener('keydown',atividade);document.removeEventListener('visibilitychange',visibilidade);window.removeEventListener('pagehide',enviar);void enviar();if(atual.current===s)atual.current=null}
  },[uid,modeloId,habilitada,registrar])
  return registrar
}
