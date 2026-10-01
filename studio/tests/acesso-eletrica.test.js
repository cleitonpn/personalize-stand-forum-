import test from 'node:test'
import assert from 'node:assert/strict'
import { destinoAposLogin } from '../src/lib/acesso.js'
import { marcarPonto, pontosEletricos, precoPonto, MAX_PONTOS } from '../src/lib/eletrica.js'
import { calcularOrcamento } from '../src/lib/glb/precos.js'
import { gerarPropostaHTML } from '../src/lib/proposta.js'
import { resumoEtapa } from '../src/lib/jornada.js'

const limites={x0:-3,x1:3,z0:-2,z1:2}
test('login aguarda o perfil e leva o cliente para o estande, admin para modelos',()=>{
  assert.equal(destinoAposLogin({carregando:true,user:{},perfil:{papel:'admin'}}),null)
  assert.equal(destinoAposLogin({user:{},perfil:{papel:'expositor'}}),'/meu-estande')
  assert.equal(destinoAposLogin({user:{},perfil:{papel:'admin'}}),'/modelos')
  assert.equal(destinoAposLogin({user:{},perfil:null}),null)
  assert.equal(destinoAposLogin({user:{},perfil:{papel:'admin'},erroPerfil:'Sem conexão'}),null)
  assert.equal(destinoAposLogin({user:null}),'/entrar')
})
test('marca e reposiciona sem perder finalidade nem criar outra cobrança',()=>{
  const original=marcarPonto([],[1,0,-1],limites)
  const ps=[{...original[0],uso:'TV',tensao:'220 V'}]
  const novo=marcarPonto(ps,[-2,0,1],limites,ps[0].id)
  assert.equal(novo.length,1)
  assert.deepEqual(novo[0],{...ps[0],x:-2,z:1})
  assert.equal(ps[0].x,1)
  assert.equal(marcarPonto(ps,[4,0,0],limites),ps)
  assert.equal(marcarPonto(ps,[NaN,0,0],limites),ps)
  assert.equal(marcarPonto(ps,[],limites),ps)
  assert.equal(marcarPonto(ps,[0,0,0],{}),ps)
})
test('rascunhos inválidos e duplicados são filtrados; limite ainda permite reposicionar',()=>{
  assert.deepEqual(pontosEletricos({_eletrica:[null,{id:'a',x:1,z:2},{id:'a',x:0,z:0},{id:'b',x:NaN,z:0}]}),[{id:'a',x:1,z:2}])
  const ps=Array.from({length:MAX_PONTOS},(_,i)=>({id:String(i),x:0,z:0}))
  assert.equal(marcarPonto(ps,[1,0,1],limites),ps)
  assert.equal(marcarPonto(ps,[1,0,1],limites,'0')[0].x,1)
})
test('preço é explícito, quantidade soma e remover elimina o adicional',()=>{
  assert.equal(precoPonto({eletrica:{ativo:true,valor:null}}),null)
  assert.equal(precoPonto({eletrica:{ativo:false,valor:150}}),null)
  assert.equal(precoPonto({eletrica:{ativo:true,valor:-1}}),null)
  assert.equal(precoPonto({eletrica:{ativo:true,valor:0}}),0)
  const params={precos:{eletrica:{ativo:true,valor:150}},eletrica:[{id:'1',x:1,z:1},{id:'2',x:0,z:0}]}
  const o=calcularOrcamento(params)
  assert.equal(o.total,300)
  assert.equal(o.porGrupo.eletrica,300)
  assert.equal(o.itens[0].quantidade,2)
  assert.equal(calcularOrcamento({...params,eletrica:[]}).total,0)
  assert.equal(resumoEtapa('eletrica',[],[],{_eletrica:params.eletrica},{}).status,'Personalizado')
  const html=gerarPropostaHTML({cliente:'Teste',itens:o.itens,total:o.total,eletrica:{limites,pontos:[{...params.eletrica[0],uso:'<script>TV</script>',tensao:'220 V'},params.eletrica[1]]}})
  assert.ok(html.includes('2 un.'))
  assert.ok(html.includes('&lt;script&gt;TV&lt;/script&gt;'))
  assert.ok(html.includes('4.00 m da borda esquerda'))
  assert.ok(html.includes('<svg'))
})
