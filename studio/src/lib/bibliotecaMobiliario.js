import { offsetNoPiso } from './glb/complementos.js'

// Referências estáveis evitam duplicar o móvel ao relacionar novamente.
export function relacionarMobiliario(modelo, itens) {
  const grupos=structuredClone(modelo.complementos||[])
  let grupo=grupos.find(g=>g.id==='biblioteca-mobiliario')
  if(!grupo){grupo={id:'biblioteca-mobiliario',tipo:'mobiliario',nome:'Mobiliário disponível',opcoes:[],rotuloPadrao:'Manter mobiliário incluído'};grupos.push(grupo)}
  const r=modelo.recorte
  const centro=r?[(r.x0+r.x1)/2,0,(r.z0+r.z1)/2]:[0,0,0]
  for(const item of itens){
    if(!item.arquivo?.url||!item.bbox)throw Error(`O móvel ${item.nome} não tem um GLB válido.`)
    const id=`bib-${item.id}`,indice=grupo.opcoes.findIndex(o=>o.id===id),antigo=grupo.opcoes[indice]
    const opcao={id,bibliotecaId:item.id,nome:item.nome,arquivo:item.arquivo,bbox:item.bbox,
      esconde:[],offset:offsetNoPiso(item.bbox,centro),limite:item.limite||10,
      preco:{unidade:'peca',valor:item.valor},...antigo}
    // Atualizar a biblioteca não sobrescreve ajustes comerciais/posições locais.
    if(indice<0)grupo.opcoes.push(opcao)
  }
  return grupos
}
