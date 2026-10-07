// Revisões não são vendas novas: considera o último envio por expositor/feira.
export function consolidarPropostas(propostas) {
  const ultimas = new Map()
  for (const p of propostas) {
    const chave = JSON.stringify([
      p.cliente,
      p.feiraId || p.feira || '',
      p.organizadoraId || '',
    ])
    const anterior = ultimas.get(chave)
    const tempo = (x) => x.criadoEm?.seconds || 0
    const nanos = (x) => x.criadoEm?.nanoseconds || 0
    if (
      !anterior ||
      tempo(p) > tempo(anterior) ||
      (tempo(p) === tempo(anterior) && nanos(p) > nanos(anterior)) ||
      (tempo(p) === tempo(anterior) && nanos(p) === nanos(anterior) && p.id > anterior.id)
    )
      ultimas.set(chave, p)
  }
  return [...ultimas.values()]
}
export function resumirComercial(propostas) {
  const lista = consolidarPropostas(propostas)
  return {
    propostas: propostas.length,
    clientes: new Set(lista.map((p) => p.cliente)).size,
    total: lista.reduce(
      (s, p) => s + (Number.isFinite(p.total) && p.total >= 0 ? p.total : 0),
      0,
    ),
    itens: lista.reduce(
      (s, p) =>
        s +
        (Number.isInteger(p.quantidadePersonalizada)
          ? p.quantidadePersonalizada
          : 0),
      0,
    ),
    semContagem: lista.filter(
      (p) => !Number.isInteger(p.quantidadePersonalizada),
    ).length,
    lista,
  }
}
export function agruparComercial(propostas, campo) {
  const grupos = new Map()
  for (const p of consolidarPropostas(propostas)) {
    const id = p[campo] || (campo === 'feiraId' ? p.feira : '') || 'legado'
    if (!grupos.has(id)) grupos.set(id, [])
    grupos.get(id).push(p)
  }
  return [...grupos.entries()].map(([id, lista]) => ({
    id,
    ...resumirComercial(lista),
  }))
}
