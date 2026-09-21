import fs from 'node:fs'
import assert from 'node:assert/strict'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { analisar } from '../src/lib/glb/analyze.js'
import { superficiesPadrao } from '../src/lib/glb/superficies.js'
import { detectarObjetos, numerar } from '../src/lib/glb/objetos.js'
import { organizarElementos, listarElementos } from '../src/lib/glb/elementos.js'
import { aplicarGrupos, sugerirPartes, chavesDoElemento } from '../src/lib/glb/agrupamento.js'

// Regressão do ECBR fornecido pelo usuário. Não envia arquivos nem carrega texturas.
// Uso: node scripts/validar-ecbr-local.mjs "caminho/ECBR 45M².glb"
if (!process.argv[2]) throw new Error('Informe o caminho local do ECBR 45M².glb.')
globalThis.self = globalThis
const b = fs.readFileSync(process.argv[2]), loader = new GLTFLoader()
loader.register(parser => { parser.loadTexture = async () => null; return {name:'geometry-test'} })
const {scene} = await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')
const analise = analisar(scene), papeis = Object.fromEntries(analise.materiais.map(m => [m.nome,m.papelSugerido]))
const base = superficiesPadrao(analise,papeis), objetos = numerar(detectarObjetos(analise,papeis,{superficies:base}))
const superficies = organizarElementos(analise,base,objetos), dados = {analise,superficies,objetos}
const lista = listarElementos(superficies,objetos,analise)
const balcao = lista.find(e => e.nome === 'Balcão')
assert.ok(balcao)
assert.equal(new Set(chavesDoElemento(balcao)).size,2)
const banquetas = lista.filter(e => e.objetos.some(o => analise.pecas.some(p => o.pecas.includes(p.chave) && /banqueta/i.test(p.nomeComponente))))
assert.equal(banquetas.length,8)
assert.ok(banquetas.every(e => !chavesDoElemento(e).some(k => chavesDoElemento(balcao).includes(k))))
const paineis = analise.pecas.filter(p => p.bbox.min[2] < -4.38 && p.bbox.max[2] < -4.3 && p.bbox.max[0]-p.bbox.min[0] > 2.8 && p.bbox.max[1]-p.bbox.min[1] > 2.8)
assert.equal(paineis.length,3)
assert.equal(new Set(paineis.map(p => lista.find(e => chavesDoElemento(e).includes(p.chave))?.id)).size,3)
const logo = lista.find(e => e.tipo === 'logo')
assert.ok(logo && logo.superficies.every(s => s.podeCor && s.podeArte && s.podeRemover))
assert.equal(logo.objetos.length,0)
const junto = aplicarGrupos({...dados,grupos:[{nome:'Conjunto de teste',tipo:'movel',chaves:[...chavesDoElemento(balcao),...chavesDoElemento(banquetas[0])]}]})
const elemento = listarElementos(junto.superficies,junto.objetos,analise).find(e => e.nome === 'Conjunto de teste')
assert.ok(elemento.objetos.every(o => o.podeMover))
const partes = sugerirPartes(elemento,junto.superficies,analise)
assert.equal(partes.length,2)
const separado = aplicarGrupos({...dados,...junto,grupos:partes})
assert.equal(listarElementos(separado.superficies,separado.objetos,analise).length,lista.length)
console.log('ECBR validado: balcão independente, 8 banquetas independentes, 3 painéis de fundo, logo editável/removível e união/separação reversível.')
