// ============================================================================
//  Complementos — o que o expositor ACRESCENTA ou TROCA DE LUGAR.
//
//  Cor e arte mudam o acabamento de uma superfície que já existe no projeto.
//  Isso não cobre duas coisas que a montadora vende de verdade:
//
//    · incluir uma peça que não está no projeto — um painel de LED na parede da
//      frente do depósito;
//    · levar uma peça para outro lugar — o depósito no centro, na ponta esquerda
//      ou na ponta direita.
//
//  As duas são a mesma pergunta: "neste ponto do estande, qual das opções?".
//  Cada opção é um .glb próprio, exportado do MESMO ponto de origem do projeto.
//  Assim a peça chega no lugar certo sozinha, sem ninguém posicionar nada na mão
//  e sem inventar transformação que o projetista não pediu.
//
//  Os grupos são independentes DE PROPÓSITO. Enumerar combinações — depósito à
//  esquerda com painel, depósito à esquerda sem painel, depósito à direita com
//  painel... — multiplica os arquivos a cada opção nova. Mantendo um grupo por
//  pergunta, cinco perguntas de três opções são quinze arquivos, não 243.
// ============================================================================

import * as THREE from 'three'

let seq = 0
const novoId = (p) => `${p}-${Date.now().toString(36)}-${seq++}`

/**
 * Um ponto de decisão do estande.
 *
 * `ancora` é a superfície a que a pergunta se refere. Serve só para organizar as
 * telas: no painel do expositor a pergunta aparece junto da parede de que ela
 * trata, em vez de numa lista solta que ele teria que relacionar sozinho.
 */
export function novoGrupo({ nome, ancora } = {}) {
  return {
    id: novoId('grp'),
    nome: nome || 'Nova opção',
    ancora: ancora || null,
    // O padrão é sempre "o projeto como está". Ter esta opção explícita é o que
    // deixa a escolha reversível: sem ela, o expositor que clicasse por engano
    // não teria como voltar ao estande original.
    rotuloPadrao: 'Como está no projeto',
    opcoes: [],
  }
}

export function novaOpcao({ nome, arquivo, bbox } = {}) {
  return {
    id: novoId('opc'),
    nome: nome || 'Opção',
    arquivo: arquivo || null,   // { caminho, url, bytes, nomeOriginal }
    bbox: bbox || null,         // medido no envio, para conferir o alinhamento
    // O que sai de cena quando esta opção entra. Sem isto, mover o depósito
    // deixaria os dois na cena — o do projeto e o da nova posição.
    esconde: [],
    // Ajuste manual, em metros. Só entra em uso quando o .glb veio recentrado.
    offset: [0, 0, 0],
    preco: { unidade: 'peca', valor: 0 },
  }
}

/* --------------------------- leitura do estado -------------------------- */

/** A opção ativa de cada grupo. Grupo sem escolha fica no padrão e não entra. */
export function opcoesAtivas(grupos, escolhas) {
  const out = []
  for (const g of grupos || []) {
    const id = escolhas?.[g.id]
    if (!id) continue
    const o = (g.opcoes || []).find((x) => x.id === id)
    if (o?.arquivo?.url) out.push({ ...o, grupoId: g.id, grupoNome: g.nome })
  }
  return out
}

/** Ids das superfícies do projeto-base que somem por causa do que foi escolhido. */
export function superficiesEscondidas(ativas) {
  return new Set((ativas || []).flatMap((o) => o.esconde || []))
}

/**
 * As mesmas superfícies, já resolvidas em chaves de peça.
 * O viewer percorre malhas, não superfícies, então a conversão tem que
 * acontecer uma vez aqui e não a cada quadro.
 */
export function chavesEscondidas(ativas, superficies) {
  const ids = superficiesEscondidas(ativas)
  if (!ids.size) return null
  const set = new Set()
  for (const s of superficies || []) {
    if (!ids.has(s.id)) continue
    for (const c of s.pecas) set.add(c)
  }
  return set
}

