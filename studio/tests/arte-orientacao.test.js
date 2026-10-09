import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { uvDoElemento } from '../src/lib/glb/arte.js'

function parede(posicao, rotacao = 0, escalaX = 1, tamanho = [3, 3, .02]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...tamanho))
  m.position.fromArray(posicao); m.rotation.y = rotacao; m.scale.x = escalaX
  m.updateMatrixWorld()
  return m
}
function leitura(m, plano, direita) {
  const pontos = Array.from({ length: plano.attr.count }, (_, i) => {
    const p = new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position, i).applyMatrix4(m.userData._matrizArteBase || m.matrixWorld)
    return { horizontal: p.dot(direita), u: plano.attr.getX(i), y: p.y, v: plano.attr.getY(i) }
  })
  const esquerda = pontos.reduce((a, b) => a.horizontal < b.horizontal ? a : b)
  const direitaPonto = pontos.reduce((a, b) => a.horizontal > b.horizontal ? a : b)
  assert.ok(direitaPonto.u > esquerda.u, 'a arte deve crescer da esquerda para a direita de quem está dentro')
  const baixo = pontos.reduce((a, b) => a.y < b.y ? a : b)
  const alto = pontos.reduce((a, b) => a.y > b.y ? a : b)
  assert.ok(alto.v < baixo.v, 'o topo da arte deve continuar para cima')
}
const centro = new THREE.Vector3(0, 1.5, 0)
test('parede do fundo permanece legível por dentro com eixos invertidos no GLB', () => {
  for (const giro of [0, Math.PI]) for (const escala of [1, -1]) {
    const m = parede([0, 1.5, -4], giro, escala)
    leitura(m, uvDoElemento([m], centro).get(m), new THREE.Vector3(1, 0, 0))
  }
})
test('paredes laterais usam o lado interno sem inverter o topo', () => {
  for (const x of [-4, 4]) {
    const m = parede([x, 1.5, 0], 0, 1, [.02, 3, 4])
    leitura(m, uvDoElemento([m], centro).get(m), new THREE.Vector3(0, 0, Math.sign(x)))
  }
})
test('testeira da frente conserva a leitura por fora do estande', () => {
  for (const giro of [0, Math.PI]) {
    const m = parede([0, 3.5, 4], giro, 1, [3, 1, .02])
    leitura(m, uvDoElemento([m], centro).get(m), new THREE.Vector3(1, 0, 0))
  }
})
test('imagem mantém continuidade entre painéis mesmo com o primeiro exportado ao contrário', () => {
  const ms = [-3, 0, 3].map((x, i) => parede([x, 1.5, -4], i === 0 ? Math.PI : 0))
  const planos = uvDoElemento(ms, centro)
  const faixas = ms.map(m => {
    const u = Array.from(planos.get(m).attr.array).filter((_, i) => i % 2 === 0)
    return [Math.min(...u), Math.max(...u)]
  })
  assert.ok(Math.abs(faixas[0][0]) < 1e-6)
  assert.ok(Math.abs(faixas[0][1] - faixas[1][0]) < 1e-6)
  assert.ok(Math.abs(faixas[1][1] - faixas[2][0]) < 1e-6)
  assert.ok(Math.abs(faixas[2][1] - 1) < 1e-6)
})
