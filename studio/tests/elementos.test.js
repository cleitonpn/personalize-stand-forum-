import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { analisar } from '../src/lib/glb/analyze.js'
import { superficiesPadrao } from '../src/lib/glb/superficies.js'
import { organizarElementos, listarElementos, limitarTransformacao } from '../src/lib/glb/elementos.js'
import { detectarObjetos, preservarAjustes } from '../src/lib/glb/objetos.js'
import { calcularOrcamento, tipoDoObjeto } from '../src/lib/glb/precos.js'
import { uvDoElemento } from '../src/lib/glb/arte.js'

function cenaDe(paineis) {
  const cena = new THREE.Scene()
  for (const { pos, tamanho = [2, 3, .08], material = 'Bagum', rot = 0 } of paineis) {
    const mat = new THREE.MeshStandardMaterial(); mat.name = material
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...tamanho), mat)
    mesh.position.set(...pos); mesh.rotation.y = rot; cena.add(mesh)
  }
  const analise = analisar(cena)
  const papeis = Object.fromEntries(analise.materiais.map(m => [m.nome, m.papelSugerido]))
  return { cena, analise, sups: superficiesPadrao(analise, papeis) }
}
test('paredes afastadas com o mesmo material viram elementos distintos', () => {
  const { analise, sups } = cenaDe([{ pos: [-3, 1.5, 0] }, { pos: [3, 1.5, 0] }])
  const resultado = organizarElementos(analise, sups)
  assert.equal(resultado.length, 2)
  assert.notEqual(resultado[0].elementoId, resultado[1].elementoId)
  assert.equal(resultado[0].id, sups[0].id)
})
test('painéis adjacentes permanecem independentes, preservando regras de acabamento', () => {
  const { analise, sups } = cenaDe([{ pos: [-1, 1.5, 0] }, { pos: [1, 1.5, 0], material: 'Madeira' }])
  const resultado = organizarElementos(analise, sups)
  assert.equal(resultado.length, 2)
  assert.notEqual(resultado[0].elementoId, resultado[1].elementoId)
  assert.deepEqual(new Set(resultado.map(s => s.papel)), new Set(['bagum', 'madeira']))
  assert.equal(listarElementos(resultado, [], analise).length, 2)
})
test('uma quina não une paredes perpendiculares', () => {
  const { analise, sups } = cenaDe([{ pos: [-1, 1.5, 0] }, { pos: [0, 1.5, 1], rot: Math.PI / 2 }])
  const resultado = organizarElementos(analise, sups)
  assert.equal(new Set(resultado.map(s => s.elementoId)).size, 2)
})
test('parede diagonal é reconhecida pela normal em mundo', () => {
  const { analise, sups } = cenaDe([{ pos: [0, 1.5, 0], material: 'Madeira', rot: Math.PI / 4 }])
  assert.equal(organizarElementos(analise, sups)[0].tipoElemento, 'parede')
})
test('decisões manuais e vínculos de adicionais não são separados nem mutados', () => {
  const { analise, sups } = cenaDe([{ pos: [-3, 1.5, 0] }, { pos: [3, 1.5, 0] }])
  for (const campo of ['nomeManual', 'permsManuais', 'agrupada', 'revisado']) {
    const original = [{ ...sups[0], [campo]: true, nome: 'Parede aprovada', podeArte: false }]
    const antes = JSON.stringify(original)
    const resultado = organizarElementos(analise, original)
    assert.equal(resultado.length, 1); assert.equal(resultado[0].id, original[0].id)
    assert.equal(resultado[0].podeArte, false); assert.equal(JSON.stringify(original), antes)
  }
  const resultado = organizarElementos(analise, sups, [], [{ ancora: sups[0].id }])
  assert.deepEqual(resultado[0].pecas, sups[0].pecas)
})
test('superfície antiga compartilhada por cadeiras mantém controles separados', () => {
  const { analise, sups } = cenaDe([{ pos: [-2, .5, 0], material: 'Cadeira', tamanho: [.5, 1, .5] }, { pos: [2, .5, 0], material: 'Cadeira', tamanho: [.5, 1, .5] }])
  const objetos = analise.pecas.map((p, i) => ({ id: `o${i}`, nome: `Cadeira ${i}`, pecas: [p.chave], centro: p.bbox.centro, podeMover: true }))
  const resultado = listarElementos(sups, objetos, analise)
  assert.equal(resultado.filter(e => e.objetos.length === 1).length, 2)
  assert.equal(resultado.some(e => e.objetos.length > 1), false)
})
test('recorte exclui elementos fora da área', () => {
  const { analise, sups } = cenaDe([{ pos: [-3, 1.5, 0] }, { pos: [3, 1.5, 0] }])
  assert.equal(listarElementos(organizarElementos(analise, sups), [], analise, { x0: -4, x1: 0, z0: -1, z1: 1 }).length, 1)
})
test('movimento e giro respeitam permissões independentes', () => {
  const obj = { apoio: [0, 0, 0], largura: 2, profundidade: 1, podeMover: false, podeGirar: true }
  assert.deepEqual(limitarTransformacao(obj, { dx: 10, rotY: Math.PI / 2 }), { dx: 0, dz: 0, rotY: Math.PI / 2 })
  assert.deepEqual(limitarTransformacao({ ...obj, podeMover: true, podeGirar: false }, { dx: 1, rotY: 1 }), { dx: 1, dz: 0, rotY: 0 })
})
test('limite considera a pegada girada; giro sem movimento é rejeitado quando excede a área', () => {
  const limites = { x0: -2, x1: 2, z0: -2, z1: 2 }
  const obj = { apoio: [0, 0, 0], largura: 3, profundidade: 1, podeMover: true, podeGirar: true }
  const t = limitarTransformacao(obj, { dx: 10, dz: 10, rotY: Math.PI / 2 }, limites)
  assert.ok(Math.abs(t.dx - 1.5) < 1e-6); assert.ok(Math.abs(t.dz - .5) < 1e-6)
  const fixo = { ...obj, podeMover: false, transform: { dx: 0, dz: 1, rotY: 0 } }
  assert.equal(limitarTransformacao(fixo, { rotY: Math.PI / 2 }, limites).rotY, 0)
})
test('preservar ajustes produz dados serializáveis e mantém tipo de preço ao renomear', () => {
  const anterior = { id: 'a', pecas: ['p'], nome: 'Cadeira', podeMover: true, podeGirar: true, incluso: true, transform: { dx: 0, dz: 0, rotY: 0 } }
  const [novo] = preservarAjustes([{ ...anterior, id: 'b' }], [anterior])
  assert.equal(Object.values(novo).includes(undefined), false)
  assert.equal(tipoDoObjeto({ ...novo, nome: 'Cadeira VIP' }), 'Cadeira')
})
test('arte única percorre a parede inteira, sem se repetir em cada painel', () => {
  const { cena } = cenaDe([{ pos: [-1, 1.5, 0] }, { pos: [1, 1.5, 0] }])
  const uvs = uvDoElemento(cena.children)
  const faixa = mesh => { const a = uvs.get(mesh).attr; const us = Array.from({ length: a.count }, (_, i) => a.getX(i)); return [Math.min(...us), Math.max(...us)] }
  assert.deepEqual(faixa(cena.children[0]), [0, .5])
  assert.deepEqual(faixa(cena.children[1]), [.5, 1])
  assert.ok(Math.abs(uvs.get(cena.children[0]).proporcao - 4 / 3) < 1e-6)
})


