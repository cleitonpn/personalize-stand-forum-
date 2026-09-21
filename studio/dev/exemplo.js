import * as THREE from 'three'

export function criarCenaExemplo() {
  const cena = new THREE.Scene()
  const caixa = (nome, cor, tamanho, pos) => {
    const m = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.8, side: THREE.DoubleSide })
    m.name = nome
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...tamanho), m)
    mesh.position.set(...pos); cena.add(mesh); return mesh
  }
  caixa('Carpete', '#313642', [8, .06, 4], [0, 0, 0])
  caixa('Bagum', '#ddddcf', [4, 2.8, .08], [-2, 1.4, -2])
  caixa('Madeira', '#bd9e6a', [4, 2.8, .08], [2, 1.4, -2])
  caixa('Bagum', '#ced3dc', [.08, 2.8, 4], [-4, 1.4, 0])
  caixa('Balcão', '#505969', [1.8, 1, .6], [1.4, .53, 1])
  for (const x of [-1.5, -.5]) {
    caixa('Cadeira', '#969fae', [.5, .12, .5], [x, .54, .5])
    caixa('Cadeira', '#969fae', [.5, .6, .1], [x, .85, .3])
    for (const dx of [-.18, .18]) for (const dz of [-.18, .18]) caixa('Cadeira', '#384657', [.06, .48, .06], [x + dx, .27, .5 + dz])
  }
  caixa('Metal', '#252b32', [.08, 2.95, .08], [-4, 1.47, -2])
  caixa('Metal', '#252b32', [8.08, .1, .12], [0, 2.85, -2])
  return cena
}
