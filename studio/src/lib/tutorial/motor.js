/* ============================================================================
   Tutorial animado do expositor — o motor.
   Desenha uma réplica da tela do Studio (estande + painel da jornada) e um
   cursor que demonstra cada ação. Quem chama informa o passo e o tempo local
   do passo; o motor só desenha. As mudanças no estande se acumulam: no passo 3
   a parede já está com a cor escolhida no passo 2.

   Duas composições: paisagem (1280 × 720) e retrato (720 × 900, celular).
   ========================================================================== */
import { LOGO_VIEWBOX, LOGO_PARTES } from '../showreel/logo.js'
import { clamp, seg, eo, ei, eio, eback, mix, shade } from '../movimento.js'

/* duração de cada passo, em segundos — depois disso o passo fica parado no quadro final */
export const DURACOES = [5.6, 7.2, 7.4, 6.4, 6.2]
const INICIO = DURACOES.reduce((a, d, i) => [...a, i ? a[i - 1] + DURACOES[i - 1] : 0], [])

const LAYOUTS = {
  land: { nome: 'land', W: 1280, H: 720, TX: 270, TY: 244, ss: 1 },
  port: { nome: 'port', W: 720, H: 900, TX: 269, TY: 142, ss: .7 },
}

/* ---------------------------------------------------------------------------
   Estande isométrico (o mesmo 10,00 × 4,00 m do showreel)
   ------------------------------------------------------------------------- */
const S = 50, C = Math.cos(Math.PI / 6)
const P = (x, y, z) => [(x - y) * C * S, (x + y) * .5 * S - z * S]
const pts = a => a.map(p => P(...p).map(v => v.toFixed(1)).join(',')).join(' ')
const NS = 'http://www.w3.org/2000/svg'

/* momentos (no tempo global do tutorial) em que cada escolha acontece */
const T_PAREDE = INICIO[1] + 2.5, T_ARTE = INICIO[1] + 4.4
const T_PISO = INICIO[2] + 1.35, T_MOVE = [INICIO[2] + 3.4, INICIO[2] + 4.8]
const T_LED = INICIO[3] + 1.3, T_PINO = INICIO[3] + 3.1
const moveDx = T => 1.6 * eio(seg(T, T_MOVE[0], T_MOVE[1]))

const PECAS = [
  { b: [0, 10, 0, 4, 0, .1], cor: T => mix('#7a7f83', '#3f6a55', eio(seg(T, T_PISO, T_PISO + .4))) },
  { b: [0, 10, 0, .15, .1, 3], cor: T => mix('#ecebe4', '#193b33', eio(seg(T, T_PAREDE, T_PAREDE + .4))) },
  { b: [0, .15, .15, 4, .1, 3], cor: () => '#e4e3db' },
  { b: [2.2, 6.2, .15, .21, 1.05, 2.5], cor: T => mix('#dcdfd4', '#d2ee80', eio(seg(T, T_ARTE, T_ARTE + .4))), arte: 1 },
  { b: [1.8, 6.6, .15, .24, 2.62, 2.9], cor: T => mix('#c9ccc2', '#f2fdff', eio(seg(T, T_LED, T_LED + .3))), led: 1 },
  { b: [.45, .95, .5, 1.0, .1, .55], cor: () => '#3a3f44' },
  { bola: [.62, .72, 1.0, .42], cor: () => '#6f9a52' },
  { bola: [.8, .95, 1.35, .36], cor: () => '#7fae5e' },
  { b: [7.6, 10, .15, 1.7, .1, 2.6], cor: () => '#cdb08e' },
  { b: [3.7, 4.15, 2.05, 2.5, .1, .5], move: 1, cor: () => '#2f3a37' },
  { b: [3.7, 3.76, 2.05, 2.5, .5, .98], move: 1, cor: () => '#2f3a37' },
  { b: [4.72, 4.88, 2.22, 2.38, .1, .78], move: 1, cor: () => '#2b2f33' },
  { b: [4.35, 5.25, 1.85, 2.75, .78, .85], move: 1, cor: () => '#fbfaf6' },
  { b: [5.45, 5.9, 2.05, 2.5, .1, .5], move: 1, cor: () => '#2f3a37' },
  { b: [5.84, 5.9, 2.05, 2.5, .5, .98], move: 1, cor: () => '#2f3a37' },
  { b: [1.0, 3.0, 2.9, 3.5, .1, 1.1], cor: () => '#cdb08e' },
  { b: [1.08, 2.92, 3.5, 3.53, .22, .98], cor: () => '#dcdfd4' },
]
/* marcadores numerados da etapa "Sua marca", como na tela real */
const MARCADORES = [[8.2, .2, 2.4], [4.2, .2, 2.0], [2.0, 3.55, .7]]
const PONTO_ELETRICO = [7.0, 3.1, .1]

