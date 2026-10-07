import test from 'node:test'
import assert from 'node:assert/strict'
import { resumirComercial } from '../src/lib/metricasComerciais.js'
import { quantidadePersonalizada } from '../src/lib/quantidadePersonalizada.js'
import { destinoAposLogin } from '../src/lib/acesso.js'
test('revisões substituem totais por cliente e feira, sem misturar feiras ou organizadoras', () => {
  const p = (id, cliente, feiraId, organizadoraId, total, n, seconds) => ({
    id,
    cliente,
    feiraId,
    organizadoraId,
    total,
    quantidadePersonalizada: n,
    criadoEm: { seconds },
  })
  const r = resumirComercial([
    p('1', 'c', 'f', 'o', 100, 2, 1),
    p('2', 'c', 'f', 'o', 250, 3, 2),
    p('3', 'c', 'g', 'o', 40, 1, 3),
    p('4', 'x', 'f', 'o', 60, 2, 4),
    p('5', 'c', 'f', 'outra', 10, 1, 5),
  ])
  assert.equal(r.total, 360)
  assert.equal(r.itens, 7)
  assert.equal(r.clientes, 2)
  assert.equal(r.propostas, 5)
})
test('proposta antiga preserva valor sem inventar contagem de itens', () => {
  const r = resumirComercial([{ id: 'a', cliente: 'c', total: 100 }])
  assert.equal(r.total, 100)
  assert.equal(r.itens, 0)
  assert.equal(r.semContagem, 1)
})
test('contagem inclui personalizações gratuitas, movimento e inclusões sem duplicar malhas', () => {
  const elementos = [
    { superficies: [{ id: 'a' }, { id: 'b' }], objetos: [] },
    { superficies: [], objetos: [{ transform: { dx: 1 } }] },
    { superficies: [{ id: 'c' }], objetos: [] },
  ]
  assert.equal(
    quantidadePersonalizada(
      elementos,
      { a: { cor: '#ffffff' }, b: { arte: 'url' }, c: { cor: null } },
      [{}],
      [{}],
    ),
    4,
  )
  assert.equal(quantidadePersonalizada(elementos, {}, [], []), 1)
})
test('organizadora entra em projetos e não no configurador', () => {
  assert.equal(
    destinoAposLogin({ user: {}, perfil: { papel: 'organizadora' } }),
    '/modelos',
  )
})
test('posição previamente definida pelo admin não conta como personalização do cliente',()=>{
  const movel={id:'mesa',transform:{dx:2,dz:1,rotY:0}}
  const elementos=[{superficies:[],objetos:[movel]}]
  assert.equal(quantidadePersonalizada(elementos,{},[],[],[movel]),0)
  assert.equal(quantidadePersonalizada([{superficies:[],objetos:[{...movel,transform:{...movel.transform,dx:3}}]}],{},[],[],[movel]),1)
})
test('dois envios no mesmo segundo usam o mais recente pela precisão do Firestore',()=>{
  const r=resumirComercial([{id:'z',cliente:'c',total:10,criadoEm:{seconds:5,nanoseconds:1}},{id:'a',cliente:'c',total:20,criadoEm:{seconds:5,nanoseconds:2}}])
  assert.equal(r.total,20)
})
