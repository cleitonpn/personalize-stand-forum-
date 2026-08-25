// ============================================================================
//  Nomes que o expositor entende.
//
//  O arquivo do projetista chama as coisas de "VS_bagum-preto3" e
//  "A08_Garnet_Shadow". Isso serve para o admin mapear, mas é ruído para quem
//  nunca abriu um software 3D — e o expositor é exatamente esse público.
//
//  Então derivamos o nome da POSIÇÃO da superfície dentro do estande, que é
//  como uma pessoa descreve o espaço: "a parede do fundo", "o piso", "a
//  coluna da direita".
// ============================================================================

import { PAPEIS } from './roles.js'

/** Parece nome de material de CAD? Então não mostramos ao expositor. */
function pareceTecnico(nome) {
  return !nome
    || /^[A-Z]\d{2}_/.test(nome)              // A08_Garnet_Shadow
    || /^\[/.test(nome)                        // [Color M00]1
    || /_/.test(nome)                          // VS_bagum-preto3
    || /\d$/.test(nome)                        // Madeira 16
    || /sem t[íi]tulo/i.test(nome)
}

/**
 * Nome amigável de uma superfície.
 * Se o admin renomeou, respeita — ele conhece o projeto melhor que a heurística.
 */
export function nomeAmigavel(sup, analise, recorte) {
  if (!pareceTecnico(sup.nome)) return sup.nome

  const pecas = analise.pecas.filter((p) => sup.pecas.includes(p.chave))
  if (!pecas.length) return PAPEIS[sup.papel]?.rotulo || 'Superfície'

  // caixa do estande, para saber onde a superfície fica dentro dele
  const lim = limitesDoEstande(analise, recorte)
  const c = centroDe(pecas)

  const papel = sup.papel
  if (papel === 'piso') return 'Piso do estande'

  const alturaMin = Math.min(...pecas.map((p) => p.bbox.min[1]))
  if (papel === 'adesivo' && alturaMin < 1.4) return 'Adesivo do balcão'

  const base = papel === 'lona' ? 'Lona' : papel === 'adesivo' ? 'Adesivo' : 'Parede'

  // Só dá para dizer "da direita" se a superfície ESTIVER à direita. Enquanto o
  // material cobre paredes espalhadas pelo estande inteiro, o centro de massa
  // cai no meio e o nome sairia errado — e errado igual para várias superfícies.
  // Nesse caso assumimos o plural, que é verdadeiro.
  if (espalhada(pecas, lim)) return base === 'Parede' ? 'Paredes do estande' : `${base}s do estande`

  const lugar = posicaoRelativa(c, lim)
  return lugar ? `${base} ${lugar}` : (PAPEIS[papel]?.rotulo || 'Superfície')
}

/** As peças ocupam boa parte do estande, em vez de um canto dele? */
function espalhada(pecas, lim) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (const p of pecas) {
    x0 = Math.min(x0, p.bbox.min[0]); x1 = Math.max(x1, p.bbox.max[0])
    z0 = Math.min(z0, p.bbox.min[2]); z1 = Math.max(z1, p.bbox.max[2])
  }
  const fx = (x1 - x0) / Math.max(lim.x1 - lim.x0, 0.001)
  const fz = (z1 - z0) / Math.max(lim.z1 - lim.z0, 0.001)
  return fx > 0.55 && fz > 0.55
}

function centroDe(pecas) {
  let x = 0, z = 0
  for (const p of pecas) { x += p.bbox.centro[0]; z += p.bbox.centro[2] }
  return [x / pecas.length, z / pecas.length]
}

export function limitesDoEstande(analise, recorte) {
  if (recorte) {
    return {
      x0: Math.min(recorte.x0, recorte.x1), x1: Math.max(recorte.x0, recorte.x1),
      z0: Math.min(recorte.z0, recorte.z1), z1: Math.max(recorte.z0, recorte.z1),
    }
  }
  const c = analise.resumo.cena
  return { x0: c.min[0], x1: c.max[0], z0: c.min[2], z1: c.max[2] }
}

/**
 * Traduz a posição em linguagem de quem anda pelo estande.
 * Os terços evitam chamar de "esquerda" algo que está praticamente no meio.
 */
function posicaoRelativa([cx, cz], lim) {
  const fx = (cx - lim.x0) / Math.max(lim.x1 - lim.x0, 0.001)
  const fz = (cz - lim.z0) / Math.max(lim.z1 - lim.z0, 0.001)

  if (fz < 0.28) return 'do fundo'
  if (fz > 0.72) return 'da frente'
  if (fx < 0.28) return 'da esquerda'
  if (fx > 0.72) return 'da direita'
  return 'central'
}

/**
 * Agrupa as superfícies por assunto, para o expositor não ver uma lista crua.
 *
 * `complementos` entra na conta porque uma parede pode não aceitar cor nem arte
 * e ainda assim ter uma escolha: a da frente do depósito, que só recebe o painel
 * de LED. Sem isto ela ficaria de fora e a opção não teria onde aparecer.
 */
export function agruparParaExpositor(superficies, analise, recorte, complementos) {
  const comOpcao = new Set((complementos || []).map((g) => g.ancora).filter(Boolean))
  const grupos = [
    { id: 'piso', rotulo: 'Piso', icone: '▦', itens: [] },
    { id: 'paredes', rotulo: 'Paredes', icone: '▚', itens: [] },
    { id: 'marca', rotulo: 'Sua marca', icone: '🖼', itens: [] },
    { id: 'outros', rotulo: 'Outros acabamentos', icone: '✦', itens: [] },
  ]
  const achar = (id) => grupos.find((g) => g.id === id)

  for (const s of superficies) {
    if (!s.podeCor && !s.podeArte && !comOpcao.has(s.id)) continue
    const item = { ...s, rotulo: nomeAmigavel(s, analise, recorte) }
    if (s.papel === 'piso') achar('piso').itens.push(item)
    else if (s.papel === 'lona' || s.papel === 'adesivo') achar('marca').itens.push(item)
    else if (s.papel === 'bagum') achar('paredes').itens.push(item)
    else achar('outros').itens.push(item)
  }

  return grupos.filter((g) => g.itens.length)
}
