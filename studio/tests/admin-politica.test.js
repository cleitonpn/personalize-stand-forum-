import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const {validarAlvo,podeExcluirPagamento}=createRequire(import.meta.url)('../functions/adminPolitica.js')
test('admin não bloqueia a própria conta nem altera sua senha pelo painel de terceiros',()=>{
  for(const acao of ['acesso','sessoes','senha','excluir'])assert.throws(()=>validarAlvo('admin','admin',acao))
  assert.doesNotThrow(()=>validarAlvo('admin','outro','acesso'))
  assert.throws(()=>validarAlvo('admin','usuarios/terceiro','editar'))
})
test('exclusão preserva cobranças emitidas e recebidas',()=>{
  assert.equal(podeExcluirPagamento(null),true)
  assert.equal(podeExcluirPagamento({status:'aguardando_integracao'}),true)
  for(const status of ['paga','paid','pendente','emitida','processando','reembolsando'])assert.equal(podeExcluirPagamento({status}),false)
})
