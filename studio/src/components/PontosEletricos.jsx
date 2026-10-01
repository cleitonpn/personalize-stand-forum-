import { Html } from '@react-three/drei'
export default function PontosEletricos({pontos=[],limites,altura=0,modo,aoMarcar}){
  return <group>
    {modo&&limites&&<mesh position={[(limites.x0+limites.x1)/2,altura+.025,(limites.z0+limites.z1)/2]} rotation={[-Math.PI/2,0,0]} onClick={e=>{e.stopPropagation();if(e.delta<5)aoMarcar?.([e.point.x,altura,e.point.z])}}><planeGeometry args={[limites.x1-limites.x0,limites.z1-limites.z0]}/><meshBasicMaterial transparent opacity={.08} color="#ffc75f" depthWrite={false}/></mesh>}
    {pontos.map((p,i)=><group key={p.id} position={[p.x,altura+.04,p.z]}><mesh rotation={[-Math.PI/2,0,0]} raycast={()=>null}><ringGeometry args={[.075,.12,32]}/><meshBasicMaterial color="#ffcb66" depthTest={false}/></mesh><Html center position={[0,.09,0]} style={{pointerEvents:'none'}}><span className="ponto-eletrico">⚡ {i+1}</span></Html></group>)}
  </group>
}
