import test from 'node:test'
import assert from 'node:assert/strict'
import {gerarPDFRelatorio} from '../src/lib/exportarRelatorio.js'

test('relatório PDF abre, mantém acentos, m² e todas as linhas em várias páginas',async()=>{
  const linhas=Array.from({length:110},(_,i)=>[`Cliente Árvore ${i+1}`,'Carpete azul','40,00 m²'])
  const blob=gerarPDFRelatorio({titulo:'Quantidades de materiais e mobiliário',contexto:'Feira Brasil | Áreas líquidas | 110 estandes',colunas:['Cliente','Material','Quantidade'],linhas})
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),pdf=await pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise
  assert.ok(pdf.numPages>1)
  let texto=''
  for(let i=1;i<=pdf.numPages;i++){const p=await pdf.getPage(i);assert.ok(p.getViewport({scale:1}).width>p.getViewport({scale:1}).height);texto+=(await p.getTextContent()).items.map(t=>t.str).join(' ')}
  assert.match(texto,/Cliente Árvore 110/);assert.match(texto,/40,00 m²/);assert.equal((texto.match(/Carpete azul/g)||[]).length,110)
  await pdf.destroy()
})
