import * as THREE from 'three'

// ---------------------------------------------------------------------------
//  Texturas geradas em canvas (offline, sem depender de arquivos externos).
//  Substituíveis depois pelas artes reais dos projetistas.
// ---------------------------------------------------------------------------

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  return { c, ctx: c.getContext('2d') }
}

function drawLogo(ctx, w, h, { bg = '#111318', fg = '#ffffff', accent = '#f4c20d', sub = true } = {}) {
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  // FÓRUM
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `900 ${h * 0.34}px Arial, sans-serif`
  ctx.setTransform(1, 0, -0.12, 1, 0, 0) // leve itálico
  ctx.fillText('FÓRUM', w / 2 + h * 0.05, h * 0.42)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  // barra amarela
  ctx.fillStyle = accent
  ctx.fillRect(w * 0.30, h * 0.585, w * 0.16, h * 0.05)
  // e-commerce brasil
  if (sub) {
    ctx.fillStyle = fg
    ctx.font = `700 ${h * 0.12}px Arial, sans-serif`
    ctx.fillText('e-commerce', w * 0.5, h * 0.64)
    ctx.fillStyle = accent
    ctx.fillText('  brasil', w * 0.5 + w * 0.16, h * 0.64)
  }
}

let _logo, _logoLight, _panel

// logo sobre fundo escuro (testeira / balcão)
export function logoTexture() {
  if (_logo) return _logo
  const { c, ctx } = makeCanvas(1024, 512)
  drawLogo(ctx, 1024, 512)
  _logo = new THREE.CanvasTexture(c)
  _logo.colorSpace = THREE.SRGBColorSpace
  _logo.anisotropy = 8
  return _logo
}

// versão "clara" p/ emissivo (LED / caixa iluminada)
export function logoLightTexture() {
  if (_logoLight) return _logoLight
  const { c, ctx } = makeCanvas(1024, 512)
  drawLogo(ctx, 1024, 512, { bg: '#0b0c10' })
  _logoLight = new THREE.CanvasTexture(c)
  _logoLight.colorSpace = THREE.SRGBColorSpace
  return _logoLight
}

// painel gráfico impresso (fundo escuro com plateia + texto), tipo os do stand
export function panelTexture() {
  if (_panel) return _panel
  const { c, ctx } = makeCanvas(768, 1024)
  const g = ctx.createLinearGradient(0, 0, 0, 1024)
  g.addColorStop(0, '#0a0b12')
  g.addColorStop(0.55, '#12142a')
  g.addColorStop(1, '#241b3a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 768, 1024)
  // "plateia" de pontos
  for (let i = 0; i < 1400; i++) {
    const y = 620 + Math.random() * 380
    const x = Math.random() * 768
    const s = 1 + Math.random() * 2.5
    ctx.fillStyle = `rgba(${120 + Math.random() * 120 | 0},${120 + Math.random() * 120 | 0},255,${0.15 + Math.random() * 0.5})`
    ctx.fillRect(x, y, s, s)
  }
  // logo topo
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.font = '900 120px Arial'
  ctx.fillText('FÓRUM', 384, 300)
  ctx.fillStyle = '#f4c20d'
  ctx.fillRect(300, 340, 170, 22)
  ctx.fillStyle = '#fff'
  ctx.font = '700 42px Arial'
  ctx.fillText('e-commerce brasil', 384, 410)
  _panel = new THREE.CanvasTexture(c)
  _panel.colorSpace = THREE.SRGBColorSpace
  _panel.anisotropy = 8
  return _panel
}

// ---- Lonas padrão (protótipo) — substituíveis pela arte enviada pelo cliente
const _lonas = {}
export const LONAS_PADRAO = [
  { id: 'lona-marca', nome: 'Sua marca (padrão)' },
  { id: 'lona-promo', nome: 'Campanha / promo' },
  { id: 'lona-clean', nome: 'Clean claro' },
]
export function lonaPadraoTexture(id) {
  if (_lonas[id]) return _lonas[id]
  const { c, ctx } = makeCanvas(900, 1100)
  if (id === 'lona-clean') {
    ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, 900, 1100)
    ctx.fillStyle = '#1a1a1a'; ctx.textAlign = 'center'
    ctx.font = '900 150px Arial'; ctx.fillText('SUA', 450, 480)
    ctx.fillText('MARCA', 450, 640)
    ctx.fillStyle = '#f4c20d'; ctx.fillRect(320, 700, 260, 26)
  } else if (id === 'lona-promo') {
    const g = ctx.createLinearGradient(0, 0, 900, 1100)
    g.addColorStop(0, '#7a1030'); g.addColorStop(1, '#c026d3')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 1100)
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'
    ctx.font = '900 190px Arial'; ctx.fillText('-30%', 450, 520)
    ctx.font = '700 70px Arial'; ctx.fillText('novidades na feira', 450, 640)
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 1100)
    g.addColorStop(0, '#101425'); g.addColorStop(1, '#241b3a')
    ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 1100)
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'
    ctx.font = '900 150px Arial'; ctx.fillText('SUA MARCA', 450, 470)
    ctx.fillStyle = '#f4c20d'; ctx.fillRect(300, 540, 300, 26)
    ctx.fillStyle = '#cfd4e0'; ctx.font = '600 52px Arial'
    ctx.fillText('aqui no Fórum E-commerce', 450, 660)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  _lonas[id] = t
  return t
}

// TESTEIRA: logo FÓRUM (esquerda) + painel de tela perfurada / mesh (direita)
let _testeira
export function testeiraTexture() {
  if (_testeira) return _testeira
  const W = 2048, H = 512
  const { c, ctx } = makeCanvas(W, H)
  ctx.fillStyle = '#0e0f13'; ctx.fillRect(0, 0, W, H)
  // painel de mesh à direita (~38%)
  const mx = W * 0.62
  ctx.fillStyle = '#15161b'; ctx.fillRect(mx, 0, W - mx, H)
  ctx.fillStyle = 'rgba(220,225,235,0.45)'
  const step = 16
  for (let x = mx + 8; x < W - 6; x += step)
    for (let y = 8; y < H - 6; y += step)
      ctx.fillRect(x, y, 7, 7)
  // logo FÓRUM centralizado na porção preta esquerda
  const cx = mx * 0.5
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = `900 ${H * 0.42}px Arial, sans-serif`
  ctx.setTransform(1, 0, -0.12, 1, 0, 0)
  ctx.fillText('FÓRUM', cx + H * 0.06, H * 0.42)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#f4c20d'; ctx.fillRect(cx - W * 0.06, H * 0.60, W * 0.06, H * 0.055)
  ctx.fillStyle = '#fff'; ctx.font = `700 ${H * 0.13}px Arial`
  ctx.fillText('e-commerce', cx, H * 0.68)
  ctx.fillStyle = '#f4c20d'; ctx.fillText('     brasil', cx + W * 0.03, H * 0.68)
  _testeira = new THREE.CanvasTexture(c)
  _testeira.colorSpace = THREE.SRGBColorSpace; _testeira.anisotropy = 8
  return _testeira
}

// textura a partir de uma imagem enviada (data URL)
export function textureFromURL(url) {
  const t = new THREE.TextureLoader().load(url)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
