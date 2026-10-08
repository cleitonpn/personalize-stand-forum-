import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { enquadrarSelecao } from '../lib/cameraSelecao.js'

function caixaVisivel(cena, chaves) {
  const caixa=new THREE.Box3(), ids=chaves&&new Set(chaves)
  cena?.updateWorldMatrix(true,true)
  cena?.traverse(m=>{
    if(!m.isMesh || (ids&&!ids.has(m.userData._chave)))return
    for(let p=m;p;p=p.parent)if(!p.visible)return
    if(!m.geometry.boundingBox)m.geometry.computeBoundingBox()
    caixa.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld))
  })
  return caixa
}
export function FocarElemento({ cena, pedido, recorte }) {
  const {camera,controls}=useThree()
  useEffect(()=>{
    if(!pedido?.pecas?.length||!cena)return
    const b=caixaVisivel(cena,pedido.pecas)
    if(b.isEmpty())return
    const geral=caixaVisivel(cena)
    if(recorte){geral.min.x=Math.min(recorte.x0,recorte.x1);geral.max.x=Math.max(recorte.x0,recorte.x1);geral.min.z=Math.min(recorte.z0,recorte.z1);geral.max.z=Math.max(recorte.z0,recorte.z1)}
    const enquadramento=enquadrarSelecao(geral,b,camera.fov,camera.aspect)
    if(!enquadramento)return
    camera.position.copy(enquadramento.posicao);camera.near=.01;camera.far=Math.max(100,enquadramento.distanciaFrente*20);camera.updateProjectionMatrix()
    if(controls){controls.target.copy(enquadramento.alvo);controls.update()}
    else camera.lookAt(enquadramento.alvo)
  },[pedido,cena,camera,controls,recorte])
  return null
}
export function NumerosElementos({cena,marcadores=[]}) {
  return marcadores.map(m=>{const b=caixaVisivel(cena,m.pecas);if(b.isEmpty())return null;return <Html key={m.numero} position={b.getCenter(new THREE.Vector3()).toArray()} center style={{pointerEvents:'none'}}><span className="numero-no-estande">{m.numero}</span></Html>})
}
export function CapturasCliente({cena,recorte,capturasRef,producao=false}) {
  const {scene,camera,gl}=useThree()
  useEffect(()=>{
    const capturar=()=>{
      const b=caixaVisivel(cena)
      if(b.isEmpty())return []
      if(recorte){b.min.x=Math.min(recorte.x0,recorte.x1);b.max.x=Math.max(recorte.x0,recorte.x1);b.min.z=Math.min(recorte.z0,recorte.z1);b.max.z=Math.max(recorte.z0,recorte.z1)}
      const c=b.getCenter(new THREE.Vector3()),t=b.getSize(new THREE.Vector3())
      const d=t.length()/Math.sin(THREE.MathUtils.degToRad(camera.fov)/2)*Math.max(1,1/camera.aspect)*.65
      const vistas=producao?[['Frente',[0,0,1]],['Elevação lateral',[-1,0,0]],['Planta baixa',[0,1,.001]],['Isométrica',[1,1,1]]]:[['Frente',[0,.1,1]],['Lateral esquerda',[-1,.1,0]],['Lateral direita',[1,.1,0]],['Vista de cima',[0,1,.001]]]
      try{return vistas.map(([nome,v])=>{
        const raio=t.length()*.55,aspect=camera.aspect
        const foto=producao?new THREE.OrthographicCamera(-raio*Math.max(1,aspect),raio*Math.max(1,aspect),raio*Math.max(1,1/aspect),-raio*Math.max(1,1/aspect),.01,Math.max(100,d*20)):camera.clone();foto.position.copy(c).add(new THREE.Vector3(...v).multiplyScalar(d));foto.lookAt(c);foto.near=.01;foto.far=Math.max(100,d*20);foto.updateProjectionMatrix()
        gl.render(scene,foto)
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.round(640/camera.aspect)
        const ctx=canvas.getContext('2d');ctx.fillStyle=producao?'#e5e9dc':'#5d6b8b';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(gl.domElement,0,0,canvas.width,canvas.height)
        return {nome,url:canvas.toDataURL('image/jpeg',.8)}
      })}finally{gl.render(scene,camera)}
    }
    window.__psfVistas=capturar
    if(capturasRef)capturasRef.current=capturar
    return()=>{if(window.__psfVistas===capturar)delete window.__psfVistas;if(capturasRef?.current===capturar)capturasRef.current=null}
  },[cena,recorte,scene,camera,gl,capturasRef,producao])
  return null
}
