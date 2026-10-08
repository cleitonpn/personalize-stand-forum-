import test from 'node:test'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {resumoArtes,estadosProposta,filtrarPropostas,propostasValidas,linhasQuantidades,agruparQuantidades,agruparFinanceiro,financeiro,recebimentosHistoricos,csv} from '../functions/relatorios.mjs'
import {levantarQuantidades} from '../src/lib/quantitativos.js'
const {manifesto}=createRequire(import.meta.url)('../functions/manifestoProposta.js')
const base={id:'p',cliente:'c',clienteNome:'Empresa Árvore',feira:'Feira Brasil',feiraId:'f',organizadoraId:'o',organizadoraNome:'Organizadora USET',total:100,criadoEm:{_seconds:10},estadoProducao:'liberada',decisaoComercial:'aprovada'}
test('status de artes mistas não vira todas aprovadas; busca acentos combina com comercial e arte',()=>{
  const p={...base,resumoArtes:resumoArtes([{status:'aguardando'},{status:'impressa'}])}
  assert.ok(estadosProposta(p).includes('arte_aguardando'));assert.ok(!estadosProposta(p).includes('todas_artes_aprovadas'))
  assert.equal(filtrarPropostas([p],{busca:'arvore uset',feira:'f',status:['liberada','arte_aguardando']}).length,1)
  assert.equal(filtrarPropostas([p],{organizadora:'outra'}).length,0)
  assert.equal(resumoArtes([{status:'aprovada'},{status:'recebida'}]).contagens.recebida,1)
})
test('uma versão ativa por cliente/feira, substituídas e retiradas não geram carpete',()=>{
  const velha={...base,id:'velha',estadoProducao:'substituida'},rascunho={...base,id:'nova',criadoEm:{seconds:20},estadoProducao:null},excluida={...base,id:'excluida',estadoProducao:'excluida'}
  assert.deepEqual(propostasValidas([velha,rascunho,base,excluida]).map(p=>p.id),['p'])
  assert.deepEqual(propostasValidas([velha,rascunho,base,excluida],'todas').map(p=>p.id),['p'])
  assert.equal(propostasValidas([{...rascunho,cliente:'outro'},base],'todas').length,2)
})
test('relatório soma carpete padrão e personalizado, franquia não reduz metragem de arte e móveis retirados saem',()=>{
  const p={...base,manifestoProducao:{materiais:[{id:'piso',papel:'piso',nome:'Piso padrão',origem:'incluido',quantitativo:{categoria:'Carpete',material:'Carpete',cor:'Azul',areaM2:40},acabamento:{}},{id:'parede',papel:'bagum',nome:'Parede',origem:'incluido',quantitativo:{categoria:'Bagum',material:'Bagum',cor:'Branco',areaM2:9},acabamento:{}},{id:'saiu',papel:'piso',origem:'substituido',quantitativo:{areaM2:50}}],areasArte:[{id:'parede',superficieIds:['parede'],nome:'Arte parede',larguraCm:300,alturaCm:300,confirmada:true}],moveis:[{nome:'Bistrô com 3 banquetas',quantidade:1,origem:'incluido'},{nome:'Balcão retirado',quantidade:1,origem:'retirado'}],extras:[{nome:'Sofá',tipo:'mobiliario',quantidade:2}],eletrica:{pontos:[{id:'e'}]}}}
  const linhas=linhasQuantidades(p);assert.equal(linhas.find(l=>l.categoria==='Carpete').quantidade,40);assert.equal(linhas.find(l=>l.categoria==='Arte').quantidade,9);assert.equal(linhas.filter(l=>l.categoria==='Mobiliário').length,2)
  const p2=structuredClone(p);p2.id='p2';p2.manifestoProducao.materiais[0].quantitativo.areaM2=45
  assert.equal(agruparQuantidades([...linhas,...linhasQuantidades(p2)]).find(g=>g.categoria==='Carpete').quantidade,85)
})
test('sem metragem gera pendência explícita; logo sem gabarito conta unidade e base de móvel não gera bagum',()=>{
  const p={...base,manifestoProducao:{materiais:[{id:'logo',origem:'incluido',nome:'Logo',papel:'adesivo'},{id:'movel',origem:'incluido',papel:'bagum',tipo:'movel'}],areasArte:[{id:'logo',semGabarito:true}],moveis:[],extras:[]}}
  const ls=linhasQuantidades(p);assert.equal(ls.find(l=>l.categoria==='Logo').quantidade,1);assert.ok(!ls.some(l=>l.categoria==='Bagum'));assert.equal(agruparQuantidades(ls).find(g=>g.categoria==='Adesivo').pendencias,1)
})
test('quantificação da impressão usa o gabarito atual confirmado, sem reaproveitar medidas antigas',()=>{
  const p={...base,resumoArtes:resumoArtes([{id:'parede',status:'recebida',confirmada:true,larguraCm:400,alturaCm:250}]),manifestoProducao:{materiais:[{id:'parede',origem:'incluido'}],areasArte:[{id:'parede',nome:'Parede',confirmada:true,larguraCm:300,alturaCm:250}]}}
  assert.equal(linhasQuantidades(p).find(l=>l.categoria==='Arte').quantidade,10)
  p.resumoArtes.areas[0].confirmada=false;assert.equal(linhasQuantidades(p).find(l=>l.categoria==='Arte').quantidade,null)
})
test('napa escolhida substitui a categoria de madeira e preserva nome/código da cor',()=>{
  const p={...base,manifestoProducao:{materiais:[{id:'s',origem:'incluido',papel:'madeira',nome:'Parede',quantitativo:{categoria:'Madeira',areaM2:9,material:'Madeira original',cor:'Natural'},acabamento:{alterado:true,materialId:'napa-cb1',nome:'Azul Céu',codigo:'CB1',cor:'#0000ff'}}]}}
  const l=linhasQuantidades(p)[0];assert.equal(l.categoria,'Napa');assert.equal(l.cor,'Azul Céu');assert.equal(l.codigo,'CB1')
})
test('arte substitui o bagum, mas o admin pode especificar base necessária sob a impressão',()=>{
  const p={...base,manifestoProducao:{materiais:[{id:'parede',papel:'bagum',origem:'incluido',arte:true,quantitativo:{categoria:'Bagum',areaM2:9}}],areasArte:[{id:'parede',confirmada:true,larguraCm:300,alturaCm:300}]}}
  assert.deepEqual(linhasQuantidades(p).map(l=>l.categoria),['Arte'])
  p.manifestoProducao.materiais[0].quantitativo.manterSobArte=true
  assert.deepEqual(linhasQuantidades(p).map(l=>l.categoria),['Bagum','Arte'])
})
test('financeiro distingue proposto, aprovado e recebido e preserva recebimento de proposta retirada',()=>{
  assert.deepEqual(financeiro(base),{proposto:100,aprovado:100,recebido:0})
  const pago={...base,pagamento:{status:'paga',valorCentavos:8000}}
  assert.deepEqual(financeiro(pago),{proposto:100,aprovado:80,recebido:80})
  assert.equal(financeiro({...pago,estadoProducao:'excluida'}).recebido,80)
  const historico={...pago,estadoProducao:'substituida',historicoFinanceiro:true}
  const grupo=agruparFinanceiro([base,historico],'cliente')[0]
  assert.deepEqual(recebimentosHistoricos([base,{...historico,id:'antiga'}]).map(p=>p.id),['antiga'])
  assert.equal(grupo.propostas,1);assert.equal(grupo.proposto,100);assert.equal(grupo.recebido,80)
  assert.equal(agruparFinanceiro([base,{...base,cliente:'outra',clienteNome:'Outra empresa'}],'feira')[0].aprovado,200)
})
test('quantidades são congeladas no manifesto; deduplica geometria, ignora suportes de móveis e mantém ajuste manual',()=>{
  const superficies=[{id:'piso',nome:'Carpete',papel:'piso',pecas:['p']},{id:'suporte',nome:'Ferro',papel:'bagum',pecas:['m']}],pecas=[{chave:'p',materialCor:'#0000ff',bbox:{largura:8,altura:.01,profundidade:5,centro:[0,0,0]}},{chave:'p',bbox:{largura:8,altura:.01,profundidade:5,centro:[0,0,0]}},{chave:'m',bbox:{largura:1,altura:.1,profundidade:1,centro:[0,0,0]}}]
  const q=levantarQuantidades(superficies,{pecas},null,{},[{pecas:['m']}]);assert.equal(q.piso.areaM2,40);assert.equal(q.suporte.categoria,'Ignorar')
  const manual=levantarQuantidades(superficies,{pecas},null,{piso:{...q.piso,manual:true,areaM2:39,cor:'Azul'}});assert.equal(manual.piso.areaM2,39)
  const m=manifesto({superficies,quantitativos:q},{});assert.equal(m.materiais[0].quantitativo.areaM2,40)
})
test('CSV mantém acentos, escapa campos e impede fórmulas de nomes de clientes',()=>{
  const out=csv(['Cliente','Quantidade'],[['=HYPERLINK("evil")',3],['Árvore; Azul',40]])
  assert.ok(out.startsWith('\ufeff'));assert.match(out,/"'=HYPERLINK/);assert.match(out,/"Árvore; Azul"/)
})
