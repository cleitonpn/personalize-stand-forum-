import {PERFIS_PADRAO} from './perfis.js'
import * as THREE from 'three'
import { projetarFrente } from '../glb/frente.js'
import {listarElementos} from '../glb/elementos.js'
import {areaDaSuperficie} from '../glb/precos.js'

// Mede vértices na base da face, não o retângulo em eixos do mundo.
// Paredes giradas continuam com a largura real; balcões usam a mesma face da arte.
export function medirAreas(superficies, analise, cena,objetos=[],recorte=null) {
  if (!analise || !cena) return []
  const malhas = new Map(); cena.traverse(m => { if(m.isMesh) malhas.set(m.uuid,m) })
  const elementos=listarElementos(superficies,objetos,analise,recorte)
  const nomes=new Map(listarElementos(superficies,objetos,analise,recorte).map(e=>[e.id,e.nome]))
  const grupos=new Map()
  for(const s of (superficies||[]).filter(s=>s.podeArte)){const id=s.elementoId||s.id;if(!grupos.has(id))grupos.set(id,[]);grupos.get(id).push(s)}
  return [...grupos].map(([id,membros])=>{
    const base=membros.find(s=>s.nomeManual)||membros[0]
    const s={...base,id,nome:nomes.get(id)||base.nome,pecas:[...new Set(membros.flatMap(s=>s.pecas))]}
    const pecas=analise.pecas.filter(p=>s.pecas.includes(p.chave)&&(!recorte||(p.bbox.centro[0]>=Math.min(recorte.x0,recorte.x1)&&p.bbox.centro[0]<=Math.max(recorte.x0,recorte.x1)&&p.bbox.centro[2]>=Math.min(recorte.z0,recorte.z1)&&p.bbox.centro[2]<=Math.max(recorte.z0,recorte.z1))))
    const ms=[...new Set(pecas.map(p=>malhas.get(p.uuid)).filter(Boolean))]
    let largura=0,altura=0, confiavel=false
    const frontal=s.arteFrontal??/balc[ãa]o|counter|reception/i.test(s.nome)
    if(frontal){
      const frente=[...projetarFrente(ms,s.anguloFrente).values()][0]
      if(frente){largura=frente.largura;altura=frente.altura;confiavel=true}
    }else if(pecas.length){
      const principal=pecas.reduce((a,b)=>Math.max(...a.dimensoesLocais)>Math.max(...b.dimensoesLocais)?a:b)
      const n=new THREE.Vector3(...principal.normalPlano).normalize()
      const up=Math.abs(n.y)>.9?new THREE.Vector3(0,0,1):new THREE.Vector3(0,1,0)
      const u=up.clone().cross(n).normalize(), v=n.clone().cross(u).normalize()
      const b=new THREE.Box3(), ponto=new THREE.Vector3()
      for(const m of ms){const matriz=m.userData._matrizArteBase||m.matrixWorld;const pos=m.geometry.attributes.position
        for(let i=0;i<pos.count;i++){ponto.fromBufferAttribute(pos,i).applyMatrix4(matriz);b.expandByPoint(new THREE.Vector3(ponto.dot(u),ponto.dot(v),ponto.dot(n)))}}
      if(!b.isEmpty()){const d=b.getSize(new THREE.Vector3());largura=d.x;altura=d.y;confiavel=d.z<.12&&pecas.every(p=>Math.abs(new THREE.Vector3(...p.normalPlano).dot(n))>.98)}
    }
    const perfilId=frontal?'adesivo-balcao':s.tipoElemento==='logo'?'placa':/testeira/i.test(s.nome)?'testeira':s.papel==='piso'?'vinil-piso':'lona-parede',perfil=PERFIS_PADRAO.find(p=>p.id===perfilId)
    return {sangriaMm:perfil.sangriaMm,margemMm:perfil.margemMm,id:s.id,superficieIds:membros.map(s=>s.id),nome:s.nome,perfilId:frontal?'adesivo-balcao':s.tipoElemento==='logo'?'placa':/testeira/i.test(s.nome)?'testeira':s.papel==='piso'?'vinil-piso':'lona-parede',larguraCm:Math.round(largura*10000)/100,alturaCm:Math.round(altura*10000)/100,origem:'glb',confiavel,confirmada:false,...base.producaoArte,semGabarito:elementos.find(e=>e.id===id)?.tipo==='logo',...(elementos.find(e=>e.id===id)?.tipo==='logo'?{confirmada:true}:{} )}
  })
}

export function areasEscolhidas(medidas, acabamentos, ocultas=new Set()) {
  return medidas.filter(a=>(a.superficieIds||[a.id]).some(id=>!ocultas.has(id)&&!acabamentos[id]?.removido&&(acabamentos[id]?.arte||acabamentos[id]?.artePendente)))
}

export function metragensArte(superficies,analise,cena,objetos=[],recorte=null){
  const resultado={}
  for(const a of medirAreas(superficies,analise,cena,objetos,recorte)){
    const ss=superficies.filter(s=>a.superficieIds.includes(s.id)),areas=ss.map(s=>areaDaSuperficie(s,analise,recorte)),soma=areas.reduce((a,b)=>a+b,0),total=a.larguraCm*a.alturaCm/10000
    ss.forEach((s,i)=>{resultado[s.id]=soma>0?total*areas[i]/soma:0})
  }
  return resultado
}
