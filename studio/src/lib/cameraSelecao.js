import * as THREE from 'three'

// A seleção usa a mesma frente (+Z) do botão “De frente”. O tamanho da
// peça orienta o alvo, mas o estande determina a distância para manter contexto.
export function enquadrarSelecao(caixaEstande, caixaItem, fov, aspect) {
  if (caixaEstande.isEmpty() || caixaItem.isEmpty()) return null
  const centro = caixaEstande.getCenter(new THREE.Vector3())
  const tamanho = caixaEstande.getSize(new THREE.Vector3())
  const item = caixaItem.getCenter(new THREE.Vector3())
  const vertical = THREE.MathUtils.degToRad(fov)
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  const distanciaFrente = (tamanho.length() / 2) / Math.sin(Math.min(vertical, horizontal) / 2) * 1.06 * 1.05
  const alvo = centro.clone()
  alvo.x += (item.x - centro.x) * .2
  alvo.y += (item.y - centro.y) * .15
  const posicao = new THREE.Vector3(alvo.x, centro.y + tamanho.y * .18,
    Math.max(centro.z + distanciaFrente * .85, caixaEstande.max.z + .6))
  return { alvo, posicao, distanciaFrente }
}
