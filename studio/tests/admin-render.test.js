import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {StaticRouter} from 'react-router-dom/server.js'
const require=createRequire(import.meta.url)
test('painel de usuários renderiza a busca, filtros e cadastro sem acessar variáveis de outras telas',async()=>{
  const r=await build({entryPoints:[fileURLToPath(new URL('../src/pages/Usuarios.jsx',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external',plugins:[{name:'isolar-servicos',setup(b){
    b.onResolve({filter:/firebase\/auth|lib\/firebase\.js|store\/AuthContext\.jsx|lib\/comercial\.js/},args=>({path:args.path,namespace:'servico'}))
    b.onLoad({filter:/.*/,namespace:'servico'},()=>({contents:`export const auth={}; export const executarComercial=async()=>({usuarios:[]}); export const sendPasswordResetEmail=async()=>{}; export const useAuth=()=>({user:{uid:'admin'}});`}))
  }}]})
  const m={exports:{}};new Function('require','module','exports',r.outputFiles[0].text)(require,m,m.exports)
  const html=renderToStaticMarkup(createElement(StaticRouter,{},createElement(m.exports.default)))
  assert.match(html,/Usuários e acessos/);assert.match(html,/Buscar usuário/);assert.match(html,/Carregando usuários/);assert.match(html,/Cadastrar expositor/)
})
