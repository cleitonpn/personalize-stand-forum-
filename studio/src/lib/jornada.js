import { opcoesAtivas, superficiesEscondidas } from './glb/complementos.js'

export const ETAPAS = [
  { id:'ambientes', nome:'Seu projeto', pergunta:'Seu estande já tem um ponto de partida', dica:'Confira o que já está incluído. Você só precisa escolher o que quer mudar ou acrescentar.', vista:'perspectiva' },
  { id:'marca', nome:'Sua marca', pergunta:'Onde você quer destacar sua empresa?', dica:'Escolha um cartão para personalizar paredes, logos e frentes de balcão.', vista:'frente' },
  { id:'piso', nome:'Piso', pergunta:'Qual acabamento combina com sua marca?', dica:'Compare as cores no estande. Você também pode manter o piso original.', vista:'cima' },
  { id:'mobiliario', nome:'Mobiliário', pergunta:'Como você quer receber seus visitantes?', dica:'Mantenha, troque ou acrescente móveis. Arraste cada peça para distribuir do seu jeito.', vista:'cima' },
  { id:'complementos', nome:'Complementos', pergunta:'Precisa de mais alguma coisa?', dica:'Confira os itens extras disponíveis para este projeto.', vista:'perspectiva' },
  { id:'eletrica', nome:'Elétrica', pergunta:'Onde você precisa de mais energia?', dica:'Marque no piso a posição de cada ponto adicional. O valor aparece antes de adicionar.', vista:'cima' },
  { id:'revisao', nome:'Revisão', pergunta:'Confira como ficou seu estande', dica:'Revise as escolhas e as artes pendentes antes de enviar à equipe.', vista:'perspectiva' },
]
export function etapaGrupo(g) {
  if (g.tipo === 'mobiliario') return 'mobiliario'
  if (['ambientes','marca','complementos'].includes(g.etapa)) return g.etapa
  if (/sala|reuni[aã]o|dep[oó]sito|ambiente/i.test(g.nome)) return 'ambientes'
  if (/led|logo|painel|testeira/i.test(g.nome)) return 'marca'
  return 'complementos'
}
export function pertenceEtapa(e, etapa) {
  if (etapa === 'marca') return ['parede','logo'].includes(e.tipo) || (e.tipo !== 'piso' && e.superficies.some(s => s.podeArte))
  if (etapa === 'piso') return e.tipo === 'piso'
  if (etapa === 'mobiliario') return e.tipo === 'movel'
  return false
}
export const ordenarCliente = lista => [...lista].sort((a,b) => (a.ordemCliente ?? a.superficies?.[0]?.ordemCliente ?? 100) - (b.ordemCliente ?? b.superficies?.[0]?.ordemCliente ?? 100))
export function resumoEtapa(id, elementos, grupos, escolhas, acabamentos) {
  const ativas = opcoesAtivas(grupos, escolhas), ocultas = superficiesEscondidas(ativas)
  const es = elementos.filter(e => pertenceEtapa(e, id))
  const pendencias = es.filter(e => e.superficies.some(s => !ocultas.has(s.id) && !acabamentos[s.id]?.removido && acabamentos[s.id]?.artePendente && !acabamentos[s.id]?.arte))
  const alterados = es.filter(e => e.superficies.some(s => !ocultas.has(s.id) && ['cor','arte','removido','artePendente'].some(k => acabamentos[s.id]?.[k])) || e.objetos.some(o => o.transform?.dx || o.transform?.dz || o.transform?.rotY))
  const adicionais = ativas.filter(o => etapaGrupo(grupos.find(g => g.id === o.grupoId) || {}) === id)
  const personalizado = alterados.length > 0 || adicionais.length > 0 || (id==='eletrica'&&escolhas?._eletrica?.length>0)
  return { pendencias, alterados, adicionais, personalizado,
    status: pendencias.length ? 'Pendente' : personalizado ? 'Personalizado' : escolhas?._etapas?.[id] ? 'Mantido' : 'A escolher' }
}

/** Somente decisões novas retiram opções incompatíveis; nunca perde alterações de acabamento. */
export function resolverConflitos(grupos, anterior, proximo) {
  const antes = opcoesAtivas(grupos, anterior), depois = opcoesAtivas(grupos, proximo)
  const novas = depois.filter(o => !antes.some(a => a.id === o.id && JSON.stringify(a.esconde) === JSON.stringify(o.esconde)))
  const retiradas = depois.filter(a => novas.some(n => n.id !== a.id && !novas.some(x => x.id === a.id) && (
    n.incompativeis?.includes(a.opcaoId || a.id) || a.incompativeis?.includes(n.opcaoId || n.id)
    || ((n.opcaoId || n.id) !== (a.opcaoId || a.id) && n.esconde?.some(id => a.esconde?.includes(id)))
  )))
  const resultado = { ...proximo }
  for (const o of retiradas) {
    const valor = resultado[o.grupoId]
    resultado[o.grupoId] = typeof valor === 'object' && valor?.itens
      ? { itens: valor.itens.filter(i => `${o.grupoId}:${i.id}` !== o.id) } : null
  }
  return { escolhas: resultado, retiradas }
}
