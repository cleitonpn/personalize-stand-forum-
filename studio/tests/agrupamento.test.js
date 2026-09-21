import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { analisar } from '../src/lib/glb/analyze.js'
import { superficiesPadrao } from '../src/lib/glb/superficies.js'
import { detectarObjetos, numerar } from '../src/lib/glb/objetos.js'
import { organizarElementos, listarElementos } from '../src/lib/glb/elementos.js'
import { aplicarGrupos, sugerirPartes, chavesDoElemento } from '../src/lib/glb/agrupamento.js'
import { calcularOrcamento } from '../src/lib/glb/precos.js'

function preparar(cena) {
  const analise = analisar(cena), papeis = Object.fromEntries(analise.materiais.map(m => [m.nome, m.papelSugerido]))
  const base = superficiesPadrao(analise, papeis), objetos = numerar(detectarObjetos(analise, papeis, { superficies: base }))
  return { analise, papeis, objetos, superficies: organizarElementos(analise, base, objetos) }
}
function malha(tamanho, pos, material) {
  const m = new THREE.MeshStandardMaterial(); m.name = material
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...tamanho), m); mesh.position.set(...pos); return mesh
}
function moveis() {
  const cena = new THREE.Scene()
  for (const [nome, x] of [['BALCÃO',0], ['Banqueta A',1], ['Banqueta B',-1]]) {
    const grupo = new THREE.Group(); grupo.name = nome
    grupo.add(malha([1,.5,.5],[x,.25,0],nome === 'BALCÃO' ? 'Mobiliario' : 'Tiffany'))
    grupo.add(malha([1,.5,.5],[x,.75,0],nome === 'BALCÃO' ? 'Mobiliario' : 'Tiffany'))
    cena.add(grupo)
  }
  return preparar(cena)
}

test('banquetas encostadas no balcão respeitam os componentes do GLB', () => {
  const dados = moveis()
  assert.equal(dados.objetos.length, 3)
  assert.equal(dados.objetos.filter(o => o.nome.startsWith('Balcão')).length, 1)
  for (const o of dados.objetos) assert.equal(new Set(dados.analise.pecas.filter(p => o.pecas.includes(p.chave)).map(p => p.componenteOrigem)).size, 1)
})

test('parede do fundo mantém seus três painéis mesmo encostados', () => {
  const cena = new THREE.Scene()
  cena.add(malha([2.9,2.9,.1],[1.55,1.46,-4.45],'Madeira'), malha([4,2.9,.1],[5,1.46,-4.44],'M08_Obsidian_Black'), malha([2.9,2.9,.1],[8.45,1.46,-4.45],'Madeira'))
  const dados = preparar(cena)
  assert.equal(listarElementos(dados.superficies,dados.objetos,dados.analise).length,3)
})

test('juntar e separar funciona e a próxima detecção preserva a divisão manual', () => {
  const dados = moveis(), lista = listarElementos(dados.superficies,dados.objetos,dados.analise)
  const juntos = aplicarGrupos({ ...dados, grupos: [{ nome:'Conjunto',tipo:'movel',chaves:lista.flatMap(chavesDoElemento) }] })
  assert.equal(juntos.objetos.length,1)
  assert.ok(juntos.objetos[0].podeMover && juntos.objetos[0].podeGirar)
  const elemento = listarElementos(juntos.superficies,juntos.objetos,dados.analise)[0]
  const grupos = sugerirPartes(elemento,juntos.superficies,dados.analise)
  assert.equal(grupos.length,3)
  const separados = aplicarGrupos({ ...dados,...juntos,grupos })
  assert.equal(separados.objetos.length,3)
  assert.ok(separados.objetos.every(o => o.podeMover && o.podeGirar))
  assert.equal(detectarObjetos(dados.analise,dados.papeis,{superficies:separados.superficies}).length,3)
  assert.deepEqual(new Set(separados.superficies.flatMap(s=>s.pecas)),new Set(dados.superficies.flatMap(s=>s.pecas)))
  assert.equal(new Set(separados.superficies.map(s=>s.id)).size,separados.superficies.length)
})

