export const MAX_PONTOS=40
export const pontosEletricos=escolhas=>Array.isArray(escolhas?._eletrica)?escolhas._eletrica.filter((p,i,ps)=>p&&typeof p.id==='string'&&p.id&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&ps.findIndex(x=>x?.id===p.id)===i).slice(0,MAX_PONTOS):[]
export function marcarPonto(pontos,posicao,limites,id=null){
  if(!limites||![limites.x0,limites.x1,limites.z0,limites.z1].every(Number.isFinite)||limites.x1<=limites.x0||limites.z1<=limites.z0||!Array.isArray(posicao)||posicao.length!==3||!posicao.every(Number.isFinite))return pontos
  const [x,,z]=posicao
  if(x<limites.x0||x>limites.x1||z<limites.z0||z>limites.z1)return pontos
  const coords={x:Math.round(x*1000)/1000,z:Math.round(z*1000)/1000}
  if(id)return pontos.map(p=>p.id===id?{...p,...coords}:p)
  if(pontos.length>=MAX_PONTOS)return pontos
  return [...pontos,{id:crypto.randomUUID(),...coords,uso:'',tensao:'A confirmar'}]
}
export function precoPonto(precos){
  const r=precos?.eletrica
  return r?.ativo===true&&Number.isFinite(r.valor)&&r.valor>=0?r.valor:null
}
export function posicaoPonto(p,limites){
  return limites?`${(p.x-limites.x0).toFixed(2)} m da borda esquerda · ${(limites.z1-p.z).toFixed(2)} m da borda frontal`:`X ${p.x.toFixed(2)} m · Z ${p.z.toFixed(2)} m`
}
