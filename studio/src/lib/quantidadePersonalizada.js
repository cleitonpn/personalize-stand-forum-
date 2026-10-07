export function quantidadePersonalizada(
  elementos,
  acabamentos,
  ativas,
  pontos,
  objetosOriginais = [],
) {
  const ocultas = new Set(ativas.flatMap((a) => a.esconde || []))
  const itens = elementos.filter(
    (e) =>
      e.superficies.some(
        (s) =>
          !ocultas.has(s.id) &&
          ['cor', 'arte', 'artePendente', 'removido'].some((k) =>
            Boolean(acabamentos[s.id]?.[k]),
          ),
      ) ||
      e.objetos.some(o => {
        const base = objetosOriginais.find(original => original.id === o.id)?.transform || {}
        return ['dx','dz','rotY'].some(k => (o.transform?.[k] || 0) !== (base[k] || 0))
      }),
  )
  return itens.length + ativas.length + pontos.length
}
