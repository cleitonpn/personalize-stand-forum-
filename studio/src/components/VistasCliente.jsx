import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'

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
export function FocarElemento({ cena, pedido }) {
  const {camera,controls}=useThree()
  useEffect(()=>{
    if(!pedido?.pecas?.length||!cena)return
    const b=caixaVisivel(cena,pedido.pecas)
    if(b.isEmpty())return
    const c=b.getCenter(new THREE.Vector3()),t=b.getSize(new THREE.Vector3()),geral=caixaVisivel(cena).getCenter(new THREE.Vector3())
    const normal=t.x<t.z?new THREE.Vector3(Math.sign(geral.x-c.x)||1,0,0):new THREE.Vector3(0,0,Math.sign(geral.z-c.z)||1)
    const d=Math.max(t.length(),.8)/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2))*Math.max(1,1/camera.aspect)*1.3
    camera.position.copy(c).addScaledVector(normal,d);camera.near=.01;camera.far=Math.max(100,d*20);camera.updateProjectionMatrix()
    if(controls){controls.target.copy(c);controls.update()}
  },[pedido,cena,camera,controls])
  return null
}
export function NumerosElementos({cena,marcadores=[]}) {
  return marcadores.map(m=>{const b=caixaVisivel(cena,m.pecas);if(b.isEmpty())return null;return <Html key={m.numero} position={b.getCenter(new THREE.Vector3()).toArray()} center style={{pointerEvents:'none'}}><span className="numero-no-estande">{m.numero}</span></Html>})
}
export function CapturasCliente({cena,recorte}) {
  const {scene,camera,gl}=useThree()
  useEffect(()=>{
    const capturar=()=>{
      const b=caixaVisivel(cena)
      if(b.isEmpty())return []
      if(recorte){b.min.x=Math.min(recorte.x0,recorte.x1);b.max.x=Math.max(recorte.x0,recorte.x1);b.min.z=Math.min(recorte.z0,recorte.z1);b.max.z=Math.max(recorte.z0,recorte.z1)}
      const c=b.getCenter(new THREE.Vector3()),t=b.getSize(new THREE.Vector3())
      const d=t.length()/Math.sin(THREE.MathUtils.degToRad(camera.fov)/2)*Math.max(1,1/camera.aspect)*.65
      try{return [['Frente',[0,.1,1]],['Lateral esquerda',[-1,.1,0]],['Lateral direita',[1,.1,0]],['Vista de cima',[0,1,.001]]].map(([nome,v])=>{
        const foto=camera.clone();foto.position.copy(c).add(new THREE.Vector3(...v).multiplyScalar(d));foto.lookAt(c);foto.near=.01;foto.far=Math.max(100,d*20);foto.updateProjectionMatrix()
        gl.render(scene,foto)
        const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.round(640/camera.aspect)
        const ctx=canvas.getContext('2d');ctx.fillStyle='#5d6b8b';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(gl.domElement,0,0,canvas.width,canvas.height)
        return {nome,url:canvas.toDataURL('image/jpeg',.8)}
      })}finally{gl.render(scene,camera)}
    }
    window.__psfVistas=capturar
    return()=>{if(window.__psfVistas===capturar)delete window.__psfVistas}
  },[cena,recorte,scene,camera,gl])
  return null
}
