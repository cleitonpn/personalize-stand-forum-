// ============================================================================
//  Objetos — a unidade de MOVIMENTO.
//
//  Superfície responde "o que recebe uma cor"; objeto responde "o que se move
//  junto". São perguntas diferentes e precisam de agrupamentos diferentes:
//
//    · o balcão é um objeto só (move junto), mas duas superfícies: a marcenaria
//      e o adesivo frontal, personalizados em separado
//    · as cadeiras compartilham material — uma superfície resolveria a cor,
//      mas cada cadeira tem que se mover sozinha
//
//  A detecção é por CONTATO, que é o critério fisicamente honesto: peças que se
//  encostam são a mesma coisa. Os pés encostam no assento; o adesivo encosta na
//  marcenaria; cadeiras vizinhas não se encostam.
// ============================================================================

import { PAPEIS } from './roles.js'

let seq = 0
const novoId = () => `obj-${Date.now().toString(36)}-${seq++}`

// Folga para considerar duas peças em contato. Precisa absorver a imprecisão
// de modelagem sem colar objetos que estão apenas próximos.
const FOLGA = 0.06

// Só estes papéis entram no grafo de contato.
//
// Isso não é um detalhe, é o que faz a detecção funcionar: o casco do estande
// não pode servir de cola. Com piso e paredes no grafo, a cadeira encosta no
// carpete, o carpete encosta na parede e a parede encosta na estrutura do teto
// — as 2.710 peças do arquivo de 45m² colapsam num objeto só.
//
// Piso, parede, vidro, metal e luz são o casco: ficam de fora e não se movem.
const PAPEIS_MOVEIS = ['mobiliario', 'adesivo', 'madeira']

const encostam = (a, b, folga = FOLGA) =>
  a.bbox.min[0] - folga <= b.bbox.max[0] && a.bbox.max[0] + folga >= b.bbox.min[0] &&
  a.bbox.min[1] - folga <= b.bbox.max[1] && a.bbox.max[1] + folga >= b.bbox.min[1] &&
  a.bbox.min[2] - folga <= b.bbox.max[2] && a.bbox.max[2] + folga >= b.bbox.min[2]

/**
 * Agrupa peças em objetos por contato.
 * Usa uma grade espacial para não comparar todas as peças com todas — no
 * arquivo de 45m² são 2.710 peças, e o par a par seria desperdício.
 */
export function detectarObjetos(analise, papeis, { folga = FOLGA } = {}) {
  const elegiveis = analise.pecas.filter((p) => {
    const papel = papeis[p.materialNome]
    return PAPEIS_MOVEIS.includes(papel) && p.tris > 0 && isFinite(p.bbox.centro[0])
  })
  if (!elegiveis.length) return []

  // grade indexada pelo canto mínimo de cada peça
  const CEL = 1.0
  const grade = new Map()
  const chaveCel = (i, j, k) => `${i},${j},${k}`
  const celulasDe = (p) => {
    const out = []
    for (let i = Math.floor((p.bbox.min[0] - folga) / CEL); i <= Math.floor((p.bbox.max[0] + folga) / CEL); i++)
      for (let j = Math.floor((p.bbox.min[1] - folga) / CEL); j <= Math.floor((p.bbox.max[1] + folga) / CEL); j++)
        for (let k = Math.floor((p.bbox.min[2] - folga) / CEL); k <= Math.floor((p.bbox.max[2] + folga) / CEL); k++)
          out.push(chaveCel(i, j, k))
    return out
  }

  elegiveis.forEach((p, idx) => {
    p._i = idx
    for (const c of celulasDe(p)) {
      if (!grade.has(c)) grade.set(c, [])
      grade.get(c).push(idx)
    }
  })

  // componentes conexos por contato
  const visto = new Uint8Array(elegiveis.length)
  const grupos = []
  for (let s = 0; s < elegiveis.length; s++) {
    if (visto[s]) continue
    const fila = [s]; visto[s] = 1
    const membros = []
    while (fila.length) {
      const i = fila.pop()
      const a = elegiveis[i]
      membros.push(a)
      const candidatos = new Set()
      for (const c of celulasDe(a)) for (const j of (grade.get(c) || [])) candidatos.add(j)
      for (const j of candidatos) {
        if (visto[j]) continue
        if (encostam(a, elegiveis[j], folga)) { visto[j] = 1; fila.push(j) }
      }
    }
    grupos.push(membros)
  }

  return grupos
    .map((membros) => montarObjeto(membros, papeis))
    .sort((a, b) => (a.centro[0] - b.centro[0]) || (a.centro[2] - b.centro[2]))
}

