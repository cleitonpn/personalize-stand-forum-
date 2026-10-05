import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { enquadrarSelecao } from '../src/lib/cameraSelecao.js'
const box = (min,max) => new THREE.Box3(new THREE.Vector3(...min),new THREE.Vector3(...max))
const stand = box([-5,0,-4],[5,3,0])

test('selecionar móveis na frente ou no fundo mantém câmera na frente do estande',()=>{
  for(const item of [box([-3,0,-1],[-2,1,0]),box([2,0,-4],[3,1,-3]),box([-5,0,-4],[-4,3,0])]) {
    const vista=enquadrarSelecao(stand,item,45,1.6)
    assert.ok(vista.posicao.z>stand.max.z)
    assert.equal(vista.alvo.z,-2)
    assert.ok(Math.abs(vista.alvo.x)<=.9)
    assert.ok(Math.abs((vista.posicao.z+2)/vista.distanciaFrente-.85)<1e-8)
  }
})
test('enquadramento conserva contexto em tela estreita e ignora caixas vazias',()=>{
  const item=box([0,0,-2],[.1,.1,-1.9])
  assert.ok(enquadrarSelecao(stand,item,45,.6).posicao.z>enquadrarSelecao(stand,item,45,1.6).posicao.z)
  assert.equal(enquadrarSelecao(stand,new THREE.Box3(),45,1.6),null)
})
