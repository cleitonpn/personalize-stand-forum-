// ============================================================================
//  Papéis de superfície.
//  O admin atribui um papel a cada MATERIAL do arquivo .glb — e isso classifica
//  todas as peças que usam aquele material de uma vez. Nos dois projetos reais
//  da Eletrolar são ~18-21 materiais para 17-33 mil nós, então mapear material
//  é ordens de magnitude mais barato (e mais confiável) que marcar peça a peça.
// ============================================================================

export const PAPEIS = {
  lona: {
    rotulo: 'Lona impressa',
    cor: 'var(--role-lona)',
    hex: '#f59e0b',
    personalizavel: true,
    desc: 'Recebe arte/imagem enviada pelo expositor.',
  },
  bagum: {
    rotulo: 'Bagum',
    cor: 'var(--role-bagum)',
    hex: '#a855f7',
    personalizavel: true,
    desc: 'Revestimento têxtil — o expositor troca a cor.',
  },
  piso: {
    rotulo: 'Piso / carpete',
    cor: 'var(--role-piso)',
    hex: '#14b8a6',
    personalizavel: true,
    desc: 'Carpete ou vinílico — troca de cor pelo catálogo.',
  },
  adesivo: {
    rotulo: 'Adesivo / logo',
    cor: 'var(--role-lona)',
    hex: '#fb923c',
    personalizavel: true,
    desc: 'Aplicação de marca — pode ser trocada ou removida.',
  },
  madeira: {
    rotulo: 'Madeira',
    cor: 'var(--role-madeira)',
    hex: '#c2833f',
    personalizavel: true,
    desc: 'Padrão amadeirado — troca pelo catálogo de napas.',
  },
  vidro: {
    rotulo: 'Vidro',
    cor: 'var(--role-vidro)',
    hex: '#38bdf8',
    personalizavel: false,
    desc: 'Superfície transparente — estrutural.',
  },
  metal: {
    rotulo: 'Metal / estrutura',
    cor: 'var(--role-metal)',
    hex: '#94a3b8',
    personalizavel: false,
    desc: 'Perfis, travessas e ferragens.',
  },
  mobiliario: {
    rotulo: 'Mobiliário',
    cor: 'var(--role-mob)',
    hex: '#64748b',
    personalizavel: false,
    desc: 'Cadeiras, mesas, balcões — itens soltos.',
  },
  luz: {
    rotulo: 'Iluminação',
    cor: 'var(--role-luz)',
    hex: '#fde047',
    personalizavel: false,
    desc: 'Spots, trilhos e luminárias.',
  },
  ignorar: {
    rotulo: 'Ignorar',
    cor: 'var(--text-dim)',
    hex: '#64708c',
    personalizavel: false,
    desc: 'Fora do estande: céu do render, pranchas 2D, cópias espelhadas.',
  },
}

export const LISTA_PAPEIS = Object.entries(PAPEIS).map(([id, p]) => ({ id, ...p }))

// Palavras-chave observadas nos arquivos reais da Eletrolar. A ordem importa:
// a primeira regra que casar vence, então o que é mais específico vem antes.
//
// Duas armadilhas que só apareceram rodando contra os arquivos de verdade:
//  · "Aluminum" contém "lumin" — a regra de iluminação não pode ser solta,
//    senão todo alumínio vira luminária.
//  · "eames wood1" é a cadeira Eames, não madeira avulsa. Nomes de mobiliário
//    precisam ser testados ANTES dos nomes de material.
const REGRAS_NOME = [
  [/bagum/i,                            'bagum'],
  [/lona|banner|impress/i,              'lona'],
  [/adesivo|sticker|goldmax|\blogo\b/i, 'adesivo'],
  [/tapete|carpete|carpet|\bpiso\b|floor/i, 'piso'],
  [/vidro|glass|translucent/i,          'vidro'],
  // mobiliário antes de madeira/metal — "eames wood" é cadeira, não tábua
  [/tiffany|eames|cadeira|banqueta|sof[áa]|poltrona|\bmesa\b|balc[ãa]o/i, 'mobiliario'],
  // iluminação com fronteira: nunca casar dentro de "Aluminum"
  [/\b(spot|light|led|luz|lumin[áa]ria|arandela|trilho)\b/i, 'luz'],
  [/metal|alum[íi]?n?i?um|a[çc]o\b|steel|inox|cromad|stainless/i, 'metal'],
  [/madeira|wood|mdf|compensad/i,       'madeira'],
  [/parede|wall/i,                      'bagum'],
]

/**
 * Sugere um papel para um material, combinando o nome com a geometria.
 * O nome é o sinal forte; a geometria só entra quando o nome não diz nada.
 */
export function sugerirPapel(mat) {
  const nome = mat.nome || ''

  for (const [re, papel] of REGRAS_NOME) {
    if (re.test(nome)) return { papel, motivo: `nome do material casa com "${re.source.split('|')[0]}"` }
  }

  const { largura, altura, profundidade } = mat.bbox
  const espessura = Math.min(largura, profundidade)

  // Caixa de céu do Enscape / pranchas 2D: ocupam muito mais que um estande.
  if (largura > 40 || profundidade > 40) {
    return { papel: 'ignorar', motivo: 'extensão muito maior que um estande — provável céu do render ou prancha 2D' }
  }
  // Plano fino deitado no chão.
  if (altura < 0.15 && largura > 1.5 && profundidade > 1.5 && mat.bbox.min[1] < 0.3) {
    return { papel: 'piso', motivo: 'plano fino no nível do chão' }
  }
  // Plano fino deitado lá no alto: teto, treliça ou rack de iluminação.
  if (altura < 0.45 && largura > 1.5 && profundidade > 1.5 && mat.bbox.min[1] > 2.4) {
    return { papel: 'metal', motivo: 'plano horizontal acima de 2,4 m — estrutura de teto' }
  }
  // Painel em pé e fino: é parede.
  if (altura > 1.2 && espessura < 0.4) {
    return { papel: 'bagum', motivo: 'painel vertical fino — geometria de parede' }
  }
  return { papel: 'mobiliario', motivo: 'sem pista no nome — classificado como volume solto' }
}
