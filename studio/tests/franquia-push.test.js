import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {aplicarFranquia,validarFranquia} from '../functions/franquia.mjs'
import {calcularOrcamento} from '../src/lib/glb/precos.js'
const require=createRequire(import.meta.url),{destinoValido,destinatarios,chave}=require('../functions/notificacaoPolitica.js')
const linha=(id,q,v=100)=>({id,tipoPersonalizacao:'arte',unidade:'m2',quantidade:q,valorUnitario:v,total:q*v,detalhe:'Arte'})
test('9 m² compartilhados em 12 m² cobram exatamente 3 m²',()=>{
 const r=aplicarFranquia([linha('a',6),linha('b',6)],{ativo:true,limiteM2:9,itens:['a','b']})
 assert.equal(r.itens.reduce((n,i)=>n+i.total,0),300);assert.equal(r.franquia.utilizadaM2,9);assert.equal(r.franquia.restanteM2,0);assert.equal(r.franquia.extraM2,3)
})
test('franquia beneficia áreas mais caras sem depender da ordem de seleção; outros itens e cores não consomem saldo',()=>{
 const regra={ativo:true,limiteM2:5,itens:['a','b']},linhas=[linha('a',4,50),linha('b',4,200),linha('c',2,100),{id:'cor',tipoPersonalizacao:'cor',unidade:'m2',quantidade:3,total:60}]
 const a=aplicarFranquia(linhas,regra),b=aplicarFranquia([...linhas].reverse(),regra)
 assert.equal(a.itens.reduce((n,i)=>n+i.total,0),410);assert.equal(b.itens.reduce((n,i)=>n+i.total,0),410);assert.equal(a.itens.find(i=>i.id==='b').incluidoM2,4);assert.equal(a.itens.find(i=>i.id==='cor').total,60);assert.equal(a.franquia.extraM2,5)
})
test('saldo não utilizado não gera crédito nem altera o valor de inclusões',()=>{
 const r=aplicarFranquia([linha('a',2),{id:'led',total:2500,unidade:'peca',quantidade:1}],{ativo:true,limiteM2:9,itens:['a']})
 assert.equal(r.franquia.restanteM2,7);assert.equal(r.itens[0].total,0);assert.equal(r.itens[1].total,2500)
})
test('admin deve escolher áreas que aceitam arte e preço por m² com metragem conhecida',()=>{
 const s=[{id:'a',podeArte:true,papel:'lona',nome:'Parede'}],r={ativo:true,limiteM2:9,itens:['a']},p={lona:{unidade:'m2',valor:100},metragensArte:{a:6}}
 assert.doesNotThrow(()=>validarFranquia(r,s,p));assert.throws(()=>validarFranquia({...r,itens:['x']},s,p));assert.throws(()=>validarFranquia(r,s,{...p,lona:{unidade:'peca',valor:100}}));assert.throws(()=>validarFranquia(r,s,{...p,metragensArte:{}}))
})
test('arte pendente consome franquia e remoção elimina o consumo; superfície não é contada duas vezes',()=>{
 const args={analise:{pecas:[]},superficies:[{id:'a',nome:'Parede',podeArte:true,podeRemover:true,papel:'lona',pecas:[]}],acabamentos:{a:{artePendente:true}},precos:{lona:{valor:100,unidade:'m2'},metragensArte:{a:12},arteInclusa:{ativo:true,limiteM2:9,itens:['a']}}}
 assert.equal(calcularOrcamento(args).total,300);assert.equal(calcularOrcamento({...args,acabamentos:{a:{artePendente:true,removido:true}}}).total,0)
})
test('push respeita organizadora, conta ativa e exclui o autor',()=>{
 const us=[{id:'admin',papel:'admin'},{id:'org',papel:'organizadora',organizadoraId:'a'},{id:'outra',papel:'organizadora',organizadoraId:'b'},{id:'off',papel:'admin',ativo:false},{id:'cliente',papel:'expositor'}]
 assert.deepEqual(destinatarios(us,{alvo:'equipe',autor:'cliente',organizadoraId:'a'}),['admin','org']);assert.deepEqual(destinatarios(us,{alvo:'cliente',autor:'admin',cliente:'cliente'}),['cliente']);assert.equal(chave('msg','admin'),chave('msg','admin'));assert.notEqual(chave('msg','admin'),chave('msg','org'))
})
test('assinaturas push só aceitam serviços HTTPS conhecidos, sem credenciais nem portas',()=>{
 for(const u of ['https://fcm.googleapis.com/fcm/send/a','https://updates.push.services.mozilla.com/wpush/v2/a','https://web.push.apple.com/a','https://wns2.notify.windows.com/a'])assert.equal(destinoValido(u),true)
 for(const u of ['http://fcm.googleapis.com/a','https://localhost/a','https://fcm.googleapis.com.evil.test/a','https://user@fcm.googleapis.com/a','https://fcm.googleapis.com:444/a'])assert.equal(destinoValido(u),false)
})
