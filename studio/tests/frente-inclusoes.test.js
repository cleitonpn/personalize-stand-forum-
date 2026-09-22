import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { projetarFrente } from '../src/lib/glb/frente.js'
import { novaOpcao, novoGrupo, opcoesAtivas, pecasParaCena, chavesEscondidas, offsetNoPiso } from '../src/lib/glb/complementos.js'

test('arte frontal em malha única não pinta tampo, laterais nem fundo',()=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(2,1,.5));m.updateMatrixWorld()
  const p=projetarFrente([m],0).get(m)
  assert.equal(p.grupos.filter(g=>g.materialIndex===1).reduce((n,g)=>n+g.count,0),6)
  assert.equal(p.grupos.filter(g=>g.materialIndex===0).reduce((n,g)=>n+g.count,0),30)
  assert.equal(p.proporcao,2)
})
test('painel frontal separado recebe arte; corpo inteiro permanece com cor',()=>{
  const corpo=new THREE.Mesh(new THREE.BoxGeometry(2,1,.5))
  const painel=new THREE.Mesh(new THREE.BoxGeometry(1.8,.8,.02));painel.position.z=.27
  corpo.updateMatrixWorld();painel.updateMatrixWorld()
  const p=projetarFrente([corpo,painel])
  assert.ok(p.get(corpo).grupos.every(g=>g.materialIndex===0))
  assert.equal(p.get(painel).grupos.filter(g=>g.materialIndex===1).reduce((n,g)=>n+g.count,0),6)
  assert.ok(Math.abs(p.get(painel).proporcao-2.25)<1e-6)
})
test('frente configurada acompanha o móvel após giro',()=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(2,1,.5));m.updateMatrixWorld()
  m.userData._matrizArteBase=m.matrixWorld.clone()
  const antes=projetarFrente([m],90).get(m)
  m.rotation.y=1;m.position.x=5;m.updateMatrixWorld()
  const depois=projetarFrente([m],90).get(m)
  assert.deepEqual(antes.grupos,depois.grupos)
  assert.deepEqual(antes.attr.array,depois.attr.array)
})
test('balcão rotacionado no GLB recebe frente automática sem pintar suas laterais',()=>{
  const m=new THREE.Mesh(new THREE.BoxGeometry(2,1,.5));m.rotation.y=.6;m.updateMatrixWorld()
  const p=projetarFrente([m]).get(m)
  assert.equal(p.grupos.filter(g=>g.materialIndex===1).reduce((n,g)=>n+g.count,0),6)
  assert.ok(Math.abs(p.proporcao-2)<1e-6)
})
test('posição pelo piso conserva o tamanho e elimina resíduos numéricos',()=>{
  const bbox={centro:[2,1.5,3],min:[0,7e-16,0],largura:4,altura:3,profundidade:6}
  assert.deepEqual(offsetNoPiso(bbox,[4,0,2]),[2,0,-1])
  assert.equal(bbox.largura,4)
})
test('GLB adicional mantém posição e vínculo; reverter restaura todas as peças',()=>{
  const opc=novaOpcao({arquivo:{url:'sala.glb'},bbox:{largura:4,altura:3,profundidade:3}})
  opc.offset=[2,0,1];opc.esconde=['parede','cadeira']
  const g={...novoGrupo({nome:'Sala',ancora:'parede'}),opcoes:[opc]}
  const ativas=opcoesAtivas([g],{[g.id]:opc.id}),extras=pecasParaCena(ativas)
  assert.deepEqual(extras[0].offset,[2,0,1]);assert.equal(extras[0].ancora,'parede')
  assert.equal(extras[0].scale,undefined)
  assert.deepEqual([...chavesEscondidas(ativas,[{id:'parede',pecas:['a','b']},{id:'cadeira',pecas:['c']}])],['a','b','c'])
  assert.equal(chavesEscondidas(opcoesAtivas([g],{[g.id]:null}),[]),null)
})