test('separar um móvel girado preserva a posição de cada parte e objetos fora da edição', () => {
  const dados = moveis(), lista = listarElementos(dados.superficies,dados.objetos,dados.analise)
  const junto = aplicarGrupos({ ...dados, grupos: [{nome:'Conjunto',tipo:'movel',chaves:lista.slice(0,2).flatMap(chavesDoElemento)}] })
  const conjunto = junto.objetos.find(o => o.nome === 'Conjunto')
  conjunto.transform = {dx:2,dz:3,rotY:Math.PI/2}
  const intacto = junto.objetos.find(o => o.id !== conjunto.id)
  const elemento = listarElementos(junto.superficies,junto.objetos,dados.analise).find(e => e.objetos.some(o => o.id === conjunto.id))
  const separado = aplicarGrupos({...dados,...junto,grupos:sugerirPartes(elemento,junto.superficies,dados.analise)})
  assert.strictEqual(separado.objetos.find(o => o.id === intacto.id),intacto)
  for (const o of separado.objetos.filter(o => o.id !== intacto.id)) {
    assert.equal(o.transform.rotY,Math.PI/2)
    assert.ok(Math.abs(o.apoio[0]+o.transform.dx-(conjunto.apoio[0]+2+o.apoio[2]-conjunto.apoio[2])) < 1e-8)
    assert.ok(Math.abs(o.apoio[2]+o.transform.dz-(conjunto.apoio[2]+3-o.apoio[0]+conjunto.apoio[0])) < 1e-8)
  }
})

test('agrupar painéis manualmente não os transforma em móveis', () => {
  const cena = new THREE.Scene()
  cena.add(malha([2,2.9,.1],[0,1.46,0],'Madeira'),malha([2,2.9,.1],[2,1.46,0],'Madeira'))
  const d=preparar(cena)
  const r=aplicarGrupos({...d,grupos:[{nome:'Parede',tipo:'parede',chaves:d.superficies.flatMap(s=>s.pecas)}]})
  assert.equal(r.objetos.length,0)
  assert.equal(listarElementos(r.superficies,r.objetos,d.analise).length,1)
})

test('divisão preserva referências de adicionais e quantidade total das superfícies', () => {
  const dados = moveis(), s = dados.superficies.find(s=>s.pecas.length>1)
  const complementos = [{id:'opcional',ancora:s.id,opcoes:[{id:'troca',esconde:[s.id]}]}]
  const acabamento = {cor:'#123456',arte:'local.png'}
  const resultado = aplicarGrupos({...dados,complementos,acabamentos:{[s.id]:acabamento},grupos:s.pecas.map((k,i)=>({nome:`Parte ${i+1}`,tipo:'movel',chaves:[k]}))})
  assert.ok(resultado.superficies.some(s=>s.id===resultado.complementos[0].ancora))
  const ids=resultado.complementos[0].opcoes[0].esconde
  for (const id of ids) assert.deepEqual(resultado.acabamentos[id],acabamento)
  assert.deepEqual(new Set(resultado.superficies.filter(s=>ids.includes(s.id)).flatMap(s=>s.pecas)),new Set(s.pecas))
})

test('logo é separado da parede e sua remoção não cobra personalização', () => {
  const cena = new THREE.Scene()
  cena.add(malha([4,2.9,.1],[0,1.46,0],'Madeira'),malha([2,.7,.02],[0,1.54,.06],'D04_Dandelion_Burst2'))
  const d = preparar(cena), es = listarElementos(d.superficies,d.objetos,d.analise), logo=es.find(e=>e.tipo==='logo')
  assert.equal(es.length,2); assert.ok(logo); assert.equal(logo.objetos.length,0)
  const s=logo.superficies[0]; assert.ok(s.podeCor&&s.podeArte&&s.podeRemover)
  const orcamento=calcularOrcamento({...d,acabamentos:{[s.id]:{cor:'#fff',removido:true}},precos:{adesivo:{unidade:'m2',valor:50}}})
  assert.equal(orcamento.total,0);assert.equal(orcamento.itens[0].detalhe,'removido do estande')
})
