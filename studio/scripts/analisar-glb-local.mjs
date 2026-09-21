import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { analisar } from '../src/lib/glb/analyze.js';
import { superficiesPadrao } from '../src/lib/glb/superficies.js';
import { detectarObjetos,numerar } from '../src/lib/glb/objetos.js';
import { organizarElementos,listarElementos } from '../src/lib/glb/elementos.js';
// Verificação geométrica local. Texturas são verificadas na prévia do navegador.
// Uso: node scripts/analisar-glb-local.mjs "caminho/arquivo.glb"
if (!process.argv.slice(2).length) { console.error('Informe um ou mais arquivos GLB locais.'); process.exit(1) }
globalThis.self=globalThis;
for(const path of process.argv.slice(2)) {
 const b=fs.readFileSync(path);const loader=new GLTFLoader();loader.register(parser=>{parser.loadTexture=async()=>null;return {name:'geometry-test'};});
 const {scene}=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
 const t=performance.now(),a=analisar(scene),p=Object.fromEntries(a.materiais.map(m=>[m.nome,m.papelSugerido])),s=superficiesPadrao(a,p),o=numerar(detectarObjetos(a,p,{superficies:s})),ss=organizarElementos(a,s,o),els=listarElementos(ss,o,a);
 console.log(JSON.stringify({path,pecas:a.pecas.length,materiais:a.materiais.length,objetos:o.length,elementos:els.length,tipos:Object.fromEntries(['parede','piso','movel','estrutura'].map(t=>[t,els.filter(e=>e.tipo===t).length])),testeiras:els.filter(e=>e.nome.startsWith('Testeira')).map(e=>({nome:e.nome,camadas:e.superficies.map(s=>({papel:s.papel,podeCor:s.podeCor,podeArte:s.podeArte,pecas:s.pecas.length}))}))},null,2));
}
