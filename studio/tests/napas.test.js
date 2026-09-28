import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { NAPAS, combinarNapas, napasDisponiveis, acabamentoNapa, validarNapa } from '../src/lib/napas.js'
import { calcularOrcamento } from '../src/lib/glb/precos.js'
import { gerarPropostaHTML } from '../src/lib/proposta.js'
import { uvPlanar } from '../src/lib/glb/arte.js'

test('catálogo do PDF tem 40 identidades únicas e preserva código ausente',()=>{
  assert.equal(NAPAS.length,40);assert.equal(new Set(NAPAS.map(n=>n.id)).size,40)
  assert.equal(NAPAS.filter(n=>!n.codigo).length,1)
  assert.equal(NAPAS.find(n=>n.nome==='Vermelho Cereja').codigo,null)
  for(const n of NAPAS){assert.equal(validarNapa(n),'');assert.deepEqual(n.tipos,['parede']);assert.equal(n.preco,null)}
})
test('biblioteca aplica overrides sem duplicar e restringe disponibilidade por elemento',()=>{
  const id=NAPAS[0].id,segundo=NAPAS[1].id
  const c=combinarNapas([{id,ativo:false},{id:'especial',nome:'Trama',ativo:true,tipos:['parede']}])
  assert.equal(c.length,41)
  assert.deepEqual(napasDisponiveis(c,'parede',[{acabamentosPermitidos:[id,segundo]},{acabamentosPermitidos:[segundo]}]).map(n=>n.id),[segundo])
  assert.equal(napasDisponiveis(c,'piso').length,0)
  assert.equal(napasDisponiveis(c,'parede',[{acabamentosPermitidos:[]}]).length,0)
})
const base={analise:{pecas:[{chave:'p',bbox:{largura:3,altura:2,profundidade:.1,centro:[0,1,0]}}]},superficies:[{id:'s',nome:'Parede',papel:'bagum',pecas:['p']}],objetos:[],precos:{bagum:{unidade:'m2',valor:10}}}
test('napa mantém regra do projeto ou usa preço explícito, inclusive zero',()=>{
  const n=NAPAS[0],acabamentos={s:acabamentoNapa(n)}
  assert.equal(calcularOrcamento({...base,acabamentos}).total,60)
  assert.equal(calcularOrcamento({...base,acabamentos,catalogo:[{...n,preco:25}]}).total,150)
  assert.equal(calcularOrcamento({...base,acabamentos,catalogo:[{...n,preco:0}]}).total,0)
  assert.equal(calcularOrcamento({...base,acabamentos:{s:{...acabamentos.s,arte:'imagem'}},catalogo:[{...n,preco:25}]}).total,60)
})
test('proposta registra nome e código, inclusive acabamento gratuito; parede substituída não cobra',()=>{
  const n=NAPAS[0],acabamentos={s:acabamentoNapa(n)},o=calcularOrcamento({...base,precos:{},acabamentos})
  assert.equal(o.itens.length,1);assert.equal(o.total,0)
  const html=gerarPropostaHTML({cliente:'Teste',itens:o.itens,total:o.total})
  assert.ok(html.includes(n.nome));assert.ok(html.includes(n.codigo))
  assert.equal(calcularOrcamento({...base,acabamentos,complementos:{escondidas:new Set(['s'])}}).itens.length,0)
})
test('textura exige imagem e escala física válida',()=>{
  assert.match(validarNapa({...NAPAS[0],familia:'especial'}),/imagem/)
  assert.match(validarNapa({...NAPAS[0],escala:0}),/largura/)
  assert.match(validarNapa({...NAPAS[0],preco:-1}),/preço/)
  assert.equal(validarNapa({...NAPAS[0],familia:'especial',textura:'https://example.com/trama.png'}),'')
})
test('UV de textura mede escala em mundo mesmo com malha girada e escalada',()=>{
  const g=new THREE.PlaneGeometry(2,3),m=new THREE.Matrix4().makeRotationY(Math.PI/2).multiply(new THREE.Matrix4().makeScale(2,2,2))
  const uv=uvPlanar(g,m)
  assert.equal(uv.largura,4);assert.equal(uv.altura,6)
  assert.equal(uv.proporcao,2/3)
})
