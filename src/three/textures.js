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
