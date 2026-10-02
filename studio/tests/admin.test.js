import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { calcularOrcamento } from '../src/lib/glb/precos.js'
import { relacionarMobiliario } from '../src/lib/bibliotecaMobiliario.js'
import { analisarUso,mediana } from '../src/lib/analiseUso.js'
import { copiarMalhasVisiveis } from '../src/lib/exportarGLB.js'

test('preço por item tem prioridade, permite zero e distingue arte de revestimento',()=>{
  const args={analise:{pecas:[{chave:'a',bbox:{largura:2,altura:3,profundidade:.1}}]},superficies:[{id:'p',pecas:['a'],papel:'bagum'}],acabamentos:{p:{cor:'#fff',materialId:'n'}},catalogo:[{id:'n',preco:90}],precos:{bagum:{unidade:'m2',valor:20},itens:{p:{cor:{unidade:'peca',valor:0},arte:{unidade:'m2',valor:30}}}}}
  assert.equal(calcularOrcamento(args).total,0)
  args.acabamentos.p.arte='logo.png'
  assert.equal(calcularOrcamento(args).total,180)
  args.complementos={escondidas:new Set(['p'])}
  assert.equal(calcularOrcamento(args).total,0)
})

test('vínculo em lote é idempotente e preserva ajustes feitos no projeto',()=>{
  const item={id:'a',nome:'Mesa',valor:90,limite:4,arquivo:{url:'mesa.glb'},bbox:{min:[-1,0,-1],max:[1,1,1],centro:[0,.5,0],largura:2,altura:1,profundidade:2}}
  const modelo={complementos:[{id:'sala',opcoes:[]}],recorte:{x0:0,x1:8,z0:0,z1:4}}
  const primeira=relacionarMobiliario(modelo,[item]);const op=primeira[1].opcoes[0]
  assert.equal(op.limite,4);assert.deepEqual(op.offset,[4,0,2]);op.preco.valor=120;op.esconde=['parede'];op.offset=[2,0,3]
  const segunda=relacionarMobiliario({...modelo,complementos:primeira},[{...item,valor:500}])
  assert.deepEqual(segunda,primeira);assert.equal(modelo.complementos.length,1)
})

test('análise não diagnostica com amostra pequena nem conta sessão recente como parada',()=>{
  const agora=5e6,s={uid:'u',enviou:false,atualizadoEm:agora,ultimaEtapa:'marca',etapas:{marca:{visitas:3,erros:1,segundos:20}}}
  assert.equal(analisarUso([s],agora).etapas.find(e=>e.id==='marca').score,null)
  const cinco=Array.from({length:5},(_,i)=>({...s,uid:String(i)})),r=analisarUso(cinco,agora).etapas.find(e=>e.id==='marca')
  assert.equal(r.semEnvio,0);assert.equal(r.score,50)
  const antigos=cinco.map(x=>({...x,atualizadoEm:0}))
  assert.equal(analisarUso(antigos,agora).etapas.find(e=>e.id==='marca').score,100)
  assert.equal(analisarUso(antigos.map(x=>({...x,enviou:true})),agora).etapas.find(e=>e.id==='marca').semEnvio,0)
  assert.equal(mediana([10,100,30,20]),25)
})

test('GLB conserva transformações mundiais e omite itens escondidos e auxiliares',()=>{
  const raiz=new THREE.Group(),g=new THREE.Group();raiz.position.set(2,0,3);g.rotation.y=Math.PI/2;raiz.add(g)
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial({color:'red'}));mesh.name='Balcão';mesh.position.x=1;g.add(mesh)
  const oculto=new THREE.Group();oculto.visible=false;oculto.add(new THREE.Mesh(new THREE.BoxGeometry(),mesh.material));raiz.add(oculto);raiz.add(new THREE.AxesHelper(1))
  const copia=copiarMalhasVisiveis([raiz]);assert.equal(copia.children.length,1)
  const p=copia.children[0].position;assert.ok(Math.abs(p.x-2)<1e-9);assert.ok(Math.abs(p.z-2)<1e-9)
  assert.equal(copia.children[0].material.color.getHexString(),'ff0000');assert.equal(mesh.parent,g)
})
