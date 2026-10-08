import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {StaticRouter} from 'react-router-dom/server.js'
const require=createRequire(import.meta.url)

async function renderizar(nome,perfil,url){
  const app=nome==='App',entry=app?'../src/App.jsx':`../src/components/${nome}.jsx`
  const r=await build({entryPoints:[fileURLToPath(new URL(entry,import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external',plugins:[{name:'servicos',setup(b){
    b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'css'}))
    b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:''}))
    b.onResolve({filter:/store\/AuthContext\.jsx$/},a=>({path:a.path,namespace:'auth'}))
    b.onLoad({filter:/.*/,namespace:'auth'},()=>({contents:`export const AuthProvider=({children})=>children;export const useAuth=()=>({user:{uid:'qa',email:'qa@example.com'},perfil:${JSON.stringify(perfil)},ehAdmin:${perfil.papel==='admin'},carregando:false,sair:()=>{}});`}))
    b.onResolve({filter:/store\/NapasContext\.jsx$/},a=>({path:a.path,namespace:'napas'}))
    b.onLoad({filter:/.*/,namespace:'napas'},()=>({contents:'export const NapasProvider=({children})=>children;'}))
    b.onResolve({filter:/lib\/comercial\.js$/},a=>({path:a.path,namespace:'servico'}))
    b.onLoad({filter:/.*/,namespace:'servico'},()=>({contents:'export const executarComercial=async()=>({});'}))
    if(app){
      b.onResolve({filter:/(pages|components)\/.*\.jsx$/},a=>a.path.endsWith('/AppProducao.jsx')?null:({path:a.path,namespace:'pagina'}))
      b.onLoad({filter:/.*/,namespace:'pagina'},()=>({contents:'export default function Pagina(){return null};export const SinoNotificacoes=()=>null;export const ChatFlutuante=()=>null;export const ChatAtalho=()=>null;'}))
    }
  }}]})
  const m={exports:{}};new Function('require','module','exports',r.outputFiles[0].text)(require,m,m.exports)
  return renderToStaticMarkup(createElement(StaticRouter,{location:url},createElement(m.exports.default,app?{}:{proposta:{id:'p',manifestoProducao:{},decisaoComercial:'aprovada',ordemProducaoId:'o'}})))
}

test('admin mantém menus comerciais sem produção, equipes ou relatórios operacionais',async()=>{
  const html=await renderizar('App',{papel:'admin'},'/modelos')
  for(const path of ['/propostas','/artes','/mobiliario','/expositores','/usuarios'])assert.ok(html.includes(`href="${path}"`))
  for(const path of ['/producao','/relatorios-producao','/equipes'])assert.ok(!html.includes(`href="${path}"`))
})

test('perfis de campo veem a orientação da separação e CV recebe apenas navegação de artes',async()=>{
  const campo=await renderizar('App',{papel:'produtor'},'/app-producao')
  assert.match(campo,/A produção terá seu próprio app/)
  assert.ok(!campo.includes('Distribuir equipes'))
  const cv=await renderizar('App',{papel:'analista_cv'},'/artes')
  assert.match(cv,/Comunicação visual/);assert.ok(cv.includes('href="/artes"'))
  assert.ok(!cv.includes('href="/propostas"'));assert.ok(!cv.includes('href="/equipes"'))
})

test('aprovação comercial continua disponível sem link para a tela operacional retirada',async()=>{
  const html=await renderizar('DecisaoProposta',{papel:'admin'},'/propostas')
  assert.match(html,/Aprovação comercial/);assert.match(html,/Aprovar e liberar produção/)
  assert.match(html,/sem alterar a personalização/)
  assert.ok(!html.includes('href="/producao/'))
})
