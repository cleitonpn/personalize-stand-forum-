// ============================================================================
//  Superfícies — a unidade de personalização.
//
//  Material é um bom atalho para CLASSIFICAR (18 materiais cobrem 33 mil nós),
//  mas é uma péssima unidade para PERSONALIZAR: no arquivo de 45m² os 15 painéis
//  gráficos compartilham o material "Madeira 16", então mexer no material mexe
//  nos 15 de uma vez. E o inverso também acontece: a banqueta tem o assento num
//  material e os pés em outro, quando para o expositor é um objeto só.
//
//  Então a superfície é um conjunto NOMEADO de peças, que o admin divide e une
//  livremente. O material só semeia o estado inicial.
// ============================================================================

import { PAPEIS } from './roles.js'

let seq = 0
const novoId = () => `sup-${Date.now().toString(36)}-${seq++}`

/** Uma superfície por material — ponto de partida antes de qualquer ajuste. */
export function superficiesPadrao(analise, papeis) {
  return analise.materiais
    .filter((m) => (papeis[m.nome] || m.papelSugerido) !== 'ignorar')
    .map((m) => {
      const papel = papeis[m.nome] || m.papelSugerido
      return {
        id: novoId(),
        nome: m.nome,
        papel,
        // Permissões do expositor, cada uma explícita. Quem decide é o ADMIN;
        // o papel sugerido só define o valor inicial.
        podeCor: !!PAPEIS[papel]?.personalizavel,
        podeArte: !!PAPEIS[papel]?.personalizavel,
        pecas: analise.pecas.filter((p) => p.materialNome === m.nome).map((p) => p.chave),
        origem: m.nome,
      }
    })
}

/** Uma superfície por peça — para os casos "quero cada logo separado". */
export function dividirPorPeca(sup, analise) {
  const pecas = analise.pecas.filter((p) => sup.pecas.includes(p.chave))
  const unicas = [...new Map(pecas.map((p) => [p.chave, p])).values()]

  // ordena por posição para os nomes saírem numa sequência que faz sentido
  // ao percorrer o estande, em vez da ordem arbitrária do arquivo
  unicas.sort((a, b) => (a.bbox.centro[0] - b.bbox.centro[0]) || (a.bbox.centro[2] - b.bbox.centro[2]))

  return unicas.map((p, i) => ({
    id: novoId(),
    nome: `${sup.nome} ${i + 1}`,
    papel: sup.papel,
    podeCor: sup.podeCor, podeArte: sup.podeArte,
    pecas: [p.chave],
    origem: sup.origem,
  }))
}

/**
 * Agrupa as peças da superfície por proximidade.
 * Serve para o caso "esta parede é um bloco só, mas quero uma superfície por
 * lado do estande" sem precisar separar peça a peça na mão.
 */
export function dividirPorProximidade(sup, analise, raio = 1.2) {
  const pecas = analise.pecas.filter((p) => sup.pecas.includes(p.chave))
  const grupos = []

  for (const p of pecas) {
    const [cx, , cz] = p.bbox.centro
    const perto = grupos.find((g) =>
      Math.abs(g.cx - cx) <= raio && Math.abs(g.cz - cz) <= raio)
    if (perto) {
      perto.pecas.push(p)
      perto.cx = perto.pecas.reduce((s, q) => s + q.bbox.centro[0], 0) / perto.pecas.length
      perto.cz = perto.pecas.reduce((s, q) => s + q.bbox.centro[2], 0) / perto.pecas.length
    } else {
      grupos.push({ cx, cz, pecas: [p] })
    }
  }

  grupos.sort((a, b) => (a.cx - b.cx) || (a.cz - b.cz))
  return grupos.map((g, i) => ({
    id: novoId(),
    nome: `${sup.nome} ${i + 1}`,
    papel: sup.papel,
    podeCor: sup.podeCor, podeArte: sup.podeArte,
    pecas: [...new Set(g.pecas.map((p) => p.chave))],
    origem: sup.origem,
  }))
}

/** Junta várias superfícies numa só — assento + pés viram "banqueta". */
export function unir(sups, nome) {
  return {
    id: novoId(),
    nome: nome || sups.map((s) => s.nome).join(' + '),
    // o papel do maior manda: unir uma peça grande com um detalhe pequeno
    // não deve deixar o detalhe decidir o que a superfície é
    papel: [...sups].sort((a, b) => b.pecas.length - a.pecas.length)[0]?.papel || 'mobiliario',
    // se qualquer parte permitia, a união continua permitindo
    podeCor: sups.some((s) => s.podeCor),
    podeArte: sups.some((s) => s.podeArte),
    pecas: [...new Set(sups.flatMap((s) => s.pecas))],
    origem: sups.map((s) => s.origem).join(','),
  }
}

/** Índice peça → superfície, para o viewer resolver rápido durante a travessia. */
export function indicePorPeca(superficies) {
  const idx = new Map()
  for (const s of superficies) for (const c of s.pecas) idx.set(c, s)
  return idx
}

/** Resumo geométrico de uma superfície, para exibir na lista. */
export function medir(sup, analise) {
  const pecas = analise.pecas.filter((p) => sup.pecas.includes(p.chave))
  if (!pecas.length) return null
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  let tris = 0
  for (const p of pecas) {
    tris += p.tris
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p.bbox.min[k]); max[k] = Math.max(max[k], p.bbox.max[k])
    }
  }
  return {
    pecas: pecas.length, tris,
    largura: max[0] - min[0], altura: max[1] - min[1], profundidade: max[2] - min[2],
    centro: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
  }
}
