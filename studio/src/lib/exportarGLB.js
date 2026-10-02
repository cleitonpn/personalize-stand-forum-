import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'

export function copiarMalhasVisiveis(raizes){
  const cena=new THREE.Scene()
  for(const raiz of raizes.filter(Boolean)){
    raiz.updateWorldMatrix(true,true)
    raiz.traverse(o=>{
      if(!o.isMesh)return
      for(let p=o;p;p=p.parent)if(!p.visible)return
      if(o.isSkinnedMesh)throw Error('Este GLB contém uma malha animada. Peça à equipe uma versão estática para registrar a proposta.')
      const incluir=matriz=>{
        const malha=new THREE.Mesh(o.geometry,o.material)
        malha.name=o.name||'Elemento';malha.matrix.copy(matriz);malha.matrixAutoUpdate=false
        malha.matrix.decompose(malha.position,malha.quaternion,malha.scale)
        if(o.morphTargetInfluences)malha.morphTargetInfluences=[...o.morphTargetInfluences]
        cena.add(malha)
      }
      if(o.isInstancedMesh){for(let i=0;i<o.count;i++){const m=new THREE.Matrix4();o.getMatrixAt(i,m);incluir(m.premultiply(o.matrixWorld))}}
      else incluir(o.matrixWorld)
    })
  }
  return cena
}
export async function exportarGLB(raizes,pontos=[]){
  const cena=copiarMalhasVisiveis(raizes)
  if(!cena.children.length)throw Error('O estande ainda não está pronto para exportar.')
  for(const malha of cena.children)for(const mat of [].concat(malha.material)){
    for(const valor of Object.values(mat))if(valor?.isTexture){
      const img=valor.image
      if(!img||!(img.width||img.videoWidth)||img.complete===false)throw Error('Uma textura ainda não carregou. Aguarde e tente enviar novamente.')
    }
  }
  // Pontos são nós nomeados; não se confundem com mobiliário de produção.
  for(const [i,p] of pontos.entries()){
    const no=new THREE.Object3D();no.name=`Ponto elétrico adicional ${i+1}`
    no.position.set(p.x,0,p.z);no.userData={uso:p.uso||'',tensao:p.tensao||'A confirmar'};cena.add(no)
  }
  const binario=await new GLTFExporter().parseAsync(cena,{binary:true,onlyVisible:true})
  return new Blob([binario],{type:'model/gltf-binary'})
}
