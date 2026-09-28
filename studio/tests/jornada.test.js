import test from 'node:test'
import assert from 'node:assert/strict'
import { etapaGrupo, pertenceEtapa, resumoEtapa, resolverConflitos } from '../src/lib/jornada.js'
import { transformarMovelAdicionado } from '../src/lib/glb/mobiliario.js'
import { aplicarMudanca } from '../src/lib/useHistorico.js'
import { gerarPropostaHTML } from '../src/lib/proposta.js'
import { comporArte } from '../src/lib/glb/arte.js'

const elementos=[{id:'parede',nome:'Parede central',tipo:'parede',superficies:[{id:'p',podeArte:true}],objetos:[]}]
const opc=(id,esconde=[],incompativeis=[])=>({id,nome:id,arquivo:{url:`${id}.glb`},esconde,incompativeis})
const grupos=[{id:'sala',nome:'Sala de reunião',opcoes:[opc('s',['p'],['l'])]},{id:'led',nome:'Painel de LED',opcoes:[opc('l',['p'])]}]

test('etapas respeitam a categoria definida pelo admin e separam piso de marca',()=>{
  assert.equal(etapaGrupo(grupos[0]),'ambientes')
  assert.equal(etapaGrupo(grupos[1]),'marca')
  assert.equal(etapaGrupo({...grupos[0],etapa:'complementos'}),'complementos')
  assert.equal(pertenceEtapa({tipo:'piso',superficies:[{podeArte:true}]},'marca'),false)
})
test('visitar não conclui etapa; manter é explícito e arte pendente não vira concluída',()=>{
  assert.equal(resumoEtapa('marca',elementos,[],{},{}).status,'A escolher')
  assert.equal(resumoEtapa('marca',elementos,[],{_etapas:{marca:true}},{}).status,'Mantido')
  assert.equal(resumoEtapa('marca',elementos,[],{_etapas:{marca:true}},{p:{artePendente:true}}).status,'Pendente')
  assert.equal(resumoEtapa('marca',elementos,[],{},{p:{artePendente:false,arte:'logo.png'}}).status,'Personalizado')
})
test('pendência de uma parede substituída sai da revisão e volta ao restaurar',()=>{
  const acabamentos={p:{artePendente:true}}
  assert.equal(resumoEtapa('marca',elementos,grupos,{sala:'s'},acabamentos).pendencias.length,0)
  assert.equal(resumoEtapa('marca',elementos,grupos,{sala:null},acabamentos).pendencias.length,1)
})
test('nova opção resolve incompatibilidade nos dois sentidos sem alterar estado anterior',()=>{
  const anterior={sala:'s'},proximo={sala:'s',led:'l'}
  const r=resolverConflitos(grupos,anterior,proximo)
  assert.deepEqual(r.escolhas,{sala:null,led:'l'})
  assert.equal(r.retiradas[0].nome,'s')
  assert.deepEqual(anterior,{sala:'s'})
  const volta=resolverConflitos(grupos,{led:'l'},{led:'l',sala:'s'})
  assert.equal(volta.escolhas.led,null)
})
test('remoção de incompatível preserva outras unidades do catálogo',()=>{
  const catalogo={id:'moveis',tipo:'mobiliario',nome:'Móveis',opcoes:[opc('mesa'),opc('cadeira')]}
  const novosGrupos=[{...grupos[0],opcoes:[opc('s',[],['mesa'])]},catalogo]
  const antes={moveis:{itens:[{id:'1',opcaoId:'mesa'},{id:'2',opcaoId:'cadeira'}]}}
  const r=resolverConflitos(novosGrupos,antes,{...antes,sala:'s'})
  assert.deepEqual(r.escolhas.moveis.itens,[{id:'2',opcaoId:'cadeira'}])
})
test('arrasto altera somente a instância selecionada e um gesto gera um desfazer',()=>{
  const op={...opc('banqueta'),bbox:{centro:[0,.5,0],largura:1,altura:1,profundidade:1},offset:[0,0,0]}
  const gs=[{id:'c',tipo:'mobiliario',opcoes:[op]}]
  const inicial={c:{itens:[{id:'1',opcaoId:'banqueta',offset:[0,0,0]},{id:'2',opcaoId:'banqueta',offset:[2,0,0]}]}}
  let h={atual:{escolhas:inicial},antes:[],depois:[]}
  for(let i=1;i<=50;i++) h=aplicarMudanca(h,'escolhas',es=>transformarMovelAdicionado(gs,es,'c:1',{offset:[i/50,0,1]},null),'gesto-1')
  assert.equal(h.antes.length,1)
  assert.deepEqual(h.antes[0].escolhas,inicial)
  assert.deepEqual(h.atual.escolhas.c.itens[0].offset,[1,0,1])
  assert.deepEqual(h.atual.escolhas.c.itens[1],inicial.c.itens[1])
  h=aplicarMudanca(h,'escolhas',es=>transformarMovelAdicionado(gs,es,'c:1',{rotY:1},null),'gesto-2')
  assert.equal(h.antes.length,2)
})
test('PDF registra pendências mesmo sem nenhum adicional e escapa texto',()=>{
  const html=gerarPropostaHTML({cliente:'Teste',itens:[],total:0,pendenciasArte:['Parede <frente>']})
  assert.ok(html.includes('Parede &lt;frente&gt; — arte a enviar'))
})
test('enquadramento preserva proporção, permite preencher e reposicionar sem esticar',()=>{
  const antigo=globalThis.document, desenhos=[]
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(...args){desenhos.push(args)}})})}
  try {
    const imagem={width:100,height:100}
    comporArte(imagem,2,'#fff',{modo:'conter'})
    assert.deepEqual(desenhos[0].slice(1),[512,0,1024,1024])
    comporArte(imagem,2,'#fff',{modo:'cobrir',x:0,y:1})
    assert.deepEqual(desenhos[1].slice(1),[0,-1024,2048,2048])
  }finally{globalThis.document=antigo}
})
