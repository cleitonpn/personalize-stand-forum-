import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {destinoAposLogin} from '../src/lib/acesso.js'
const {manifesto}=createRequire(import.meta.url)('../functions/manifestoProposta.js')
const {podeCV,podeConsultarArte}=createRequire(import.meta.url)('../functions/artesAcesso.js')
const {transicao}=createRequire(import.meta.url)('../functions/producaoEstado.js')
const modelo={nome:'Padrão',superficies:[{id:'parede',nome:'Parede esquerda',papel:'bagum',origem:'Napa original',pecas:['p']},{id:'bistro',nome:'Bistrô padrão',papel:'mobiliario',pecas:['m']}],objetos:[{id:'movel',nome:'Conjunto bistrô',pecas:['m']}],complementos:[{id:'extras',nome:'Móveis',tipo:'mobiliario',opcoes:[{id:'mesa',nome:'Mesa nova',esconde:['bistro']}]}]}
test('manifesto inclui os itens padrão mesmo sem nenhuma cobrança',()=>{
  const m=manifesto(modelo,{itens:[],total:0});assert.equal(m.moveis.length,1);assert.equal(m.moveis[0].origem,'incluido');assert.equal(m.materiais.length,2);assert.equal(m.materiais[0].acabamento.alterado,false)
})
test('substituição, retirada, múltiplas instâncias e posição são explícitas',()=>{
  const m=manifesto(modelo,{acabamentos:{parede:{materialNome:'Azul Bahia',materialCodigo:'CB1',cor:'#123456',artePendente:true}},objetos:[{id:'movel',transform:{dx:1,dz:2,rotY:0}}],escolhas:{extras:{itens:[{id:'1',opcaoId:'mesa',substituir:true,offset:[3,0,1]},{id:'2',opcaoId:'mesa',offset:[1,0,2]}]}}});assert.equal(m.moveis[0].origem,'substituido');assert.equal(m.moveis[0].transform.dx,1);assert.equal(m.extras.length,2);assert.equal(m.materiais[0].acabamento.codigo,'CB1');assert.equal(m.materiais[0].artePendente,true)
  assert.throws(()=>manifesto(modelo,{escolhas:{extras:{itens:[{id:'1',opcaoId:'inexistente'}]}}}))
})
test('CV consulta apenas configurações liberadas das suas feiras; perfis de campo não acessam o Studio',()=>{
  const acesso={estado:'liberada',feiraId:'f'},cv={papel:'analista_cv',feiraIds:['f']}
  assert.ok(podeConsultarArte(cv,acesso))
  assert.ok(!podeConsultarArte(cv,{...acesso,estado:'suspensa'}))
  assert.ok(!podeConsultarArte({...cv,ativo:false},acesso))
  assert.ok(!podeConsultarArte({...cv,feiraIds:['outra']},acesso))
  assert.ok(!podeCV(cv,''))
  for(const papel of ['produtor','gerente_operacional','analista_operacional','atendimento_comercial','mobiliario','analista_projeto','equipe_producao'])assert.ok(!podeConsultarArte({...cv,papel},acesso))
})

test('CV pode operar a prova e impressão; equipe operacional apenas consulta',()=>{
  const a={status:'recebida',arquivo:{caminho:'a'},versao:1,revisao:1},prova={id:'p'}
  assert.equal(transicao(a,'prova','analista_cv',{prova}).status,'em_prova')
  assert.throws(()=>transicao(a,'prova','analista_operacional',{prova}))
  assert.throws(()=>transicao(a,'impressao','analista_cv',{status:'em_impressao'}))
  assert.equal(transicao({...a,status:'aprovada'},'impressao','analista_cv',{status:'em_impressao'}).status,'em_impressao')
})
test('CV entra em artes e perfis de campo recebem orientação sobre o app irmão',()=>{
  assert.equal(destinoAposLogin({user:{uid:'u'},perfil:{papel:'analista_cv'}}),'/artes')
  for(const papel of ['gerente_operacional','analista_operacional','produtor','atendimento_comercial','mobiliario','analista_projeto','equipe_producao'])assert.equal(destinoAposLogin({user:{uid:'u'},perfil:{papel}}),'/app-producao')
})
