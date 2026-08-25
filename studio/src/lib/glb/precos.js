// ============================================================================
//  Precificação.
//
//  Duas réguas, conforme a regra da montadora:
//    · SUPERFÍCIE cobra por m²  — lona, adesivo, carpete, bagum, madeira
//    · OBJETO cobra por peça    — mobiliário, balcões
//
//  A metragem sai da geometria do próprio projeto, não de digitação. Cada
//  parede tem a medida que tem no arquivo, e é essa que entra na conta.
// ============================================================================

export const UNIDADES = { m2: 'm²', peca: 'peça' }

/** Régua por papel de superfície. O admin edita; estes são os padrões. */
export const PRECOS_PADRAO = {
  lona:       { unidade: 'm2', valor: 0 },
  adesivo:    { unidade: 'm2', valor: 0 },
  piso:       { unidade: 'm2', valor: 0 },
  bagum:      { unidade: 'm2', valor: 0 },
  madeira:    { unidade: 'm2', valor: 0 },
}

/**
 * Régua por tipo de objeto, cobrada por unidade.
 *
 * Vale para o que o expositor ACRESCENTA. O mobiliário que já vem no projeto
 * está incluso no valor do estande e não é cobrado de novo.
 */
export const PRECOS_OBJETO_PADRAO = {
  Balcão:     { unidade: 'peca', valor: 0 },
  Cadeira:    { unidade: 'peca', valor: 0 },
  Banqueta:   { unidade: 'peca', valor: 0 },
  Marcenaria: { unidade: 'peca', valor: 0 },
}

export const fmtBRL = (v) =>
  (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export const fmtM2 = (v) =>
  `${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`

/**
 * Área aproveitável de uma peça: o produto das duas MAIORES dimensões.
 *
 * É a face que recebe impressão. Um painel de 2,90 × 2,90 × 0,10 vale 8,41 m²
 * de lona — não a área total do bloco, que contaria também as bordas de 10 cm.
 * Serve igual para piso (a face deitada é a maior) e para parede (a face em pé).
 */
export function areaDaPeca(bbox) {
  const d = [bbox.largura, bbox.altura, bbox.profundidade].sort((a, b) => b - a)
  return d[0] * d[1]
}

/** Peça está dentro da área do estande definida no recorte? */
function noRecorte(p, recorte) {
  if (!recorte) return true
  const [cx, , cz] = p.bbox.centro
  return cx >= Math.min(recorte.x0, recorte.x1) && cx <= Math.max(recorte.x0, recorte.x1)
      && cz >= Math.min(recorte.z0, recorte.z1) && cz <= Math.max(recorte.z0, recorte.z1)
}

/**
 * Área total de uma superfície, em m².
 *
 * Dois cuidados, e os dois vieram de medir os arquivos reais:
 *
 *  · Deduplica por chave. O arquivo de 45m² tem 1.096 peças exatamente
 *    sobrepostas; somar todas cobraria a mesma parede três vezes
 *    (A08_Garnet_Shadow daria 146 m² em vez de 53 m²).
 *
 *  · Respeita o recorte. O 45m² traz o estande espelhado e o 20m² traz as
 *    pranchas 2D do SketchUp com cópias — sem recortar, o carpete do 45m²
 *    mede 90 m² e o orçamento sai pelo dobro.
 */
export function areaDaSuperficie(sup, analise, recorte) {
  const daSup = new Set(sup.pecas)
  const vistas = new Set()
  let area = 0
  for (const p of analise.pecas) {
    if (!daSup.has(p.chave) || vistas.has(p.chave)) continue
    if (!noRecorte(p, recorte)) continue
    vistas.add(p.chave)
    area += areaDaPeca(p.bbox)
  }
  return area
}

/** Nome base do objeto, sem a numeração: "Cadeira 3" → "Cadeira". */
export const tipoDoObjeto = (o) => (o.nome || '').replace(/\s+\d+$/, '')

/**
 * Monta o orçamento a partir do que o expositor escolheu.
 *
 * Só entra na conta o que foi de fato personalizado: trocar a cor de uma parede
 * cobra a metragem daquela parede; não mexer nela não cobra nada. Objeto
 * removido sai do orçamento.
 */
export function calcularOrcamento({ analise, superficies, objetos, acabamentos, precos, precosObjeto, removidos, recorte }) {
  const itens = []

  for (const s of superficies || []) {
    const acab = acabamentos?.[s.id]
    if (!acab || (!acab.cor && !acab.arte)) continue
    const regra = precos?.[s.papel]
    if (!regra) continue

    const area = areaDaSuperficie(s, analise, recorte)
    const qtd = regra.unidade === 'm2' ? area : 1
    itens.push({
      id: s.id,
      grupo: 'superficie',
      nome: s.nome,
      detalhe: acab.arte ? 'com arte aplicada' : 'troca de cor',
      unidade: regra.unidade,
      quantidade: qtd,
      valorUnitario: regra.valor || 0,
      total: (regra.valor || 0) * qtd,
    })
  }

  for (const o of objetos || []) {
    if (removidos?.[o.id]) continue
    // mobiliário do projeto é incluso: só cobra o que foi acrescentado
    if (o.incluso !== false) continue
    // objeto fora da área do estande não é cobrado — é cópia espelhada ou prancha
    if (recorte && !noRecorte({ bbox: { centro: o.centro } }, recorte)) continue
    const regra = precosObjeto?.[tipoDoObjeto(o)]
    if (!regra || !regra.valor) continue
    itens.push({
      id: o.id,
      grupo: 'objeto',
      nome: o.nome,
      detalhe: 'item adicional',
      unidade: 'peca',
      quantidade: 1,
      valorUnitario: regra.valor,
      total: regra.valor,
    })
  }

  const total = itens.reduce((s, i) => s + i.total, 0)
  return {
    itens,
    total,
    porGrupo: {
      superficie: itens.filter((i) => i.grupo === 'superficie').reduce((s, i) => s + i.total, 0),
      objeto: itens.filter((i) => i.grupo === 'objeto').reduce((s, i) => s + i.total, 0),
    },
  }
}
