// Configuração congelada da proposta; independente da gestão de campo.
const texto = v => String(v || '').trim().slice(0,180)
const vetor = v => Array.isArray(v) && v.length===3 && v.every(Number.isFinite) ? v : [0,0,0]
function manifesto(modelo, proposta) {
  const superficies = modelo.superficies || [], objetos = modelo.objetos || [], escolhas = proposta.escolhas || {}, acabamentos = proposta.acabamentos || {}
  const extras = []
  for (const g of modelo.complementos || []) {
    const escolha = escolhas[g.id]
    if (!escolha) continue
    if (g.tipo === 'mobiliario') {
      // O mesmo formato de instâncias usado pelo configurador, sem confiar nos nomes enviados.
      const instancias = Array.isArray(escolha.itens) ? escolha.itens : Array.isArray(escolha.instancias) ? escolha.instancias : []
      if (instancias.length > 30) throw Error('Mobiliário acima do limite do projeto.')
      const vistos = new Set(),quantidades = new Map()
      for (const item of instancias) {
        const o = (g.opcoes || []).find(o=>o.id===item.opcaoId)
        if (!o || !item.id || vistos.has(item.id)) throw Error('Mobiliário escolhido não encontrado no projeto.')
        const quantidade=(quantidades.get(o.id)||0)+1,limite=Math.max(1,Math.min(30,Math.floor(Number(o.limite)||10)))
        if(quantidade>limite)throw Error('Quantidade de mobiliário acima do limite definido no catálogo.')
        quantidades.set(o.id,quantidade)
        vistos.add(item.id)
        extras.push({id:`${g.id}:${item.id}`,grupo:texto(g.nome),nome:texto(o.nome),tipo:'mobiliario',quantidade:1,offset:vetor(item.offset || o.offset),rotY:Number.isFinite(item.rotY)?item.rotY:0,substitui:item.substituir?(o.esconde||[]):[],origem:'acrescentado'})
      }
    } else {
      const o = (g.opcoes || []).find(o=>o.id===escolha)
      if (!o) throw Error('Complemento escolhido não encontrado no projeto.')
      extras.push({id:`${g.id}:${o.id}`,grupo:texto(g.nome),nome:texto(o.nome),tipo:'complemento',quantidade:1,offset:vetor(o.offset),rotY:0,substitui:o.esconde||[],origem:'acrescentado'})
    }
  }
  const substituidos = new Set(extras.flatMap(e=>e.substitui)), removidas = new Set(superficies.filter(s=>acabamentos[s.id]?.removido).map(s=>s.id))
  const retirada = s => substituidos.has(s.id)?'substituido':removidas.has(s.id)?'retirado':'incluido'
  const materiais = superficies.map(s=>{
    const a = acabamentos[s.id] || {}
    return {id:s.id,elementoId:s.elementoId||s.id,nome:texto(s.nome),tipo:s.tipoElemento||s.papel||'elemento',papel:s.papel||'',origem:retirada(s),materialOriginal:texto(s.origem || s.nome),
      acabamento:{nome:texto(a.materialNome),codigo:texto(a.materialCodigo),fornecedor:texto(a.materialFornecedor),cor:texto(a.cor),textura:!!a.textura,alterado:!!(a.cor||a.materialId)},arte:!!(a.arte||a.artePendente),artePendente:!!a.artePendente}
  })
  const moveis = objetos.map(o=>{
    const relacionadas = superficies.filter(s=>(s.pecas||[]).some(k=>(o.pecas||[]).includes(k)))
    const todasRetiradas = relacionadas.length && relacionadas.every(s=>retirada(s)!=='incluido')
    const parcial = relacionadas.some(s=>retirada(s)!=='incluido') && !todasRetiradas
    const t = (proposta.objetos||[]).find(x=>x.id===o.id)?.transform || o.transform || {}
    return {id:o.id,nome:texto(o.nome),quantidade:1,origem:todasRetiradas?(relacionadas.some(s=>substituidos.has(s.id))?'substituido':'retirado'):'incluido',conferirAgrupamento:!!parcial,
      superficies:relacionadas.map(s=>s.id),apoio:vetor(o.apoio),transform:{dx:Number.isFinite(t.dx)?t.dx:0,dz:Number.isFinite(t.dz)?t.dz:0,rotY:Number.isFinite(t.rotY)?t.rotY:0}}
  })
  return {versao:1,modeloNome:texto(modelo.nome),modeloVersao:modelo.atualizadoEm||null,materiais,moveis,extras,areasArte:proposta.areasArte||[],eletrica:proposta.eletrica||{pontos:[]},observacoes:[]}
}
module.exports = {manifesto}
