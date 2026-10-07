import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import * as THREE from 'three'
import {analisar} from '../src/lib/glb/analyze.js'
import {medirAreas,areasEscolhidas,metragensArte} from '../src/lib/producao/medidas.js'
const {transicao}=createRequire(import.meta.url)('../functions/producaoEstado.js')
const area={status:'recebida',confirmada:true,revisao:1,versao:2,arquivo:{caminho:'arte'}}
test('aprovação e impressão exigem a prova e a versão atuais',()=>{
  const prova={id:'prova-atual',versao:2,revisao:1}
  const emProva={...area,...transicao(area,'prova','admin',{prova})}
  assert.throws(()=>transicao(emProva,'responder','expositor',{provaId:'antiga',versao:2,aprovar:true}))
  assert.throws(()=>transicao(emProva,'responder','expositor',{provaId:prova.id,versao:1,aprovar:true}))
  assert.throws(()=>transicao(emProva,'impressao','admin',{status:'em_impressao'}))
  const aprovada={...emProva,...transicao(emProva,'responder','expositor',{provaId:prova.id,versao:2,aprovar:true})}
  assert.equal(transicao(aprovada,'impressao','admin',{status:'em_impressao'}).status,'em_impressao')
  assert.throws(()=>transicao(aprovada,'impressao','organizadora',{status:'em_impressao'}))
})
test('novo gabarito invalida arquivo e prova, conserva o número da versão',()=>{
  const nova=transicao({...area,status:'aprovada',prova:{id:'a'}},'configurar','admin')
  assert.equal(nova.revisao,2);assert.equal(nova.versao,2);assert.equal(nova.prova,null);assert.equal(nova.arquivo,null)
  assert.throws(()=>transicao({...area,status:'em_impressao'},'configurar','admin'))
})
test('envio não confirmado, versão concorrente e alterações por organizadora são negados',()=>{
  assert.throws(()=>transicao({...area,confirmada:false},'enviar','expositor',{revisao:1,versao:2}))
  assert.throws(()=>transicao(area,'enviar','expositor',{revisao:0,versao:2}))
  assert.throws(()=>transicao(area,'enviar','organizadora',{revisao:1,versao:2}))
  assert.equal(transicao(area,'enviar','expositor',{revisao:1,versao:2,contestar:true}).status,'contestada')
  assert.throws(()=>transicao({...area,status:'aprovada'},'enviar','expositor',{revisao:1,versao:2}))
})
test('parede inclinada e escalada mede os vértices na base da impressão',()=>{
  const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,3,.05),new THREE.MeshStandardMaterial({name:'Parede'}))
  mesh.rotation.y=Math.PI/4;mesh.scale.set(1.5,1,1);root.add(mesh)
  const analise=analisar(root),sup={id:'p',nome:'Parede',podeArte:true,pecas:analise.pecas.map(p=>p.chave)}
  const [a]=medirAreas([sup],analise,root)
  assert.equal(a.larguraCm,300);assert.equal(a.alturaCm,300);assert.equal(a.confirmada,false)
  assert.equal(areasEscolhidas([a],{p:{artePendente:true}}).length,1)
  assert.equal(areasEscolhidas([a],{p:{arte:'imagem'}},new Set(['p'])).length,0)
})
test('balcão usa somente a largura e altura da face onde a arte é projetada',()=>{
  const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,1,.6),new THREE.MeshStandardMaterial({name:'Balcão'}));root.add(mesh)
  const analise=analisar(root),sup={id:'b',nome:'Balcão',podeArte:true,arteFrontal:true,anguloFrente:0,pecas:analise.pecas.map(p=>p.chave)}
  const [a]=medirAreas([sup],analise,root);assert.equal(a.larguraCm,200);assert.equal(a.alturaCm,100);assert.equal(a.perfilId,'adesivo-balcao')
})
test('materiais diferentes da mesma parede formam um gabarito físico único',()=>{
  const root=new THREE.Group(),a=new THREE.Mesh(new THREE.BoxGeometry(1,3,.05),new THREE.MeshStandardMaterial({name:'A'})),b=new THREE.Mesh(new THREE.BoxGeometry(1,3,.05),new THREE.MeshStandardMaterial({name:'B'}));b.position.x=1;root.add(a,b)
  const analise=analisar(root),superficies=analise.pecas.map((p,i)=>({id:`s${i}`,elementoId:'parede',nome:'Parede',tipoElemento:'parede',podeArte:true,pecas:[p.chave]}))
  const medidas=medirAreas(superficies,analise,root);assert.equal(medidas.length,1);assert.equal(medidas[0].larguraCm,200);assert.equal(medidas[0].alturaCm,300)
  assert.deepEqual(medidas[0].superficieIds,['s0','s1'])
  assert.equal(areasEscolhidas(medidas,{s0:{artePendente:true},s1:{artePendente:true}},new Set(['s0','s1'])).length,0)
})

test('mapeamento preserva medidas confirmadas, sangria e área única entre materiais',()=>{
 const root=new THREE.Group(),a=new THREE.Mesh(new THREE.BoxGeometry(1,3,.05),new THREE.MeshStandardMaterial({name:'A'})),b=new THREE.Mesh(new THREE.BoxGeometry(1,3,.05),new THREE.MeshStandardMaterial({name:'B'}));b.position.x=1;root.add(a,b)
 const analise=analisar(root),superficies=analise.pecas.map((p,i)=>({id:`s${i}`,elementoId:'parede',nome:'Parede',tipoElemento:'parede',podeArte:true,pecas:[p.chave],producaoArte:{larguraCm:210,alturaCm:300,confirmada:true,sangriaMm:50,margemMm:100,perfilId:'lona-parede'}}))
 const [medida]=medirAreas(superficies,analise,root),m2=metragensArte(superficies,analise,root)
 assert.equal(medida.larguraCm,210);assert.equal(medida.confirmada,true);assert.equal(medida.sangriaMm,50);assert.ok(Math.abs(Object.values(m2).reduce((a,b)=>a+b,0)-6.3)<1e-9)
})
test('logo dispensa gabarito mas continua exigindo prova atual para impressão',()=>{
 const a={status:'aguardando',semGabarito:true,confirmada:true,versao:0,revisao:0}
 assert.throws(()=>transicao(a,'logoPronto','expositor'))
 const preparada={...a,...transicao(a,'logoPronto','admin')};assert.equal(preparada.versao,1)
 const prova={id:'logo-prova'},emProva={...preparada,...transicao(preparada,'prova','admin',{prova})}
 assert.throws(()=>transicao(emProva,'impressao','admin',{status:'em_impressao'}))
 assert.equal(transicao(emProva,'responder','expositor',{versao:1,provaId:'logo-prova',aprovar:true}).status,'aprovada')
})