test('perfis fixos compartilham uma revisão sem afetar paredes separadas', () => {
  const { analise, sups } = cenaDe([
    { pos: [-3, 1.5, 0], material: 'METAL PRETO' },
    { pos: [3, 1.5, 0], material: 'METAL PRETO' },
  ])
  const fixas = sups.map(s => ({ ...s, papel: 'metal' }))
  const resultado = organizarElementos(analise, fixas)
  assert.equal(resultado.length, 1)
  assert.equal(resultado[0].pecas.length, 2)
  assert.equal(resultado[0].tipoElemento, 'estrutura')
  assert.equal(resultado[0].id, sups[0].id)
})


test('bordas estreitas anônimas são perfis, não paredes personalizáveis', () => {
  const { analise } = cenaDe([{ pos: [0, 1.4, 0], tamanho: [.02, 2.8, .028], material: '_BORDA2' }])
  assert.equal(analise.materiais[0].papelSugerido, 'metal')
})


test('camadas de uma testeira acompanham seu acabamento sem virar móveis', () => {
  const { analise, sups } = cenaDe([
    { pos: [0, 3.5, 0], tamanho: [3, 1, .03] },
    { pos: [0, 3.5, .025], tamanho: [2, .9, .015], material: 'M08_Obsidian_Black' },
  ])
  const papeis = { Bagum: 'bagum', M08_Obsidian_Black: 'mobiliario' }
  const base = sups.map(s => s.origem === 'M08_Obsidian_Black' ? { ...s, papel: 'mobiliario', podeCor: false, podeArte: false } : s)
  const objetos = detectarObjetos(analise, papeis, { superficies: base })
  assert.equal(objetos.length, 0)
  const resultado = organizarElementos(analise, base, objetos)
  const elementos = listarElementos(resultado, objetos, analise)
  assert.equal(elementos.length, 1)
  assert.match(elementos[0].nome, /^Testeira/)
  assert.ok(resultado.every(s => s.podeCor && s.podeArte))
  assert.equal(resultado[1].papel, 'mobiliario')
  const acabamentos = Object.fromEntries(resultado.map(s => [s.id, { cor: '#0000ff' }]))
  const orcamento = calcularOrcamento({ analise, superficies: resultado, objetos, acabamentos, precos: { bagum: { unidade: 'm2', valor: 30 } } })
  assert.equal(orcamento.itens.length, 1)
  assert.ok(Math.abs(orcamento.total - 90) < .001)
})
