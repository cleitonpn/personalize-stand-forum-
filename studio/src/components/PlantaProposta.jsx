import {useEffect,useRef,useState} from 'react'
import {useThree} from '@react-three/fiber'
import * as THREE from 'three'
import {salvarBlob} from '../lib/baixarArquivo.js'
import {posicaoPonto} from '../lib/eletrica.js'

export function CapturaPlanta({cena,plantaRef}) {
  const {scene,gl,camera}=useThree()
  useEffect(()=>{
    if(!plantaRef||!cena)return
    plantaRef.current=(limites)=>{
      const b=new THREE.Box3().setFromObject(cena)
      if(b.isEmpty())return null
      const l=limites&&['x0','x1','z0','z1'].every(k=>Number.isFinite(limites[k]))?limites:{x0:b.min.x,x1:b.max.x,z0:b.min.z,z1:b.max.z}
      const largura=l.x1-l.x0,profundidade=l.z1-l.z0
      if(largura<=0||profundidade<=0)return null
      const margem=Math.max(largura,profundidade)*.08,quadro={x0:l.x0-margem,x1:l.x1+margem,z0:l.z0-margem,z1:l.z1+margem}
      const w=quadro.x1-quadro.x0,h=quadro.z1-quadro.z0,cx=(l.x0+l.x1)/2,cz=(l.z0+l.z1)/2
      const ortho=new THREE.OrthographicCamera(-w/2,w/2,h/2,-h/2,.01,10000)
      ortho.position.set(cx,b.max.y+Math.max(w,h)*2,cz);ortho.up.set(0,0,-1);ortho.lookAt(cx,b.min.y,cz);ortho.updateProjectionMatrix()
      const tamanho=gl.getSize(new THREE.Vector2()),ratio=gl.getPixelRatio()
      try{
        gl.setPixelRatio(1);gl.setSize(1200,Math.round(1200*h/w),false);gl.render(scene,ortho)
        return {imagem:gl.domElement.toDataURL('image/png'),quadro,limites:l,largura,profundidade}
      }finally{gl.setPixelRatio(ratio);gl.setSize(tamanho.x,tamanho.y,false);gl.render(scene,camera)}
    }
    return()=>{plantaRef.current=null}
  },[scene,gl,camera,cena,plantaRef])
  return null
}

export default function PlantaProposta({planta,pontos=[],cliente}) {
  const svg=useRef(),[erro,setErro]=useState('')
  if(!planta)return null
  const {quadro:q,limites:l,imagem}=planta,w=1000,h=w*(q.z1-q.z0)/(q.x1-q.x0),x=v=>(v-q.x0)/(q.x1-q.x0)*w,y=v=>(v-q.z0)/(q.z1-q.z0)*h
  const baixar=async()=>{try{await salvarBlob(new Blob([new XMLSerializer().serializeToString(svg.current)],{type:'image/svg+xml'}),'planta-pontos-eletricos.svg')}catch{setErro('Não foi possível baixar a planta.')}}
  return <section className="planta-proposta"><h3>Planta baixa · {cliente}</h3><p>Posições do projeto enviado. Os números correspondem aos pontos elétricos adicionais solicitados.</p><svg ref={svg} role="img" aria-label="Planta baixa do estande com pontos elétricos numerados" xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h+55}`}><rect width={w} height={h+55} fill="#f4f3eb"/><image href={imagem} width={w} height={h}/><rect x={x(l.x0)} y={y(l.z0)} width={x(l.x1)-x(l.x0)} height={y(l.z1)-y(l.z0)} fill="none" stroke="#173b32" strokeWidth="2" strokeDasharray="8 5"/>{pontos.map((p,i)=><g key={p.id} transform={`translate(${x(p.x)},${y(p.z)})`}><circle r="17" fill="#ffd270" stroke="#173b32" strokeWidth="2"/><text textAnchor="middle" dominantBaseline="central" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#173b32">{i+1}</text></g>)}<text x={w/2} y={h+23} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="16" fill="#173b32">FRENTE · {planta.largura.toFixed(2)} m × {planta.profundidade.toFixed(2)} m</text><text x={w/2} y={h+45} textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fill="#173b32">Conferir cotas e instalações no projeto executivo.</text></svg>{!pontos.length&&<p>Nenhum ponto elétrico adicional solicitado.</p>}<ol>{pontos.map(p=><li key={p.id}>{p.uso||'Uso a informar'} · {p.tensao||'Tensão a confirmar'} · {posicaoPonto(p,l)}</li>)}</ol><button className="btn" onClick={baixar}>Baixar planta com os pontos</button>{erro&&<p role="alert">{erro}</p>}</section>
}
