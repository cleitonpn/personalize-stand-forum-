// Regressão geométrica dos GLBs fornecidos pelo usuário; não envia arquivos.
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {analisar} from '../src/lib/glb/analyze.js'
import {detectarObjetos} from '../src/lib/glb/objetos.js'
import {completarPartesMoveis} from '../src/lib/glb/partesMoveis.js'

if(!process.argv.slice(2).length)throw Error('Informe os GLBs locais que contêm aparadores suspensos.')
globalThis.self=globalThis
for(const path of process.argv.slice(2)){
 const b=fs.readFileSync(path),loader=new GLTFLoader()
 loader.register(p=>{p.loadTexture=async()=>null;return{name:'geometry-test'}})
 const {scene}=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
 const analise=analisar(scene),papeis=Object.fromEntries(analise.materiais.map(m=>[m.nome,m.papelSugerido]))
 const objetos=detectarObjetos(analise,papeis)
 const tampos=analise.pecas.filter(p=>papeis[p.materialNome]==='madeira'&&p.bbox.min[1]>.35&&p.bbox.altura<.1&&p.bbox.largura>1)
 assert.ok(tampos.length,'O arquivo deve conter um aparador suspenso.')
 for(const tampo of tampos){
  assert.ok(tampo.componenteOrigem,'O aparador precisa conservar o componente suspenso do GLB.')
  const conjunto=analise.pecas.filter(p=>p.componenteOrigem===tampo.componenteOrigem)
  assert.equal(conjunto.length,3,'Tampo e dois suportes devem formar um conjunto.')
  const obj=objetos.find(o=>o.pecas.includes(tampo.chave))
  assert.ok(obj?.podeMover)
  assert.deepEqual(new Set(obj.pecas),new Set(conjunto.map(p=>p.chave)))
  const salvo={...obj,id:'aparador-salvo',nome:'Aparador',pecas:[tampo.chave],transform:{dx:1,dz:2,rotY:.3}}
  const recuperado=completarPartesMoveis(analise,[salvo],[],papeis)[0]
  assert.deepEqual(new Set(recuperado.pecas),new Set(obj.pecas))
  assert.deepEqual(recuperado.transform,salvo.transform)
  assert.deepEqual(recuperado.apoio,salvo.apoio)
 }
 console.log(`${path}: ${tampos.length} aparador(es), tampo e dois suportes incluídos; configuração antiga preservada.`)
}
