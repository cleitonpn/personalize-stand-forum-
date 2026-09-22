import * as THREE from 'three'

export const ehBalcao = e => /balc[ãa]o|counter|reception/i.test([e.nome, ...e.objetos.map(o => o.nome)].join(' '))

// Projeção no espaço original do arquivo: mover/girar o móvel leva a arte junto.
// Material 0 recebe cor; material 1 recebe arte. Só triângulos da face externa
// escolhida entram no material 1, inclusive quando o balcão é uma malha única.
export function projetarFrente(malhas, angulo) {
  if (!malhas.length) return new Map()
  const dados = malhas.map(m => {
    const matriz = m.userData._matrizArteBase || m.matrixWorld
    const g = m.geometry, pos = g.attributes.position
    const pontos = Array.from({length:pos.count}, (_,i) => new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(matriz))
    return {m,g,pontos,caixa:new THREE.Box3().setFromPoints(pontos)}
  })
  const caixa = new THREE.Box3(); dados.forEach(d => caixa.union(d.caixa))
  const centro = caixa.getCenter(new THREE.Vector3())
  let n
  if (Number.isFinite(angulo)) n = new THREE.Vector3(Math.sin(angulo*Math.PI/180),0,Math.cos(angulo*Math.PI/180))
  else {
    const finas = dados.filter(d => { d.g.computeBoundingBox(); const s=d.g.boundingBox.getSize(new THREE.Vector3()); return Math.min(s.x,s.y,s.z)<.08 && d.caixa.max.y-d.caixa.min.y>.25 })
      .sort((a,b) => b.caixa.getSize(new THREE.Vector3()).length()-a.caixa.getSize(new THREE.Vector3()).length())
    const d=finas[0]
    if (d) {
      d.g.computeBoundingBox()
      const tamanhos=d.g.boundingBox.getSize(new THREE.Vector3()).toArray(), eixo=tamanhos.indexOf(Math.min(...tamanhos))
      n=new THREE.Vector3(eixo===0?1:0,eixo===1?1:0,eixo===2?1:0).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(d.m.userData._matrizArteBase || d.m.matrixWorld))
      n.y=0; n.normalize()
      if (d.caixa.getCenter(new THREE.Vector3()).sub(centro).dot(n)<0) n.negate()
    } else {
      let maior=0; n=new THREE.Vector3(0,0,1)
      for(const item of dados){const indices=item.g.index?Array.from(item.g.index.array):item.pontos.map((_,i)=>i)
        for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3).map(j=>item.pontos[j]);const normal=b.clone().sub(a).cross(c.clone().sub(a));const area=normal.length();normal.normalize()
          if(Math.abs(normal.y)<.02 && area>maior){maior=area;n=normal}
        }
      }
      if(n.z<-.001 || (Math.abs(n.z)<.001 && n.x<0))n.negate()
    }
  }
  const u=new THREE.Vector3(0,1,0).cross(n).normalize()
  const limite=dados.reduce((max,d)=>d.pontos.reduce((v,p)=>Math.max(v,p.dot(n)),max),-Infinity)
  const faces=[]
  for (const d of dados) {
    d.indices=d.g.index?Array.from(d.g.index.array):d.pontos.map((_,i)=>i)
    d.frente=[]
    for(let i=0;i<d.indices.length;i+=3){
      const ps=d.indices.slice(i,i+3).map(j=>d.pontos[j])
      const normal=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0])).normalize()
      const ok=Math.abs(normal.dot(n))>.98 && ps.every(p=>Math.abs(p.dot(n)-limite)<.015)
      d.frente.push(ok); if(ok) faces.push(...ps)
    }
  }
  if(!faces.length) return new Map()
  const xs=faces.map(p=>p.dot(u)), ys=faces.map(p=>p.y)
  const x0=xs.reduce((a,b)=>Math.min(a,b),Infinity), y0=ys.reduce((a,b)=>Math.min(a,b),Infinity), w=xs.reduce((a,b)=>Math.max(a,b),-Infinity)-x0 || 1, h=ys.reduce((a,b)=>Math.max(a,b),-Infinity)-y0 || 1
  return new Map(dados.map(d=>{
    const uv=new Float32Array(d.pontos.length*2)
    d.pontos.forEach((p,i)=>{uv[i*2]=(p.dot(u)-x0)/w;uv[i*2+1]=1-(p.y-y0)/h})
    const grupos=[]
    d.frente.forEach((f,i)=>{const materialIndex=f?1:0, ultimo=grupos.at(-1);if(ultimo?.materialIndex===materialIndex)ultimo.count+=3;else grupos.push({start:i*3,count:3,materialIndex})})
    return [d.m,{attr:new THREE.BufferAttribute(uv,2),proporcao:w/h,grupos}]
  }))
}