/** Descritores para o viewer carregar e posicionar as peças escolhidas. */
export function pecasParaCena(ativas) {
  return (ativas || []).map((o) => ({
    id: o.id,
    url: o.arquivo.url,
    offset: o.offset || [0, 0, 0],
  }))
}

/* ------------------------------- medição -------------------------------- */

/** Caixa envolvente de um objeto 3D, no mesmo formato usado pela análise. */
export function caixaDe(objeto) {
  const b = new THREE.Box3().setFromObject(objeto)
  if (b.isEmpty()) return null
  const min = b.min.toArray(), max = b.max.toArray()
  return {
    min, max,
    centro: [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2],
    largura: max[0] - min[0], altura: max[1] - min[1], profundidade: max[2] - min[2],
  }
}

/** Área da face que recebe impressão — as duas maiores dimensões. */
export function areaDaOpcao(bbox) {
  if (!bbox) return 0
  const d = [bbox.largura, bbox.altura, bbox.profundidade].sort((a, b) => b - a)
  return d[0] * d[1]
}

/**
 * A peça foi exportada do mesmo ponto de origem do projeto?
 *
 * Esta é a única exigência do fluxo, e é também a mais fácil de errar: a maioria
 * dos programas oferece "centralizar na origem" ao exportar uma seleção, e quem
 * exporta o painel sozinho aceita sem pensar. O arquivo abre perfeito, e a peça
 * aparece a quarenta metros do estande — ou dentro dele, deitada no chão.
 *
 * Conferir na hora do envio evita descobrir isso só quando o expositor abrir.
 */
export function conferirAlinhamento(bboxPeca, limites) {
  if (!bboxPeca || !limites) return { ok: true }

  const dentro = (v, a, b) => v >= a && v <= b
  const folgaX = (limites.x1 - limites.x0) * 0.35 + 1
  const folgaZ = (limites.z1 - limites.z0) * 0.35 + 1
  const [cx, , cz] = bboxPeca.centro

  if (dentro(cx, limites.x0 - folgaX, limites.x1 + folgaX)
   && dentro(cz, limites.z0 - folgaZ, limites.z1 + folgaZ)) {
    return { ok: true }
  }

  const centroEstande = [(limites.x0 + limites.x1) / 2, (limites.z0 + limites.z1) / 2]
  const naOrigem = Math.hypot(cx, cz) < 1.5
  const estandeLonge = Math.hypot(centroEstande[0], centroEstande[1]) > 3

  return {
    ok: false,
    naOrigem: naOrigem && estandeLonge,
    titulo: naOrigem && estandeLonge
      ? 'A peça foi exportada centralizada na origem'
      : 'A peça caiu fora da área do estande',
    detalhe: naOrigem && estandeLonge
      ? 'O programa recentrou a seleção ao exportar. Exporte de novo mantendo as coordenadas do projeto — ou use o ajuste abaixo para trazer a peça até aqui.'
      : 'O centro da peça está longe do estande. Confira se ela foi exportada do mesmo arquivo, ou ajuste a posição abaixo.',
    // leva o centro da peça até o centro do estande; ponto de partida do ajuste
    sugestao: [
      Math.round((centroEstande[0] - cx) * 100) / 100,
      0,
      Math.round((centroEstande[1] - cz) * 100) / 100,
    ],
  }
}

/* -------------------------------- resumo -------------------------------- */

/** Quantas perguntas o expositor vai ver, e quantas já têm arquivo. */
export function resumoGrupos(grupos) {
  const g = grupos || []
  const comArquivo = g.filter((x) => (x.opcoes || []).some((o) => o.arquivo?.url))
  return {
    grupos: g.length,
    prontos: comArquivo.length,
    opcoes: g.reduce((s, x) => s + (x.opcoes || []).filter((o) => o.arquivo?.url).length, 0),
  }
}
