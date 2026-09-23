// O catálogo fica junto dos complementos do modelo; cada escolha guarda
// instâncias independentes, para não compartilhar posição entre duas cadeiras.
export const LIMITE_MOBILIARIO = 30
export const limiteMobiliario = o => Math.max(1, Math.min(LIMITE_MOBILIARIO, Math.floor(Number(o.limite) || 10)))
export const instanciasMobiliario = escolha => Array.isArray(escolha?.itens) ? escolha.itens : []
const numero = n => Number.isFinite(n) ? n : 0

export function ajustarMovel(opcao, instancia, patch, limites) {
  const offset = (patch.offset || instancia.offset || opcao.offset || [0, 0, 0]).map(numero)
  const rotY = numero(patch.rotY ?? instancia.rotY)
  const b = opcao.bbox
  if (b && limites) {
    const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY))
    const meios = [(b.largura * c + b.profundidade * s) / 2, (b.profundidade * c + b.largura * s) / 2]
    for (const [i, a, z, meio] of [[0, limites.x0, limites.x1, meios[0]], [2, limites.z0, limites.z1, meios[1]]]) {
      const min = Math.min(a, z) + meio, max = Math.max(a, z) - meio
      const centro = b.centro[i] + offset[i]
      offset[i] = (min > max ? (a + z) / 2 : Math.max(min, Math.min(max, centro))) - b.centro[i]
    }
  }
  return { ...instancia, ...patch, offset, rotY }
}

export function adicionarMovel(grupo, escolha, opcao, substituir = false, limites) {
  const itens = instanciasMobiliario(escolha)
  if (!opcao.arquivo?.url || itens.length >= LIMITE_MOBILIARIO || itens.filter(i => i.opcaoId === opcao.id).length >= limiteMobiliario(opcao)) return escolha
  const base = opcao.offset || [0, 0, 0]
  const passo = (opcao.bbox?.largura || 0.8) + 0.25
  const n = itens.filter(i => i.opcaoId === opcao.id).length
  const instancia = ajustarMovel(opcao, {}, {
    id: crypto.randomUUID(), opcaoId: opcao.id,
    substituir: !!substituir && !!opcao.esconde?.length,
    offset: [base[0] + n * passo, base[1], base[2]], rotY: 0,
  }, limites)
  return { itens: [...itens, instancia] }
}

/** Dados legíveis e geometria necessária para reproduzir a proposta. */
export function registroComplemento(o) {
  return {
    grupo: o.grupoNome, opcao: o.nome, arquivo: o.arquivo?.nomeOriginal || null,
    tipo: o.tipo || 'complemento', instanciaId: o.id, opcaoId: o.opcaoId || o.id,
    offset: o.offset || [0, 0, 0], rotY: o.rotY || 0,
    substitui: o.esconde || [],
  }
}
