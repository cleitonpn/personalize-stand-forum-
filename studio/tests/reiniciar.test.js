import test from 'node:test'
import assert from 'node:assert/strict'
import { estadoOriginal, reiniciarPersonalizacao } from '../src/lib/reiniciarPersonalizacao.js'

test('reinício restaura posições publicadas e não reaproveita escolhas do cliente', () => {
  const modelo = { objetos: [{ id:'mesa', transform:{dx:2,dz:3,rotY:1}, pecas:['tampo'] }] }
  const e = estadoOriginal(modelo)
  assert.deepEqual(e, {acabamentos:{},escolhas:{},objetos:modelo.objetos})
  e.objetos[0].transform.dx = 9
  e.objetos[0].pecas.push('outra')
  assert.equal(modelo.objetos[0].transform.dx, 2)
  assert.deepEqual(modelo.objetos[0].pecas, ['tampo'])
})

test('recarregar imediatamente após reset recupera a base e não o rascunho antigo', () => {
  const dados = new Map([['rascunho',JSON.stringify({acabamentos:{p:{arte:'logo'}},escolhas:{_eletrica:[{x:1,z:2}],sala:'adicional'}})],['jornada','revisao']])
  const storage = {setItem:(k,v)=>dados.set(k,v),removeItem:k=>dados.delete(k)}
  const r = reiniciarPersonalizacao({atualizadoEm:{seconds:42},objetos:[{id:'mesa',transform:{dx:3}}]},'rascunho','jornada',()=>storage)
  assert.equal(r.persistido,true)
  assert.deepEqual(JSON.parse(dados.get('rascunho')), {versao:42,acabamentos:{},escolhas:{},transformes:{mesa:{dx:3}}})
  assert.equal(dados.has('jornada'),false)
})

test('armazenamento bloqueado não impede o reinício em memória', () => {
  const r = reiniciarPersonalizacao({},'r','j',()=>{throw Error('bloqueado')})
  assert.equal(r.persistido,false)
  assert.deepEqual(r.estado,{acabamentos:{},escolhas:{},objetos:[]})
})
