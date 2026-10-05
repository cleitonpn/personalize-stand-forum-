import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { analisar } from '../src/lib/glb/analyze.js'
import { detectarObjetos } from '../src/lib/glb/objetos.js'
import { completarPartesMoveis } from '../src/lib/glb/partesMoveis.js'

function fixture() {
  const scene = new THREE.Scene(), conjunto = new THREE.Group()
  function mesh(nome, tamanho, pos) {
    const material = new THREE.MeshStandardMaterial(); material.name = nome
    const m = new THREE.Mesh(new THREE.BoxGeometry(...tamanho), material); m.position.set(...pos); return m
  }
  conjunto.add(mesh('Tiffany', [.5,1,.5], [0,.5,0]), mesh('METAL PRETO', [.3,.02,.3], [0,.25,0]))
  scene.add(conjunto, mesh('METAL PRETO', [.1,3,.1], [0,1.5,.4]))
  const analise = analisar(scene), papeis = { Tiffany:'mobiliario', 'METAL PRETO':'metal' }
  return { scene, analise, papeis }
}

test('metal dentro do componente move junto; estrutura próxima permanece independente', () => {
  const { analise, papeis } = fixture()
  const os = detectarObjetos(analise, papeis)
  assert.equal(os.length, 1)
  assert.equal(os[0].pecas.length, 2)
  assert.ok(!os[0].pecas.includes(analise.pecas[2].chave))
})

test('corrige configuração antiga sem alterar identidade, transformação ou decisões explícitas', () => {
  const { analise, papeis } = fixture()
  const original = [{ id:'salvo', pecas:[analise.pecas[0].chave], podeMover:true, transform:{dx:2,dz:3,rotY:.4} }]
  const corrigidos = completarPartesMoveis(analise, original, [], papeis)
  assert.equal(corrigidos[0].pecas.length, 2)
  assert.equal(corrigidos[0].id, 'salvo')
  assert.deepEqual(corrigidos[0].transform, original[0].transform)
  assert.equal(original[0].pecas.length, 1)
  assert.strictEqual(completarPartesMoveis(analise, corrigidos, [], papeis), corrigidos)
  const separado = [{pecas:[analise.pecas[1].chave],papel:'metal',tipoManual:true,tipoElemento:'estrutura'}]
  assert.strictEqual(completarPartesMoveis(analise, original, separado, papeis), original)
})

test('componente dividido entre dois móveis não ganha partes por adivinhação', () => {
  const { analise, papeis } = fixture()
  const p = {...analise.pecas[0], chave:'outra-cadeira'}
  analise.pecas.push(p)
  const os = [{id:'a',pecas:[analise.pecas[0].chave],podeMover:true},{id:'b',pecas:[p.chave],podeMover:true}]
  assert.strictEqual(completarPartesMoveis(analise, os, [], papeis), os)
})
