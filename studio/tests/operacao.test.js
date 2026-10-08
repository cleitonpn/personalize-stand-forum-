import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {destinoAposLogin} from '../src/lib/acesso.js'
const {manifesto,podeOperar,podeGerir,resumoCV}=createRequire(import.meta.url)('../functions/operacaoPolitica.js')
const {transicao}=createRequire(import.meta.url)('../functions/producaoEstado.js')
const modelo={nome:'Padrão',superficies:[{id:'parede',nome:'Parede esquerda',papel:'bagum',origem:'Napa original',pecas:['p']},{id:'bistro',nome:'Bistrô padrão',papel:'mobiliario',pecas:['m']}],objetos:[{id:'movel',nome:'Conjunto bistrô',pecas:['m']}],complementos:[{id:'extras',nome:'Móveis',tipo:'mobiliario',opcoes:[{id:'mesa',nome:'Mesa nova',esconde:['bistro']}]}]}
test('manifesto inclui os itens padrão mesmo sem nenhuma cobrança',()=>{
  const m=manifesto(modelo,{itens:[],total:0});assert.equal(m.moveis.length,1);assert.equal(m.moveis[0].origem,'incluido');assert.equal(m.materiais.length,2);assert.equal(m.materiais[0].acabamento.alterado,false)
})
test('substituição, retirada, múltiplas instâncias e posição são explícitas',()=>{
  const m=manifesto(modelo,{acabamentos:{parede:{materialNome:'Azul Bahia',materialCodigo:'CB1',cor:'#123456',artePendente:true}},objetos:[{id:'movel',transform:{dx:1,dz:2,rotY:0}}],escolhas:{extras:{itens:[{id:'1',opcaoId:'mesa',substituir:true,offset:[3,0,1]},{id:'2',opcaoId:'mesa',offset:[1,0,2]}]}}});assert.equal(m.moveis[0].origem,'substituido');assert.equal(m.moveis[0].transform.dx,1);assert.equal(m.extras.length,2);assert.equal(m.materiais[0].acabamento.codigo,'CB1');assert.equal(m.materiais[0].artePendente,true)
  assert.throws(()=>manifesto(modelo,{escolhas:{extras:{itens:[{id:'1',opcaoId:'inexistente'}]}}}))
})
test('operação exige aprovação, feira autorizada e equipe atribuída',()=>{
  const o={estado:'liberada',feiraId:'f',equipeIds:['e']},p={ativo:true,papel:'equipe_producao',feiraIds:['f'],equipeIds:['e']}
  assert.equal(podeOperar(p,o),true);assert.equal(podeOperar(p,{...o,estado:'suspensa'}),false);assert.equal(podeOperar({...p,feiraIds:['outra']},o),false);assert.equal(podeOperar({...p,equipeIds:['outra']},o),false);assert.equal(podeOperar({...p,ativo:false},o),false);assert.equal(podeOperar({papel:'organizadora',feiraIds:['f']},o),false)
  assert.equal(podeGerir({...p,papel:'analista_operacional'},'f'),true);assert.equal(podeGerir(p,'f'),false)
})
test('uma arte pendente impede o conjunto de aparecer como impresso',()=>{
  assert.deepEqual(resumoCV([{status:'impressa'},{status:'recebida'}]),{total:2,impressas:1,pendentes:1,pronta:false});assert.equal(resumoCV([]).pronta,false)
})
test('CV pode operar a prova e impressão; equipe operacional apenas consulta',()=>{
  const a={status:'recebida',arquivo:{caminho:'a'},versao:1,revisao:1},prova={id:'p'}
  assert.equal(transicao(a,'prova','analista_cv',{prova}).status,'em_prova')
  assert.throws(()=>transicao(a,'prova','analista_operacional',{prova}))
  assert.throws(()=>transicao(a,'impressao','analista_cv',{status:'em_impressao'}))
  assert.equal(transicao({...a,status:'aprovada'},'impressao','analista_cv',{status:'em_impressao'}).status,'em_impressao')
})
test('login operacional entra na produção, sem passar pelo configurador do cliente',()=>{
  for(const papel of ['gerente_operacional','analista_operacional','analista_cv','equipe_producao'])assert.equal(destinoAposLogin({user:{uid:'u'},perfil:{papel}}),'/producao')
})
