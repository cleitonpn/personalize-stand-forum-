import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { adicionarMovel, ajustarMovel, registroComplemento } from '../src/lib/glb/mobiliario.js'
import { opcoesAtivas, pecasParaCena, chavesEscondidas, superficiesEscondidas } from '../src/lib/glb/complementos.js'
import { calcularOrcamento } from '../src/lib/glb/precos.js'

const opcao = { id: 'mesa', nome: 'Mesa com cadeiras', arquivo: { url: 'mesa.glb', nomeOriginal: 'mesa.glb' }, limite: 3,
  bbox: { centro: [8, 1, -3], min: [7, 0, -3.5], largura: 2, altura: 2, profundidade: 1 },
  offset: [-7, 0, 4], preco: { unidade: 'peca', valor: 120 }, esconde: ['bistro', 'banquetas'] }
const grupo = { id: 'catalogo', nome: 'Mesas', tipo: 'mobiliario', opcoes: [opcao] }
const superficies = [{ id: 'bistro', pecas: ['tampo', 'pes'] }, { id: 'banquetas', pecas: ['assento', 'pernas'] }]
const ativas = e => opcoesAtivas([grupo], { catalogo: e })

test('várias unidades têm identidades e posições próprias; preço soma todas', () => {
  let e = adicionarMovel(grupo, null, opcao)
  e = adicionarMovel(grupo, e, opcao)
  const a = ativas(e), cenas = pecasParaCena(a)
  assert.equal(cenas.length, 2)
  assert.notEqual(cenas[0].id, cenas[1].id)
  assert.notDeepEqual(cenas[0].offset, cenas[1].offset)
  assert.equal(chavesEscondidas(a, superficies), null)
  const orc = calcularOrcamento({ analise: { pecas: [] }, complementos: { ativas: a } })
  assert.equal(orc.total, 240)
  assert.equal(orc.itens.length, 2)
})

test('substituição esconde o conjunto inteiro; remover a última substituição restaura o original', () => {
  let e = adicionarMovel(grupo, null, opcao, true)
  e = adicionarMovel(grupo, e, opcao, false)
  assert.deepEqual([...chavesEscondidas(ativas(e), superficies)], ['tampo', 'pes', 'assento', 'pernas'])
  const semSubstituicao = { itens: e.itens.filter(i => !i.substituir) }
  assert.equal(ativas(semSubstituicao).length, 1)
  assert.equal(chavesEscondidas(ativas(semSubstituicao), superficies), null)
  assert.equal(ativas(null).length, 0)
})

test('limites de quantidade valem na inclusão e na leitura de um rascunho', () => {
  let e = null
  for (let n = 0; n < 10; n++) e = adicionarMovel(grupo, e, opcao)
  assert.equal(e.itens.length, 3)
  assert.equal(ativas({ itens: Array.from({ length: 40 }, (_, n) => ({ id: String(n), opcaoId: opcao.id })) }).length, 3)
  assert.equal(ativas({ itens: [e.itens[0], e.itens[0], { id: 'invalido', opcaoId: 'apagada' }] }).length, 1)
})

test('posição e rotação sobrevivem ao salvamento sem alterar a escala ou mover outra instância', () => {
  let e = adicionarMovel(grupo, null, opcao, true)
  e = adicionarMovel(grupo, e, opcao)
  const segunda = structuredClone(e.itens[1])
  e.itens[0] = ajustarMovel(opcao, e.itens[0], { offset: [-5, 0, 3], rotY: Math.PI / 2 })
  const a = ativas(JSON.parse(JSON.stringify(e)))
  assert.deepEqual(e.itens[1], segunda)
  const p = pecasParaCena(a)[0]
  assert.deepEqual(p.pivo, opcao.bbox.centro)
  const centro = new THREE.Vector3(...p.pivo).sub(new THREE.Vector3(...p.pivo)).applyAxisAngle(new THREE.Vector3(0, 1, 0), p.rotY).add(new THREE.Vector3(...p.pivo)).add(new THREE.Vector3(...p.offset))
  assert.deepEqual(centro.toArray(), [3, 1, 0])
  assert.equal(p.scale, undefined)
  assert.deepEqual(registroComplemento(a[0]).substitui, opcao.esconde)
  assert.equal(registroComplemento(a[0]).rotY, Math.PI / 2)
})

test('movimento considera largura e profundidade depois de girar', () => {
  const limites = { x0: 0, x1: 6, z0: 0, z1: 4 }
  const i = ajustarMovel(opcao, {}, { offset: [100, 0, 100], rotY: Math.PI / 2 }, limites)
  assert.equal(opcao.bbox.centro[0] + i.offset[0], 5.5)
  assert.equal(opcao.bbox.centro[2] + i.offset[2], 3)
})

test('adicionais antigos e mobiliário coexistem; acabamento do móvel substituído não é cobrado', () => {
  const e = adicionarMovel(grupo, null, opcao, true)
  const a = opcoesAtivas([grupo, { id: 'led', opcoes: [{ ...opcao, id: 'painel', esconde: [] }] }], { catalogo: e, led: 'painel' })
  assert.equal(a.length, 2)
  const orc = calcularOrcamento({ analise: { pecas: [] }, superficies: superficies.map(s => ({ ...s, papel: 'madeira' })),
    acabamentos: { bistro: { cor: '#fff' } }, precos: { madeira: { unidade: 'peca', valor: 30 } },
    complementos: { ativas: a, escondidas: superficiesEscondidas(a) } })
  assert.equal(orc.total, 240)
})
