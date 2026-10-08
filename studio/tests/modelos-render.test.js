import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server.js'

const require = createRequire(import.meta.url)

async function carregarModelos(ehAdmin) {
  const resultado = await build({
    entryPoints: [fileURLToPath(new URL('../src/pages/Modelos.jsx', import.meta.url))],
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', packages: 'external',
    plugins: [{ name: 'servicos-isolados', setup(b) {
      b.onResolve({ filter: /firebase\/storage|lib\/firebase\.js|store\/AuthContext\.jsx|lib\/comercial\.js/ }, args => ({ path: args.path, namespace: 'servico' }))
      b.onLoad({ filter: /.*/, namespace: 'servico' }, () => ({ contents: `
        export const storage = {};
        export const ref = () => {};
        export const uploadBytesResumable = () => {};
        export const getDownloadURL = () => {};
        export const listarComercial = async () => [];
        export const executarComercial = async () => {};
        export const useAuth = () => ({ perfil: {}, ehAdmin: ${ehAdmin} });
      ` }))
    } }],
  })
  const modulo = { exports: {} }
  new Function('require', 'module', 'exports', resultado.outputFiles[0].text)(require, modulo, modulo.exports)
  return modulo.exports.default
}

for (const admin of [true, false]) {
  test(`lista de modelos renderiza para ${admin ? 'admin' : 'organizadora'} sem acessar estado do upload`, async () => {
    const Modelos = await carregarModelos(admin)
    const html = renderToStaticMarkup(createElement(StaticRouter, {}, createElement(Modelos)))
    assert.match(html, /Modelos de/)
    assert.match(html, /Carregando modelos/)
    assert.equal((html.match(/Franquia de arte prevista/g) || []).length, admin ? 1 : 0)
    assert.equal(html.includes('Enviar e analisar'), admin)
  })
}
