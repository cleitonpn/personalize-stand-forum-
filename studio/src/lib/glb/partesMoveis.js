// Materiais estruturais dentro de um componente de móvel também se movem.
// A hierarquia do GLB é a evidência; proximidade com um móvel não basta.
export function completarPartesMoveis(analise, objetos = [], superficies = [], papeis = {}) {
  if (!analise) return objetos
  const porSup = new Map(superficies.flatMap(s => s.pecas.map(k => [k, s])))
  const donos = new Map(objetos.flatMap(o => o.pecas.map(k => [k, o.id])))
  const componentes = new Map()
  for (const p of analise.pecas) {
    if (!p.componenteOrigem) continue
    if (!componentes.has(p.componenteOrigem)) componentes.set(p.componenteOrigem, { donos: new Set(), pecas: [] })
    const c = componentes.get(p.componenteOrigem)
    c.pecas.push(p)
    if (donos.has(p.chave)) c.donos.add(donos.get(p.chave))
  }
  const extras = new Map()
  for (const c of componentes.values()) {
    // Divisões manuais continuam independentes: não adivinhar o dono de uma peça.
    if (c.donos.size !== 1) continue
    const id = [...c.donos][0], obj = objetos.find(o => o.id === id)
    if (!obj || (!obj.podeMover && !obj.podeGirar)) continue
    for (const p of c.pecas) {
      if (donos.has(p.chave)) continue
      const s = porSup.get(p.chave), papel = s?.papel ?? papeis[p.materialNome] ?? analise.materiais.find(m => m.nome === p.materialNome)?.papelSugerido
      if (papel !== 'metal' || (s?.tipoManual && s.tipoElemento !== 'movel') || s?.grupoManual) continue
      if (!extras.has(id)) extras.set(id, new Set())
      extras.get(id).add(p.chave)
    }
  }
  if (!extras.size) return objetos
  return objetos.map(o => extras.has(o.id) ? { ...o, pecas: [...new Set([...o.pecas, ...extras.get(o.id)])], pecasTotal: new Set([...o.pecas, ...extras.get(o.id)]).size } : o)
}