function montarObjeto(membros, papeis) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  let tris = 0
  const porMaterial = new Map()

  for (const p of membros) {
    tris += p.tris
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], p.bbox.min[k]); max[k] = Math.max(max[k], p.bbox.max[k])
    }
    if (!porMaterial.has(p.materialNome)) porMaterial.set(p.materialNome, [])
    porMaterial.get(p.materialNome).push(p.chave)
  }

  // o papel dominante (por número de peças) define o tipo do objeto
  const contagem = {}
  for (const p of membros) {
    const papel = papeis[p.materialNome] || 'mobiliario'
    contagem[papel] = (contagem[papel] || 0) + 1
  }
  const dominante = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0][0]

  const largura = max[0] - min[0], altura = max[1] - min[1], profundidade = max[2] - min[2]

  // Só é móvel o que assenta no chão. Painéis gráficos também são "madeira",
  // mas ficam presos na parede, lá em cima — e não devem sair do lugar.
  const assentaNoChao = min[1] < 0.35

  return {
    id: novoId(),
    nome: nomear(dominante, porMaterial, largura, altura),
    tipo: dominante,
    pecas: membros.map((p) => p.chave),
    // superfícies internas: um objeto, vários acabamentos independentes
    materiais: [...porMaterial.keys()],
    podeMover: assentaNoChao,
    podeGirar: assentaNoChao,
    // O mobiliário que já vem no projeto está incluso no valor do estande.
    // Só entra no orçamento o que o expositor ACRESCENTAR — e isso passa a
    // existir quando a biblioteca de mobiliário da fase 2 ficar pronta.
    // O admin pode desmarcar para cobrar um item específico à parte.
    incluso: true,
    transform: { dx: 0, dz: 0, rotY: 0 },
    centro: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    apoio: [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2],
    largura, altura, profundidade, tris,
    pecasTotal: membros.length,
  }
}

function nomear(papel, porMaterial, largura, altura) {
  const mats = [...porMaterial.keys()]
  const achar = (re) => mats.find((m) => re.test(m))

  if (achar(/balc[ãa]o|goldmax|adesivo/i) && altura < 1.6) return 'Balcão'
  if (achar(/tiffany|eames/i)) return altura > 0.95 ? 'Banqueta' : 'Cadeira'
  if (papel === 'vidro') return 'Vidro'
  if (papel === 'piso') return 'Piso'
  if (papel === 'bagum' || papel === 'lona') return largura > 2.4 ? 'Painel de parede' : 'Painel'
  if (papel === 'luz') return 'Luminária'
  if (papel === 'madeira') return 'Marcenaria'
  return PAPEIS[papel]?.rotulo || 'Objeto'
}

/** Numera objetos de mesmo nome: Cadeira 1, Cadeira 2… */
export function numerar(objetos) {
  const cont = {}
  return objetos.map((o) => {
    cont[o.nome] = (cont[o.nome] || 0) + 1
    return { ...o, nome: o.nome, indice: cont[o.nome] }
  }).map((o) => {
    const total = objetos.filter((x) => x.nome === o.nome).length
    return total > 1 ? { ...o, nome: `${o.nome} ${o.indice}` } : o
  })
}

/** Índice peça → objeto, para o viewer resolver na travessia. */
export function indiceObjetoPorPeca(objetos) {
  const idx = new Map()
  for (const o of objetos) for (const c of o.pecas) idx.set(c, o)
  return idx
}