const swatches = cores => `<div class="tt-sws">${cores.map(c => `<span style="background:${c}"></span>`).join('')}</div>`

const MARCACAO = () => `
<div class="tt-stage">
  <div class="tt-top">
    <div class="tt-marca"><svg viewBox="${LOGO_VIEWBOX}" aria-hidden="true">${[LOGO_PARTES.anel, LOGO_PARTES.haste, LOGO_PARTES.s, LOGO_PARTES.e, LOGO_PARTES.t].map(d => `<path d="${d}"/>`).join('')}</svg><span>STUDIO</span></div>
    <div class="tt-acoes"><span class="tt-desfazer">↶ Desfazer</span><span>↷ Refazer</span></div>
    <div class="tt-total"><small>Total adicional</small><b>atualiza a cada escolha</b></div>
  </div>
  <div class="tt-cena">
    <div class="tt-vistas"><span class="tt-chip tt-sel">Visão geral</span><span class="tt-chip">De frente</span><span class="tt-chip">Por dentro</span><span class="tt-chip">De cima</span></div>
    <svg class="tt-svg">
      <defs><filter id="tt-brilho" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter></defs>
      <g class="tt-wrap">
        <ellipse class="tt-sombra" rx="380" ry="100" fill="#193b33" opacity=".12"/>
        <g class="tt-inner"></g>
        <polygon class="tt-ledglow" fill="#bff6ff" filter="url(#tt-brilho)" opacity="0"/>
        <ellipse class="tt-gizmo" fill="none" stroke="#37644b" stroke-width="3" stroke-dasharray="9 7" opacity="0"/>
        <g class="tt-marcadores"></g>
        <g class="tt-pino" opacity="0"><ellipse rx="16" ry="7" fill="#193b33" opacity=".25"/><g class="tt-pinocorpo"><path d="M0 0 C-14 -18 -20 -28 -20 -38 A20 20 0 1 1 20 -38 C20 -28 14 -18 0 0Z" fill="#193b33"/><path d="M3 -52 L-7 -36 L0 -36 L-3 -24 L8 -41 L1 -41 Z" fill="#d2ee80"/></g></g>
      </g>
    </svg>
    <span class="tt-chip tt-ajuda">? Como funciona</span>
  </div>
  <div class="tt-painel"><div class="tt-painel-in">
    <div class="tt-modo"><span class="tt-on">Passo a passo</span><span>Explorar livremente</span></div>
    <div class="tt-prog">${'<span></span>'.repeat(7)}</div>
    <small class="tt-etapa">Etapa 1 de 7</small>
    <div class="tt-blocos">
      <div class="tt-bloco" data-b="0">
        <h3>Seu estande já tem um ponto de partida</h3>
        <p>Confira o que já está incluído. Você só escolhe o que quer mudar.</p>
        <div class="tt-incluido"><strong>✓ Já incluído no projeto</strong><ul><li>Paredes e piso</li><li>Balcão de atendimento</li><li>Mesa e duas cadeiras</li><li>Depósito com porta</li></ul></div>
        <div class="tt-btn tt-prim tt-b0-ir">Ir para Sua marca →</div>
      </div>
      <div class="tt-bloco" data-b="1">
        <h3>Onde você quer destacar sua empresa?</h3>
        <div class="tt-cartao tt-b1-c1"><b class="tt-num">1</b><div><strong>Parede do fundo</strong><small>Cor da cartela ou imagem</small></div></div>
        <div class="tt-expande tt-b1-sw">${swatches(['#ecebe4', '#cfdbe6', '#e9cdb9', '#193b33', '#c9a27a', '#6f9a52'])}</div>
        <div class="tt-cartao tt-b1-c2"><b class="tt-num">2</b><div><strong>Lona central</strong><small>Envie a arte da sua marca</small></div><span class="tt-btn tt-mini tt-b1-up">Enviar imagem</span></div>
        <div class="tt-cartao"><b class="tt-num">3</b><div><strong>Frente do balcão</strong><small>Cor ou adesivo</small></div></div>
      </div>
      <div class="tt-bloco" data-b="2">
        <h3>Piso e mobiliário</h3>
        <div class="tt-cartao tt-col"><div><strong>Piso</strong><small>Compare as cores no estande</small></div>${swatches(['#7a7f83', '#3f6a55', '#b9b2a3', '#2e3135', '#8a6f55'])}</div>
        <div class="tt-cartao"><div><strong>Mesa e cadeiras</strong><small>Liberado para mover e girar</small></div><span class="tt-btn tt-mini tt-b2-ajustar">Ajustar posição</span></div>
        <p class="tt-dica">Arraste a peça no estande. Se não gostar, <b>Desfazer</b> volta um passo.</p>
      </div>
      <div class="tt-bloco" data-b="3">
        <h3>Complementos e elétrica</h3>
        <div class="tt-cartao"><div><strong>Painel de LED na testeira</strong><small>Item extra deste projeto</small></div><span class="tt-sw tt-b3-sw"><i></i></span></div>
        <div class="tt-cartao tt-col"><div><strong>Pontos elétricos</strong><small>Toque no piso onde precisa de energia</small></div><div class="tt-ponto"><i>⚡</i>Ponto 1 · 220 V <em>valor exibido antes de confirmar</em></div></div>
      </div>
      <div class="tt-bloco" data-b="4">
        <h3>Confira como ficou seu estande</h3>
        <ul class="tt-revisao"><li>Parede do fundo · verde</li><li>Lona central · sua arte</li><li>Piso · verde musgo</li><li>Mesa e cadeiras · nova posição</li><li>Painel de LED · incluído</li><li>1 ponto elétrico</li></ul>
        <div class="tt-btn tt-prim tt-b4-enviar">Enviar escolhas para a USET</div>
      </div>
    </div>
  </div></div>
  <div class="tt-toast"><b>✓</b><div><strong>Escolhas enviadas à USET</strong><small>Baixe a proposta em PDF quando quiser</small></div></div>
  <span class="tt-onda"></span>
  <svg class="tt-cursor" viewBox="0 0 44 44"><path d="M8 4 L8 34 L16 26 L22 39 L27 37 L21 24 L32 24 Z" fill="#fffef9" stroke="#193b33" stroke-width="2.4" stroke-linejoin="round"/></svg>
</div>`

