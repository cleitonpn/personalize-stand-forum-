// Um conjunto físico se move inteiro, mesmo quando seus suportes têm outro
// material. A hierarquia do GLB ou uma união manual é a evidência; proximidade
// com um móvel não basta.
export function completarPartesMoveis(analise, objetos = [], superficies = [], papeis = {}) {
  // O editor renderiza a cena antes de inicializar seu mapeamento.
  objetos = objetos ?? []
  superficies = superficies ?? []
  papeis = papeis ?? {}
  if (!analise) return objetos
  const porSup = new Map(superficies.flatMap(s => s.pecas.map(k => [k, s])))
  const donos = new Map(objetos.flatMap(o => o.pecas.map(k => [k, o.id])))
  const componentes = new Map()
  const gruposManuais = new Map()
  for (const p of analise.pecas) {
    const s = porSup.get(p.chave), grupo = s?.grupoManual || (s?.agrupada ? s.id : null)
    if (grupo && s.tipoElemento === 'movel') {
      if (!gruposManuais.has(grupo)) gruposManuais.set(grupo, {donos:new Set(),pecas:[],manual:true})
      const g=gruposManuais.get(grupo)
      g.pecas.push(p)
      if(donos.has(p.chave))g.donos.add(donos.get(p.chave))
    }
    if (!p.componenteOrigem) continue
    if (!componentes.has(p.componenteOrigem)) componentes.set(p.componenteOrigem, { donos: new Set(), pecas: [] })
    const c = componentes.get(p.componenteOrigem)
    c.pecas.push(p)
    if (donos.has(p.chave)) c.donos.add(donos.get(p.chave))
  }
  const extras = new Map()
  for (const c of [...gruposManuais.values(), ...componentes.values()]) {
    // Divisões manuais continuam independentes: não adivinhar o dono de uma peça.
    if (c.donos.size !== 1) continue
    const id = [...c.donos][0], obj = objetos.find(o => o.id === id)
    if (!obj || (!obj.podeMover && !obj.podeGirar)) continue
    for (const p of c.pecas) {
      if (donos.has(p.chave)) continue
      const s = porSup.get(p.chave), papel = s?.papel ?? papeis[p.materialNome] ?? analise.materiais.find(m => m.nome === p.materialNome)?.papelSugerido
      if (!c.manual) {
        // Exportadores podem usar "bagum preto" nos suportes de ferro.
        // Recuperar apenas peças pequenas desse material, dentro do mesmo
        // componente, sem incorporar painéis ou desfazer separações manuais.
        const suporte = ['bagum','lona'].includes(papel) && p.bbox.altura <= .6 && Math.max(p.bbox.largura,p.bbox.profundidade) <= .8
        if ((papel !== 'metal' && !suporte) || (s?.tipoManual && s.tipoElemento !== 'movel') || s?.grupoManual || s?.agrupada) continue
      }
      if (!extras.has(id)) extras.set(id, new Set())
      extras.get(id).add(p.chave)
    }
  }
  if (!extras.size) return objetos
  return objetos.map(o => extras.has(o.id) ? { ...o, pecas: [...new Set([...o.pecas, ...extras.get(o.id)])], pecasTotal: new Set([...o.pecas, ...extras.get(o.id)]).size } : o)
}
