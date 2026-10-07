const arredondar=n=>Math.round((n+Number.EPSILON)*100)/100
export function validarFranquia(regra,superficies=[],precos={}){
  if(!regra?.ativo)return
  if(!Number.isFinite(regra.limiteM2)||regra.limiteM2<0||regra.limiteM2>10000||!Array.isArray(regra.itens)||!regra.itens.length||new Set(regra.itens).size!==regra.itens.length)throw Error('Defina a metragem incluída e selecione os itens que podem usar a franquia.')
  for(const id of regra.itens){const s=superficies.find(s=>s.id===id),p=precos.itens?.[id]?.arte||precos[s?.papel]
    if(!s?.podeArte)throw Error('Revise os itens da franquia: um deles foi removido ou não aceita arte.')
    if(p?.unidade!=='m2')throw Error(`A aplicação de arte em ${s.nome} precisa ter um preço por m² para usar a franquia.`)
    if(!Number.isFinite(precos.metragensArte?.[id])||precos.metragensArte[id]<=0)throw Error('Salve as medidas de arte do projeto antes de configurar a franquia.')
  }
}
export function aplicarFranquia(itens,regra){
  const resultado=itens.map(i=>({...i})),limite=regra?.ativo?Math.max(0,Number(regra.limiteM2)||0):0,elegiveis=new Set(regra?.ativo?regra.itens||[]:[])
  let restante=limite,utilizada=0,totalArte=0,extraM2=0
  // Maximiza o benefício do pacote; a ordem de clique nunca muda o valor.
  const ordem=resultado.filter(i=>i.tipoPersonalizacao==='arte'&&i.unidade==='m2').sort((a,b)=>b.valorUnitario-a.valorUnitario||a.id.localeCompare(b.id))
  for(const i of ordem){const area=Math.max(0,i.quantidade||0),incluida=elegiveis.has(i.id)?Math.min(restante,area):0,extra=Math.max(0,area-incluida)
    restante=Math.max(0,restante-incluida);utilizada+=incluida;totalArte+=area;extraM2+=extra
    Object.assign(i,{areaTotalM2:area,incluidoM2:incluida,extraM2:extra,quantidade:extra,total:arredondar(extra*(i.valorUnitario||0))})
    if(incluida>0)i.detalhe+=` · ${incluida.toLocaleString('pt-BR',{maximumFractionDigits:2})} m² incluídos no pacote; ${extra.toLocaleString('pt-BR',{maximumFractionDigits:2})} m² extras`
  }
  return{itens:resultado,franquia:{ativo:!!regra?.ativo,limiteM2:limite,utilizadaM2:utilizada,restanteM2:restante,areaArteM2:totalArte,extraM2}}
}