/* etapa da jornada (1 a 7) que cada passo do tutorial representa */
const ETAPA_DO_PASSO = [[0, 0], [1, 1], [2, 3], [4, 5], [6, 6]]

export function montarTutorial(root) {
  root.classList.add('tt')
  root.innerHTML = MARCACAO()
  const q = n => root.querySelector('.tt-' + n)
  const qa = n => [...root.querySelectorAll('.tt-' + n)]
  const stage = q('stage')
  const blocos = [...root.querySelectorAll('.tt-bloco')]

  /* estande */
  const inner = q('inner'), els = []
  for (const p of PECAS) {
    const e = { ...p, polys: [] }
    if (p.b) for (const k of ['top', 'right', 'left']) { const el = document.createElementNS(NS, 'polygon'); el.setAttribute('stroke', '#193b33'); el.setAttribute('stroke-opacity', '.18'); el.setAttribute('stroke-linejoin', 'round'); inner.appendChild(el); e[k] = el }
    else {
      const c = document.createElementNS(NS, 'circle'), [x, y, z, r] = p.bola, [cx, cy] = P(x, y, z)
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r * S); inner.appendChild(c); e.circ = c
    }
    if (p.arte) {
      const [ox, oy] = P(2.2, .21, 2.5), g = document.createElementNS(NS, 'g')
      g.setAttribute('transform', `matrix(${C},.5,0,1,${ox},${oy})`)
      g.innerHTML = `<circle cx="${.62 * S}" cy="${.72 * S}" r="${.34 * S}" fill="#193b33"/><path d="M${.5 * S} ${.72 * S} l${.1 * S} ${.1 * S} l${.16 * S} -${.2 * S}" stroke="#d2ee80" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="${1.12 * S}" y="${.66 * S}" font-family="Sora,sans-serif" font-weight="800" font-size="${.34 * S}" letter-spacing="-1" fill="#193b33">SUA MARCA</text><text x="${1.14 * S}" y="${1.0 * S}" font-family="Inter,sans-serif" font-weight="600" font-size="${.14 * S}" letter-spacing="2" fill="#37644b">SEU LOGO AQUI</text>`
      inner.appendChild(g); e.arteEl = g
    }
    els.push(e)
  }
  const colocar = (e, dx) => {
    const [x0, x1, y0, y1, z0, z1] = e.b, X0 = x0 + dx, X1 = x1 + dx
    e.top.setAttribute('points', pts([[X0, y0, z1], [X1, y0, z1], [X1, y1, z1], [X0, y1, z1]]))
    e.right.setAttribute('points', pts([[X1, y0, z0], [X1, y1, z0], [X1, y1, z1], [X1, y0, z1]]))
    e.left.setAttribute('points', pts([[X0, y1, z0], [X1, y1, z0], [X1, y1, z1], [X0, y1, z1]]))
  }
  els.forEach(e => e.b && colocar(e, 0))
  { const [sx, sy] = P(5, 2, 0); const s = q('sombra'); s.setAttribute('cx', sx); s.setAttribute('cy', sy + 30) }
  { const led = els.find(e => e.led); q('ledglow').setAttribute('points', pts([[1.8, .24, 2.62], [6.6, .24, 2.62], [6.6, .24, 2.9], [1.8, .24, 2.9]])); led.glow = q('ledglow') }
  q('marcadores').innerHTML = MARCADORES.map(([x, y, z], i) => { const [mx, my] = P(x, y, z); return `<g transform="translate(${mx} ${my})"><circle r="15" fill="#193b33" stroke="#d2ee80" stroke-width="2.5"/><text y="5.5" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="15" fill="#fffef9">${i + 1}</text></g>` }).join('')
  const progresso = [...q('prog').children]

  /* composição */
  let L = LAYOUTS.land, escala = 1
  function encaixar() {
    const w = root.clientWidth, h = root.clientHeight
    if (!w || !h) return
    L = w / h < 1.05 ? LAYOUTS.port : LAYOUTS.land
    root.classList.toggle('tt-port', L.nome === 'port')
    escala = Math.min(w / L.W, h / L.H)
    stage.style.width = L.W + 'px'; stage.style.height = L.H + 'px'
    stage.style.transform = `translate(${(w - L.W * escala) / 2}px,${(h - L.H * escala) / 2}px) scale(${escala})`
    ultimo = null
  }
  let ultimo = null, pedido = null
  const ro = new ResizeObserver(() => { encaixar(); if (pedido) render(...pedido) })
  ro.observe(root)

  /* posição de um elemento da réplica, em coordenadas da composição */
  const centro = (el, fx = .5, fy = .5) => {
    const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect()
    return [(r.left + r.width * fx - s.left) / escala, (r.top + r.height * fy - s.top) / escala]
  }
  const noEstande = (x, y, z) => { const [px, py] = P(x, y, z); return [L.TX + px * L.ss, 56 + L.TY + py * L.ss] }

  /* roteiro do cursor por passo: [tempo, alvo, clique?] */
  const ROTEIRO = [
    () => [[0, [L.W * .3, L.H * .8]], [1.0, centro(q('incluido'), .3, .45)], [1.9, centro(q('incluido'), .3, .78)], [3.4, centro(q('b0-ir'), .6), 1]],
    () => [[0, centro(q('b0-ir'), .6)], [.9, centro(q('b1-c1'), .45), 1], [1.9, centro(q('b1-sw').querySelectorAll('span')[3]), 1], [3.3, centro(q('b1-up')), 1], [5.3, centro(q('total'), .5)]],
    () => [[0, centro(q('total'), .5)], [.8, centro(blocos[2].querySelectorAll('.tt-sws span')[1]), 1], [2.1, centro(q('b2-ajustar')), 1], [3.0, noEstande(4.8, 2.3, .85)], [T_MOVE[1] - INICIO[2], noEstande(6.4, 2.3, .85)], [5.8, centro(q('desfazer'))]],
    () => [[0, centro(q('desfazer'))], [.8, centro(q('b3-sw')), 1], [2.3, noEstande(...PONTO_ELETRICO), 1], [4.4, centro(q('ponto'), .5)]],
    () => [[0, centro(q('ponto'), .5)], [2.6, centro(q('b4-enviar'), .55), 1]],
  ]
  const CLIQUE = .18 // atraso entre chegar e clicar
  function cursor(passo, t) {
    const ks = ROTEIRO[passo]()
    let x = ks[0][1][0], y = ks[0][1][1], press = 0, clique = null
    for (let i = 1; i < ks.length; i++) {
      const [t1, alvo, clica] = ks[i], t0 = ks[i - 1][0] + (ks[i - 1][2] ? CLIQUE + .2 : 0)
      const ida = Math.min(.75, Math.max(.35, t1 - t0))
      const p = eio(seg(t, t1 - ida, t1))
      if (t >= t1 - ida) { x = ks[i - 1][1][0] + (alvo[0] - ks[i - 1][1][0]) * p; y = ks[i - 1][1][1] + (alvo[1] - ks[i - 1][1][1]) * p }
      if (clica && t >= t1 + CLIQUE - .05 && t < t1 + CLIQUE + .14) press = 1
      if (clica && t >= t1 + CLIQUE && t < t1 + CLIQUE + .6) clique = [alvo, t - t1 - CLIQUE]
    }
    /* no passo 3 o cursor arrasta junto com a mesa */
    if (passo === 2 && t >= 3.0 && t < T_MOVE[1] - INICIO[2] + .2) {
      ;[x, y] = noEstande(4.8 + moveDx(INICIO[2] + t), 2.3, .85); press = t > 3.15 ? 1 : press
    }
    return { x, y, press, clique }
  }

  function render(passo, t) {
    pedido = [passo, t]
    const chave = passo + ':' + t.toFixed(3) + ':' + L.nome
    if (chave === ultimo) return
    ultimo = chave
    const T = INICIO[passo] + t

    /* painel: bloco do passo, etapa e progresso */
    blocos.forEach((b, i) => {
      const on = i === passo, p = on ? eo(seg(t, 0, .5)) : 0
      b.style.opacity = p; b.style.visibility = on ? 'visible' : 'hidden'
      b.style.transform = `translateY(${(1 - p) * 18}px)`
    })
    const [e0, e1] = ETAPA_DO_PASSO[passo], etapa = (t > DURACOES[passo] * .55 ? e1 : e0)
    q('etapa').textContent = `Etapa ${etapa + 1} de 7`
    progresso.forEach((s, i) => { s.className = i < etapa ? 'tt-feito' : i === etapa ? 'tt-atual' : '' })

    /* passo 1: itens incluídos vão sendo conferidos */
    qa('incluido li').forEach((li, i) => li.classList.toggle('tt-ok', passo === 0 && t > .9 + i * .45))
    /* passo 2: cartões */
    const abre = passo === 1 ? eo(seg(t, 1.1, 1.5)) : 0
    q('b1-sw').style.maxHeight = abre * 80 + 'px'; q('b1-sw').style.opacity = abre
    q('b1-c1').classList.toggle('tt-ativo', passo === 1 && t > 1.1 && t < 3.3)
    q('b1-c2').classList.toggle('tt-ativo', passo === 1 && t > 3.5)
    const enviada = passo === 1 && t > 3.7
    q('b1-up').textContent = enviada ? 'logo-empresa.png ✓' : 'Enviar imagem'
    q('b1-up').classList.toggle('tt-feito', enviada)
    blocos[1].querySelectorAll('.tt-sws span').forEach((s, i) => s.classList.toggle('tt-sel', i === (T >= T_PAREDE ? 3 : 0)))
    blocos[2].querySelectorAll('.tt-sws span').forEach((s, i) => s.classList.toggle('tt-sel', i === (T >= T_PISO ? 1 : 0)))
    q('b2-ajustar').classList.toggle('tt-feito', passo === 2 && t > 2.3)
    const desf = passo === 2 ? seg(t, 5.0, 5.4) * (1 - seg(t, 6.6, 7.0)) : 0
    q('desfazer').style.boxShadow = desf ? `0 0 0 ${3 * desf}px #d2ee80` : 'none'
    /* passo 4 */
    const ledOn = eback(seg(T, T_LED - .1, T_LED + .3))
    q('b3-sw').querySelector('i').style.transform = `translateX(${clamp(ledOn, 0, 1.15) * 20}px)`
    q('b3-sw').style.background = mix('#cfd6c8', '#37644b', clamp(ledOn))
    const ponto = q('ponto'); const pp = passo === 3 ? eo(seg(t, 3.6, 4.0)) : passo > 3 ? 1 : 0
    ponto.style.opacity = pp; ponto.style.transform = `translateY(${(1 - pp) * 10}px)`
    /* passo 5 */
    qa('revisao li').forEach((li, i) => { const p = passo === 4 ? eo(seg(t, .4 + i * .3, .8 + i * .3)) : 0; li.style.opacity = p; li.style.transform = `translateX(${(1 - p) * -14}px)` })
    const enviado = passo === 4 && t > 2.95
    q('b4-enviar').classList.toggle('tt-feito', enviado)
    q('b4-enviar').textContent = enviado ? '✓ Enviado para a USET' : 'Enviar escolhas para a USET'
    const toast = q('toast'), pt = passo === 4 ? eback(seg(t, 3.2, 3.75)) : 0
    toast.style.opacity = clamp(pt); toast.style.transform = `translateY(${(1 - pt) * -24}px)`

    /* total pisca quando algo muda */
    const mudancas = [T_PAREDE, T_ARTE, T_PISO, T_LED, T_PINO]
    const flash = Math.max(0, ...mudancas.map(m => T >= m && T < m + 1.1 ? 1 - (T - m) / 1.1 : 0))
    q('total').style.boxShadow = flash ? `0 0 0 ${4 * flash}px rgba(210,238,128,${flash})` : 'none'
    q('total').querySelector('b').textContent = flash > .05 ? 'item somado ao total' : 'atualiza a cada escolha'

    /* estande */
    const dx = moveDx(T)
    q('wrap').setAttribute('transform', `translate(${L.TX} ${L.TY}) scale(${L.ss})`)
    for (const e of els) {
      if (e.move) colocar(e, dx)
      const c = e.cor(T)
      if (e.b) { e.top.setAttribute('fill', shade(c, .16)); e.left.setAttribute('fill', c); e.right.setAttribute('fill', shade(c, -.2)) }
      else e.circ.setAttribute('fill', c)
      if (e.arteEl) e.arteEl.setAttribute('opacity', eo(seg(T, T_ARTE, T_ARTE + .45)))
      if (e.glow) e.glow.setAttribute('opacity', .9 * eo(seg(T, T_LED, T_LED + .4)))
    }
    q('marcadores').setAttribute('opacity', passo === 1 ? eo(seg(t, .2, .6)) : 0)
    const giz = passo === 2 ? eo(seg(t, 2.4, 2.7)) * (1 - seg(t, 5.0, 5.4)) : 0, [gx, gy] = P(4.8 + dx, 2.3, .1)
    const gz = q('gizmo'); gz.setAttribute('cx', gx); gz.setAttribute('cy', gy); gz.setAttribute('rx', 1.22 * 1.05 * S); gz.setAttribute('ry', .707 * 1.05 * S)
    gz.setAttribute('opacity', giz); gz.setAttribute('stroke-dashoffset', -T * 24)
    const [px, py] = P(...PONTO_ELETRICO), pino = q('pino'), queda = eback(seg(T, T_PINO, T_PINO + .45))
    pino.setAttribute('opacity', T >= T_PINO ? 1 : 0)
    pino.setAttribute('transform', `translate(${px} ${py})`)
    q('pinocorpo').setAttribute('transform', `translate(0 ${(1 - queda) * -60})`)

    /* cursor e onda do clique */
    const c = cursor(passo, t), cu = q('cursor')
    cu.style.transform = `translate(${c.x - 8}px,${c.y - 4}px) scale(${c.press ? .86 : 1})`
    const onda = q('onda')
    if (c.clique) { const [[ox, oy], dt] = c.clique, p = seg(dt, 0, .6); onda.style.opacity = 1 - p; onda.style.transform = `translate(${ox}px,${oy}px) translate(-50%,-50%) scale(${.3 + p * 1.4})` }
    else onda.style.opacity = 0
  }

  encaixar()
  return { render, destruir() { ro.disconnect(); root.innerHTML = ''; root.classList.remove('tt', 'tt-port') } }
}
