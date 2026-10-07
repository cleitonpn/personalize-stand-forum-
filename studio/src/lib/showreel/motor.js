/* ============================================================================
   Showreel do Studio — o motor.
   Tudo é função de um único tempo t (0 → 30 s). Quem chama decide de onde vem o
   t: no vídeo avulso é o relógio; na página inicial é a rolagem. Por isso o
   motor não tem relógio próprio — só desenha o quadro que pedirem.

   Duas composições: paisagem (1920 × 1080) e retrato (1080 × 1920, celular).
   A composição é escolhida pela proporção do container e escalada para caber
   inteira; os fundos vazam para cobrir o que sobra.
   ========================================================================== */
import { LOGO_VIEWBOX, LOGO_PARTES } from './logo.js'

export const DURACAO = 30

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (t, a, b) => clamp((t - a) / (b - a))
const eo = p => 1 - Math.pow(1 - p, 3)
const ei = p => p * p * p
const eio = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
const eback = p => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2) }

const HX = new Map()
const hx = h => { if (!HX.has(h)) { const s = h.slice(1); HX.set(h, [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16))) } return HX.get(h) }
const mix = (a, b, p) => { if (p <= 0) return a; if (p >= 1) return b; const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * p).toString(16).padStart(2, '0')).join('') }
const shade = (c, k) => k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k)
const brl = n => 'R$ ' + Math.round(n).toLocaleString('pt-BR')

const SANGRIA = 1500 // quanto o fundo vaza além da composição

const LAYOUTS = {
  land: { nome: 'land', W: 1920, H: 1080, TX: 1124, TY: 436, ss: 1, creme: [1290, 560], cur1: [1720, 960], colK: 1 },
  port: { nome: 'port', W: 1080, H: 1920, TX: 399, TY: 1418, ss: .85, creme: [540, 1520], cur1: [900, 1820], colK: 1.5 },
}

/* ---------------------------------------------------------------------------
   Marcação
   ------------------------------------------------------------------------- */
const logoSvg = cls => `<svg class="sr-logo ${cls}" viewBox="${LOGO_VIEWBOX}" role="img" aria-label="USET">
  <g class="lg-anel"><path d="${LOGO_PARTES.anel}"/></g>
  <g class="lg-haste"><path d="${LOGO_PARTES.haste}"/></g>
  <g class="lg-l"><path d="${LOGO_PARTES.s}"/></g>
  <g class="lg-l"><path d="${LOGO_PARTES.e}"/></g>
  <g class="lg-l"><path d="${LOGO_PARTES.t}"/></g>
  <g class="lg-reg"><path fill-rule="evenodd" d="${LOGO_PARTES.registro[0]}"/><path d="${LOGO_PARTES.registro[1]}"/></g>
</svg>`

const MARCACAO = cta => `
<div class="sr-stage">
  <div class="sr-bg sr-bgdark"></div>
  <div class="sr-abs sr-glow"></div>
  <svg class="sr-layer sr-grid" width="1920" height="1920">
    <defs>
      <pattern id="sr-iso" width="90" height="52" patternUnits="userSpaceOnUse"><path d="M0 26 L45 0 L90 26 L45 52 Z" fill="none" stroke="#d2ee80" stroke-width="1"/></pattern>
      <radialGradient id="sr-gridfade" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <mask id="sr-gridmask"><rect width="1920" height="1920" fill="url(#sr-gridfade)"/></mask>
    </defs>
    <g mask="url(#sr-gridmask)"><rect class="sr-gridrect" x="-180" y="-104" width="2280" height="2100" fill="url(#sr-iso)" opacity=".06"/></g>
  </svg>
  <div class="sr-bg sr-bgcream"></div>

  <svg class="sr-layer sr-standsvg">
    <defs>
      <linearGradient id="sr-scang" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#d2ee80" stop-opacity="0"/><stop offset=".85" stop-color="#d2ee80" stop-opacity=".28"/><stop offset="1" stop-color="#d2ee80" stop-opacity="1"/>
      </linearGradient>
    </defs>
    <g class="sr-standwrap">
      <ellipse class="sr-shadow" rx="470" ry="130" fill="#0f2a23" opacity="0"/>
      <g id="sr-standinner" class="sr-standinner"></g>
      <ellipse class="sr-gizmo" fill="none" stroke="#37644b" stroke-width="3" opacity="0"/>
      <rect class="sr-scan" x="-260" width="840" height="120" fill="url(#sr-scang)" opacity="0"/>
    </g>
  </svg>

  <div class="sr-abs sr-anim sr-corner">${logoSvg('sr-logo-mini')}<span>STAND STUDIO</span></div>
  <div class="sr-abs sr-anim sr-chapters"></div>

  <div class="sr-abs sr-s1">
    ${logoSvg('sr-logo-big sr-s1logo')}
    <div class="sr-s1line sr-anim"></div>
    <div class="sr-s1sub sr-anim">STAND STUDIO</div>
    <div class="sr-s1tag sr-split">Personalização de estandes, do projeto à proposta.</div>
  </div>
  <div class="sr-abs sr-anim sr-hint">Role para conhecer <span>↓</span></div>

  <div class="sr-col sr-s2">
    <div class="sr-eyebrow sr-anim sr-s2eb">01 — O projeto</div>
    <h2 class="sr-h sr-split sr-s2h">Comece pelo arquivo do <em>projetista.</em></h2>
    <p class="sr-p sr-anim sr-s2p">Envie o .glb. O Studio lê materiais, peças e medidas — sem remodelar nada.</p>
    <div class="sr-stats sr-anim sr-s2stats">
      <div class="sr-stat"><b data-n="23">0</b><span>materiais</span></div>
      <div class="sr-stat"><b data-n="814">0</b><span>peças identificadas</span></div>
      <div class="sr-stat"><b data-n="972" data-suf=" mil">0</b><span>triângulos</span></div>
      <div class="sr-stat"><b data-n="34" data-suf=" ms">0</b><span>para analisar tudo</span></div>
    </div>
  </div>
  <div class="sr-abs sr-anim sr-file">
    <div class="sr-ic">.glb</div>
    <strong>ECBR_45m.glb</strong>
    <small>Projeto 3D · SketchUp / Enscape</small>
    <div class="sr-bar"><i class="sr-filebar"></i></div>
  </div>
  <div class="sr-abs sr-anim sr-scantag">ANALISANDO GEOMETRIA</div>

  <div class="sr-col sr-s3">
    <div class="sr-eyebrow sr-anim sr-s3eb">02 — Mapeamento</div>
    <h2 class="sr-h sr-split sr-s3h">Um material. <em>Milhares de peças.</em></h2>
    <p class="sr-p sr-anim sr-s3p">O Studio sugere o papel de cada material. A montadora confirma.</p>
    <div class="sr-rows">
      <div class="sr-row sr-anim"><div class="sr-mat">VS_bagum-preto3</div><div class="sr-arr">→</div><div class="sr-role"><i style="background:#a855f7"></i>Bagum</div></div>
      <div class="sr-row sr-anim"><div class="sr-mat">Tapete 1</div><div class="sr-arr">→</div><div class="sr-role"><i style="background:#14b8a6"></i>Piso / carpete</div></div>
      <div class="sr-row sr-anim"><div class="sr-mat">Lona_fundo_02</div><div class="sr-arr">→</div><div class="sr-role"><i style="background:#f59e0b"></i>Lona impressa</div></div>
      <div class="sr-row sr-anim"><div class="sr-mat">Madeira 16</div><div class="sr-arr">→</div><div class="sr-role"><i style="background:#c2833f"></i>Madeira</div></div>
      <div class="sr-row sr-anim"><div class="sr-mat">eames wood1</div><div class="sr-arr">→</div><div class="sr-role"><i style="background:#7d8ba3"></i>Mobiliário</div></div>
    </div>
  </div>

  <div class="sr-col sr-s4">
    <div class="sr-eyebrow sr-anim sr-s4eb">03 — Regras da montadora</div>
    <h2 class="sr-h sr-split sr-s4h">Você decide o que <em>pode mudar.</em></h2>
    <div class="sr-tog">
      <div class="sr-t sr-anim"><div><strong>Paredes e carpete</strong><small>Cliente troca a cor</small></div><div class="sr-sw"><i></i></div></div>
      <div class="sr-t sr-anim"><div><strong>Lonas e adesivos</strong><small>Cliente sobe a própria arte</small></div><div class="sr-sw"><i></i></div></div>
      <div class="sr-t sr-anim"><div><strong>Mesa e cadeiras</strong><small>Cliente move e gira</small></div><div class="sr-sw"><i></i></div></div>
      <div class="sr-t sr-anim"><div><strong>Depósito e balcão</strong><small>Mantidos como no projeto</small></div><div class="sr-lock"><svg width="18" height="20" viewBox="0 0 18 20"><rect x="1" y="8" width="16" height="11" rx="3" fill="#f43f5e"/><path d="M5 8V5.5a4 4 0 0 1 8 0V8" fill="none" stroke="#f43f5e" stroke-width="2.2"/></svg></div></div>
    </div>
    <div class="sr-chips sr-anim sr-s4chips"><span class="sr-chip">R$ por m²</span><span class="sr-chip">R$ por peça</span><span class="sr-chip">Metragem do próprio 3D</span></div>
  </div>

  <div class="sr-col sr-light sr-s5">
    <div class="sr-eyebrow sr-anim sr-s5eb">04 — O expositor</div>
    <h2 class="sr-h sr-split sr-s5h">Personalizar ficou <em>simples.</em></h2>
    <div class="sr-card sr-anim sr-s5card">
      <h4>Parede do fundo</h4>
      <div class="sr-lbl">Cartela de cores</div>
      <div class="sr-sws">
        <span style="background:#ecebe4"></span><span style="background:#cfdbe6"></span><span style="background:#e9cdb9"></span>
        <span style="background:#193b33"></span><span style="background:#c9a27a"></span><span style="background:#6f9a52"></span>
      </div>
      <div class="sr-lines">
        <div class="sr-ln sr-anim sr-ln1"><span><i class="sr-ok">✓</i><b>Carpete</b> · verde musgo</span><em>+ R$ 1.120</em></div>
        <div class="sr-ln sr-anim sr-ln2"><span><i class="sr-ok">✓</i><b>Lona central</b> · sua arte</span><em>+ R$ 2.340</em></div>
        <div class="sr-ln sr-anim sr-ln3"><span><i class="sr-ok">✓</i><b>Mesa e cadeiras</b> · reposicionadas</span><em>incluso</em></div>
      </div>
    </div>
  </div>
  <div class="sr-abs sr-anim sr-price"><small>Total adicional</small><b class="sr-priceval">R$ 0</b><span>valores ilustrativos</span></div>

  <div class="sr-col sr-light sr-s6">
    <div class="sr-eyebrow sr-anim sr-s6eb">05 — Proposta</div>
    <h2 class="sr-h sr-split sr-s6h">A proposta chega <em>pronta.</em></h2>
    <p class="sr-p sr-anim sr-s6p">O expositor envia e baixa o PDF. A montadora recebe tudo especificado para produzir.</p>
    <div class="sr-anim sr-s6btnwrap"><div class="sr-s6btn">Enviar escolhas para a USET <span>→</span></div></div>
  </div>
  <div class="sr-abs sr-anim sr-doc">
    <div class="sr-doctop">${logoSvg('sr-logo-doc')}<div class="sr-pdf">PDF</div></div>
    <h5>Proposta de personalização</h5>
    <div class="sr-meta">Expositor · Estande 40 m² · 10,00 × 4,00 m</div>
    <svg class="sr-thumb" width="476" height="230" viewBox="0 0 476 230"><use href="#sr-standinner" transform="translate(182 74) scale(.34)"/></svg>
    <div class="sr-it"><span>Parede do fundo</span><span>Verde USET</span></div>
    <div class="sr-it"><span>Carpete</span><span>Verde musgo</span></div>
    <div class="sr-it"><span>Lona central</span><span>Arte do expositor</span></div>
    <div class="sr-it"><span>Mesa e cadeiras</span><span>Nova posição</span></div>
    <div class="sr-tot"><span class="sr-meta">Total adicional</span><b>R$ 3.460</b></div>
  </div>
  <div class="sr-abs sr-anim sr-toast"><div class="sr-dot">✓</div><div><strong>Nova proposta recebida</strong><small>Estande 40 m² · pronta para produção</small></div></div>

  <div class="sr-bg sr-bgdark2"></div>
  <div class="sr-abs sr-sweepbar"></div>
  <div class="sr-abs sr-big sr-split sr-s7a">Menos retrabalho.</div>
  <div class="sr-abs sr-big sr-split sr-s7b">Mais <em>adicionais</em> vendidos.</div>
  <div class="sr-abs sr-big sr-split sr-s7c">Expositor no controle.</div>
  <div class="sr-abs sr-end">
    ${logoSvg('sr-logo-big sr-endlogo')}
    <div class="sr-endsub sr-anim">STAND STUDIO</div>
    <div class="sr-endfor sr-split">Para montadoras e organizadoras de eventos.</div>
    ${cta ? `<a class="sr-endpill sr-anim sr-cta" tabindex="-1" href="${cta.href}">${cta.rotulo} <span>↗</span></a>` : `<div class="sr-endpill sr-anim">Seu estande. Do seu jeito.</div>`}
  </div>

  <svg class="sr-abs sr-anim sr-cursor" viewBox="0 0 44 44"><path d="M8 4 L8 34 L16 26 L22 39 L27 37 L21 24 L32 24 Z" fill="#fffef9" stroke="#193b33" stroke-width="2.4" stroke-linejoin="round"/></svg>
</div>`

/* ---------------------------------------------------------------------------
   Estande isométrico (10,00 × 4,00 m — a Opção C do Fórum)
   ------------------------------------------------------------------------- */
const S = 64, C = Math.cos(Math.PI / 6)
const P = (x, y, z) => [(x - y) * C * S, (x + y) * .5 * S - z * S]
const pts = a => a.map(p => P(...p).map(v => v.toFixed(1)).join(',')).join(' ')
const NS = 'http://www.w3.org/2000/svg'

const ROLE = { piso: '#14b8a6', bagum: '#a855f7', lona: '#f59e0b', madeira: '#c2833f', mob: '#7d8ba3', metal: '#94a3b8' }
const ROLE_T = { bagum: 8.95, piso: 9.3, lona: 9.65, madeira: 10.0, mob: 10.35, metal: 10.35 }
const WALLS = ['#ecebe4', '#cfdbe6', '#e9cdb9', '#193b33'], WALL_T = [16.95, 17.55, 18.15]
const wallColor = t => WALLS.slice(1).reduce((c, n, i) => mix(c, n, eio(seg(t, WALL_T[i], WALL_T[i] + .35))), WALLS[0])
const moveDx = t => 1.4 * eio(seg(t, 20.15, 21.25))

const pecas = () => [
  { b: [0, 10, 0, 4, 0, .1], role: 'piso', custAt: 12.75, real: t => mix('#6c7176', '#3f6a55', eio(seg(t, 18.65, 19.0))) },
  { b: [0, 10, 0, .15, .1, 3], role: 'bagum', custAt: 12.75, real: wallColor },
  { b: [0, .15, .15, 4, .1, 3], role: 'bagum', custAt: 12.75, real: () => '#e4e3db' },
  { b: [2.2, 6.2, .15, .21, 1.05, 2.6], role: 'lona', custAt: 13.25, logo: 1, real: t => mix('#dcdfd4', '#d2ee80', eio(seg(t, 19.25, 19.6))) },
  { b: [.45, .95, .5, 1.0, .1, .55], role: 'mob', real: () => '#3a3f44' },
  { ball: [.62, .72, 1.0, .42], role: 'mob', real: () => '#6f9a52' },
  { ball: [.8, .95, 1.35, .36], role: 'mob', real: () => '#7fae5e' },
  { b: [7.6, 10, .15, 1.7, .1, 2.6], role: 'madeira', real: () => '#cdb08e' },
  { b: [3.7, 4.15, 2.05, 2.5, .1, .5], role: 'mob', move: 1, custAt: 13.75, real: () => '#2f3a37' },
  { b: [3.7, 3.76, 2.05, 2.5, .5, .98], role: 'mob', move: 1, custAt: 13.75, real: () => '#2f3a37' },
  { b: [4.72, 4.88, 2.22, 2.38, .1, .78], role: 'metal', move: 1, custAt: 13.75, real: () => '#2b2f33' },
  { b: [4.35, 5.25, 1.85, 2.75, .78, .85], role: 'mob', move: 1, custAt: 13.75, real: () => '#fbfaf6' },
  { b: [5.45, 5.9, 2.05, 2.5, .1, .5], role: 'mob', move: 1, custAt: 13.75, real: () => '#2f3a37' },
  { b: [5.84, 5.9, 2.05, 2.5, .5, .98], role: 'mob', move: 1, custAt: 13.75, real: () => '#2f3a37' },
  { b: [1.0, 3.0, 2.9, 3.5, .1, 1.1], role: 'madeira', real: () => '#cdb08e' },
  { b: [1.08, 2.92, 3.5, 3.53, .22, .98], role: 'lona', custAt: 13.25, real: t => mix('#dcdfd4', '#d2ee80', eio(seg(t, 19.45, 19.8))) },
]

function colorAt(e, t) {
  let c = ROLE[e.role]
  const dim = (t >= 12 && !e.custAt) ? eio(seg(t, 12.3, 12.9)) * (1 - seg(t, 15.7, 16.2)) : 0
  c = mix(c, '#2a4a41', dim * .85)
  const pr = eio(seg(t, 15.85, 16.6))
  if (pr > 0) c = mix(c, e.real(t), pr)
  return c
}

/* ---------------------------------------------------------------------------
   Montagem
   ------------------------------------------------------------------------- */
const CAPITULOS = [['Projeto', 3.6, 8], ['Mapeamento', 8, 12], ['Regras', 12, 15.8], ['Expositor', 15.8, 22.5], ['Proposta', 22.5, 26]]

export function montarShowreel(root, opcoes = {}) {
  const { cta = null, semMarcaNoCanto = false, aoMudarTema = null, dica = false } = opcoes
  root.classList.add('sr')
  if (semMarcaNoCanto) root.classList.add('sr-sem-canto')
  if (!dica) root.classList.add('sr-sem-dica')
  root.innerHTML = MARCACAO(cta)
  const q = n => root.querySelector('.sr-' + n)
  const qa = n => [...root.querySelectorAll('.sr-' + n)]
  const stage = q('stage')

  /* palavra a palavra */
  root.querySelectorAll('.sr-split').forEach(el => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const f = document.createDocumentFragment()
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return
          if (/^\s+$/.test(part)) { f.appendChild(document.createTextNode(' ')); return }
          const w = document.createElement('span'); w.className = 'sr-w'
          const i = document.createElement('span'); i.textContent = part; w.appendChild(i); f.appendChild(w)
        })
        n.replaceWith(f)
      } else if (n.nodeType === 1) walk(n)
    })
    walk(el)
    el._ws = [...el.querySelectorAll('.sr-w>span')]
  })

  function vis(el, t, a, b, o = {}) {
    const di = o.di ?? .7, dout = o.do ?? .45, dy = o.dy ?? 36, dx = o.dx ?? 0, sc = o.sc ?? 0
    const pi = (o.back ? eback : eo)(seg(t, a, a + di)), po = ei(seg(t, b - dout, b))
    const op = Math.min(pi, 1) * (1 - po)
    el.style.opacity = op
    el.style.visibility = op <= .001 ? 'hidden' : 'visible'
    const y = (1 - pi) * dy - po * (o.dyo ?? dy * .6), x = (1 - pi) * dx - po * (o.dxo ?? 0)
    const s = (1 + (1 - pi) * sc - po * (o.sco ?? 0)) * (el._k || 1)
    el.style.transform = `translate(${x}px,${y}px) scale(${s})`
    return pi
  }
  function words(el, t, a, b, st = .06, dur = .8) {
    const on = t >= a && t <= b
    el.style.visibility = on ? 'visible' : 'hidden'
    if (!on) return
    el._ws.forEach((s, i) => {
      const p = eo(seg(t, a + i * st, a + i * st + dur)), qq = ei(seg(t, b - .5 + i * .02, b + i * .02 - .02))
      s.style.transform = `translateY(${(1 - p) * 115 - qq * 115}%)`
    })
  }
  /* o logo se monta: o anel gira, a haste desce e as letras sobem */
  function logoAnim(svg, t, a, b) {
    const on = t >= a && t <= b
    svg.style.visibility = on ? 'visible' : 'hidden'
    if (!on) return
    const sai = ei(seg(t, b - .5, b))
    const pa = eo(seg(t, a, a + .9))
    const anel = svg.querySelector('.lg-anel')
    anel.setAttribute('transform', `rotate(${(1 - pa) * -150 + sai * 40} 370 372)`)
    anel.style.opacity = pa * (1 - sai)
    const ph = eback(seg(t, a + .25, a + .95))
    svg.querySelector('.lg-haste').setAttribute('transform', `translate(0 ${(1 - ph) * -520 - sai * 760})`)
    svg.querySelectorAll('.lg-l').forEach((g, i) => {
      const p = eo(seg(t, a + .35 + i * .1, a + 1.05 + i * .1))
      g.setAttribute('transform', `translate(0 ${(1 - p) * 760 - sai * 760})`)
    })
    svg.querySelector('.lg-reg').style.opacity = seg(t, a + .9, a + 1.2) * (1 - sai)
  }

  /* estande */
  const inner = q('standinner')
  const ELS = pecas()
  let idx = 0
  for (const e of ELS) {
    const g = document.createElementNS(NS, 'g'); inner.appendChild(g); e.polys = []
    if (e.b) {
      for (const k of ['top', 'right', 'left']) {
        const p = document.createElementNS(NS, 'polygon')
        p.setAttribute('pathLength', '1'); p.setAttribute('stroke-linejoin', 'round')
        p._i = idx++; g.appendChild(p); e[k] = p; e.polys.push(p)
      }
    } else {
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('pathLength', '1'); c._i = idx++
      g.appendChild(c); e.circ = c; e.polys.push(c)
      const [x, y, z, r] = e.ball, [cx, cy] = P(x, y, z)
      c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r * S)
    }
    if (e.logo) {
      /* arte no plano da parede: eixo x do estande → (C, .5); vertical → (0, 1) */
      const [ox, oy] = P(2.2, .21, 2.6)
      const lg = document.createElementNS(NS, 'g')
      lg.setAttribute('transform', `matrix(${C},.5,0,1,${ox},${oy})`)
      lg.innerHTML = `<circle cx="${.62 * S}" cy="${.78 * S}" r="${.36 * S}" fill="#193b33"/><path d="M${.5 * S} ${.78 * S} l${.1 * S} ${.1 * S} l${.16 * S} -${.2 * S}" stroke="#d2ee80" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="${1.15 * S}" y="${.72 * S}" font-family="Sora,sans-serif" font-weight="800" font-size="${.34 * S}" letter-spacing="-1.5" fill="#193b33">SUA MARCA</text>
        <text x="${1.17 * S}" y="${1.08 * S}" font-family="Inter,sans-serif" font-weight="600" font-size="${.14 * S}" letter-spacing="3" fill="#37644b">ARTE DO EXPOSITOR</text>`
      g.appendChild(lg); e.art = lg
    }
  }
  const placeBox = (e, off) => {
    const [x0, x1, y0, y1, z0, z1] = e.b, X0 = x0 + off, X1 = x1 + off
    e.top.setAttribute('points', pts([[X0, y0, z1], [X1, y0, z1], [X1, y1, z1], [X0, y1, z1]]))
    e.right.setAttribute('points', pts([[X1, y0, z0], [X1, y1, z0], [X1, y1, z1], [X1, y0, z1]]))
    e.left.setAttribute('points', pts([[X0, y1, z0], [X1, y1, z0], [X1, y1, z1], [X0, y1, z1]]))
  }
  ELS.forEach(e => e.b && placeBox(e, 0))
  { const [sx, sy] = P(5, 2, 0); const sh = q('shadow'); sh.setAttribute('cx', sx); sh.setAttribute('cy', sy + 40) }

  /* capítulos */
  q('chapters').innerHTML = CAPITULOS.map(c => `<div><u><i></i></u><small>${c[0]}</small></div>`).join('')
  const chBars = [...q('chapters').querySelectorAll('i')], chLbl = [...q('chapters').querySelectorAll('small')]

  /* composição */
  let L = LAYOUTS.land
  const animados = qa('anim')
  function encaixar() {
    const w = root.clientWidth, h = root.clientHeight
    if (!w || !h) return
    const novo = w / h < .9 ? LAYOUTS.port : LAYOUTS.land
    if (novo !== L) { L = novo }
    root.classList.toggle('sr-port', L.nome === 'port')
    const k = Math.min(w / L.W, h / L.H)
    stage.style.width = L.W + 'px'; stage.style.height = L.H + 'px'
    stage.style.transform = `translate(${(w - L.W * k) / 2}px,${(h - L.H * k) / 2}px) scale(${k})`
    animados.forEach(el => { el._k = parseFloat(getComputedStyle(el).getPropertyValue('--k')) || 1 })
    ultimo = -1
  }
  let ultimo = -1, temaAtual = null
  const ro = new ResizeObserver(() => { encaixar(); if (tAtual != null) render(tAtual) })
  ro.observe(root)

  function cursorAt(t) {
    const tb = P(4.8 + moveDx(t), 2.3, .85)
    const tbx = L.TX + tb[0] * L.ss - 6, tby = L.TY + tb[1] * L.ss - 4
    if (t >= 19.55 && t < 21.9) {
      const a = eio(seg(t, 19.55, 20.05)), [sx, sy] = L.cur1
      const ex = eio(seg(t, 21.4, 21.9))
      return { x: sx + (tbx - sx) * a + ex * 260, y: sy + (tby - sy) * a + ex * 160, o: seg(t, 19.55, 19.75) * (1 - seg(t, 21.6, 21.9)), s: (t > 20.05 && t < 21.3) ? .88 : 1 }
    }
    if (t >= 22.7 && t < 24.3) {
      const col = q('s6'), wrap = q('s6btnwrap'), btn = q('s6btn')
      const bx = col.offsetLeft + (wrap.offsetLeft + btn.offsetWidth * .78) * L.colK
      const by = col.offsetTop + (wrap.offsetTop + btn.offsetHeight * .5) * L.colK
      const a = eio(seg(t, 22.7, 23.25)), sx = bx + 380, sy = by + 230
      return { x: sx + (bx - sx) * a, y: sy + (by - sy) * a, o: seg(t, 22.7, 22.9) * (1 - seg(t, 24, 24.3)), s: (t > 23.3 && t < 23.5) ? .85 : 1 }
    }
    return { x: 0, y: 0, o: 0, s: 1 }
  }

  function renderStand(t) {
    const wrapOp = seg(t, 3.85, 4.0) * (1 - seg(t, 22.45, 22.95))
    const wrapSc = (1 - .12 * eio(seg(t, 22.4, 22.95))) * L.ss
    const wrap = q('standwrap')
    wrap.setAttribute('opacity', wrapOp)
    wrap.setAttribute('transform', `translate(${L.TX + 60 * eio(seg(t, 22.4, 22.95))} ${L.TY}) scale(${wrapSc})`)
    q('shadow').setAttribute('opacity', .35 * seg(t, 8.5, 9.5) * (1 - seg(t, 15.55, 15.85)))
    const dx = moveDx(t), drawing = t < 5.9
    for (const e of ELS) {
      if (e.move && e.b) placeBox(e, dx)
      const c = colorAt(e, t)
      const fo = eo(seg(t, ROLE_T[e.role], ROLE_T[e.role] + .5))
      let sc = '#d2ee80', sw = 1.6, so = 1
      if (t > 8.3) { const k = seg(t, 8.3, 9.2); sc = mix('#d2ee80', '#0f2a23', k); sw = 1.6 - .6 * k; so = 1 - .45 * k }
      if (e.custAt && t >= e.custAt && t < 16) {
        const on = eo(seg(t, e.custAt, e.custAt + .35)) * (1 - seg(t, 15.6, 16))
        sc = mix(sc, '#d2ee80', on); sw = 1 + 1.6 * on; so = .55 + .45 * on * (.6 + .4 * Math.sin((t - e.custAt) * 7))
      }
      if (t >= 15.9) { const k = seg(t, 15.9, 16.5); sc = mix(sc, '#193b33', k); so += (.2 - so) * k; sw += (1 - sw) * k }
      for (const p of e.polys) {
        if (drawing) {
          const d = eio(seg(t, 4.15 + p._i * .035, 5.2 + p._i * .035))
          p.setAttribute('stroke-dasharray', '1 1'); p.setAttribute('stroke-dashoffset', 1 - d)
        } else { p.removeAttribute('stroke-dasharray'); p.removeAttribute('stroke-dashoffset') }
        p.setAttribute('stroke', sc); p.setAttribute('stroke-width', sw); p.setAttribute('stroke-opacity', so)
        p.setAttribute('fill-opacity', fo)
      }
      if (e.b) { e.top.setAttribute('fill', shade(c, .16)); e.left.setAttribute('fill', c); e.right.setAttribute('fill', shade(c, -.22)) }
      else e.circ.setAttribute('fill', c)
      if (e.art) e.art.setAttribute('opacity', eo(seg(t, 19.3, 19.75)))
    }
    const sp = seg(t, 5.6, 7.4), scan = q('scan')
    scan.setAttribute('opacity', (sp > 0 && sp < 1) ? Math.sin(sp * Math.PI) : 0)
    scan.setAttribute('y', -330 + sp * 790)
    const gOn = eo(seg(t, 19.95, 20.2)) * (1 - seg(t, 21.3, 21.6))
    const [gx, gy] = P(4.8 + dx, 2.3, .1), r = 1.05, gz = q('gizmo')
    gz.setAttribute('cx', gx); gz.setAttribute('cy', gy)
    gz.setAttribute('rx', 1.2247 * r * S); gz.setAttribute('ry', .707 * r * S); gz.setAttribute('opacity', gOn)
    gz.setAttribute('stroke-dasharray', '10 8'); gz.setAttribute('stroke-dashoffset', -t * 30)
  }

  const nums = [...q('s2stats').querySelectorAll('b')]
  let tAtual = null

  function render(t) {
    tAtual = t
    if (Math.abs(t - ultimo) < 1e-4) return
    ultimo = t
    /* fundos */
    const R = 2600 * eio(seg(t, 15.6, 16.5))
    q('bgcream').style.clipPath = `circle(${R}px at ${L.creme[0] + SANGRIA}px ${L.creme[1] + SANGRIA}px)`
    const sw = eio(seg(t, 25.85, 26.45)), bx = -260 + sw * (L.W + 520)
    q('bgdark2').style.clipPath = `inset(0 ${L.W + SANGRIA - bx}px 0 0)`
    q('sweepbar').style.transform = `translateX(${bx}px)`
    q('sweepbar').style.opacity = (sw > 0 && sw < 1) ? 1 : 0
    q('gridrect').setAttribute('transform', `translate(${(t * 6) % 90} ${(t * 3.47) % 52})`)
    q('glow').style.opacity = seg(t, 4, 5) * (1 - seg(t, 15.6, 16))

    /* moldura */
    const light = seg(t, 15.9, 16.4) * (1 - seg(t, 25.9, 26.2))
    const fc = mix('#f4f3ed', '#193b33', light)
    const cr = q('corner'); vis(cr, t, 3.7, 26.1, { dy: -20 }); cr.style.color = fc
    const chs = q('chapters'); vis(chs, t, 3.8, 26.1, { dy: 20 }); chs.style.color = fc
    chs.style.setProperty('--chapc', mix('#d2ee80', '#37644b', light))
    CAPITULOS.forEach((c, i) => { chBars[i].style.width = seg(t, c[1], c[2]) * 100 + '%'; chLbl[i].style.opacity = (t >= c[1] && t < c[2]) ? 1 : .45 })
    const tema = light > .5 ? 'claro' : 'escuro'
    if (tema !== temaAtual) { temaAtual = tema; aoMudarTema && aoMudarTema(tema) }

    /* 1 — abertura */
    logoAnim(q('s1logo'), t, .2, 3.55)
    const l = q('s1line'); vis(l, t, .9, 3.5, { dy: 0 }); l.style.transform += ` scaleX(${eo(seg(t, .9, 1.7)) * (1 - ei(seg(t, 3.1, 3.5)))})`
    vis(q('s1sub'), t, 1.25, 3.5, { dy: 16 })
    words(q('s1tag'), t, 1.6, 3.55, .05)
    vis(q('hint'), t, 2.2, 3.4, { dy: -14 })
    q('hint').querySelector('span').style.transform = `translateY(${Math.sin(t * 6) * 4}px)`

    /* 2 — o projeto */
    vis(q('s2eb'), t, 3.8, 7.95, { dx: -30, dy: 0 })
    words(q('s2h'), t, 3.95, 7.95, .07)
    vis(q('s2p'), t, 4.5, 7.95)
    vis(q('s2stats'), t, 5.3, 7.95)
    nums.forEach((b, i) => { const n = +b.dataset.n, p = eo(seg(t, 5.5 + i * .2, 6.9 + i * .2)); b.textContent = Math.round(n * p).toLocaleString('pt-BR') + (b.dataset.suf || '') })
    vis(q('file'), t, 3.55, 4.75, { dy: 40, sc: .06, do: .35, sco: .5, dyo: -40, back: true })
    q('filebar').style.width = eio(seg(t, 3.85, 4.45)) * 100 + '%'
    vis(q('scantag'), t, 5.6, 7.6, { dy: 14 })

    /* 3 — mapeamento */
    vis(q('s3eb'), t, 7.95, 11.95, { dx: -30, dy: 0 })
    words(q('s3h'), t, 8.05, 11.95, .07)
    vis(q('s3p'), t, 8.4, 11.95)
    qa('row').forEach((r, i) => vis(r, t, 8.6 + i * .35, 11.95 - .04 * (4 - i), { dx: -40, dy: 0, di: .55 }))

    /* 4 — regras */
    vis(q('s4eb'), t, 11.95, 15.75, { dx: -30, dy: 0 })
    words(q('s4h'), t, 12.05, 15.75, .07)
    const ON = [12.75, 13.25, 13.75]
    qa('t').forEach((r, i) => {
      vis(r, t, 12.35 + i * .18, 15.75, { dx: -40, dy: 0, di: .55 })
      const knob = r.querySelector('.sr-sw i'), tr = r.querySelector('.sr-sw')
      if (knob) { const k = eback(seg(t, ON[i], ON[i] + .4)); knob.style.transform = `translateX(${k * 28}px)`; tr.style.background = mix('#36564c', '#d2ee80', clamp(k)); knob.style.background = mix('#f4f3ed', '#193b33', clamp(k)) }
    })
    vis(q('s4chips'), t, 14.3, 15.75)

    /* 5 — expositor */
    vis(q('s5eb'), t, 16.15, 22.4, { dx: -30, dy: 0 })
    words(q('s5h'), t, 16.25, 22.4, .07)
    vis(q('s5card'), t, 16.55, 22.4, { dy: 40 })
    const active = t < WALL_T[0] ? 0 : t < WALL_T[1] ? 1 : t < WALL_T[2] ? 2 : 3
    q('sws').querySelectorAll('span').forEach((s, i) => s.style.setProperty('--on', i === active ? 1 : 0))
    vis(q('ln1'), t, 18.65, 22.4, { dy: 16, di: .5 })
    vis(q('ln2'), t, 19.3, 22.4, { dy: 16, di: .5 })
    vis(q('ln3'), t, 21.25, 22.4, { dy: 16, di: .5 })
    vis(q('price'), t, 16.8, 22.5, { dy: -24 })
    q('priceval').textContent = brl(1120 * eo(seg(t, 18.7, 19.2)) + 2340 * eo(seg(t, 19.35, 19.95)))

    /* 6 — proposta */
    vis(q('s6eb'), t, 22.55, 25.95, { dx: -30, dy: 0 })
    words(q('s6h'), t, 22.65, 25.95, .07)
    vis(q('s6p'), t, 22.95, 25.95)
    vis(q('s6btnwrap'), t, 23.05, 25.95)
    q('s6btn').style.transform = (t > 23.3 && t < 23.5) ? 'scale(.96)' : 'scale(1)'
    q('s6btn').style.background = t >= 23.35 ? '#c0e46b' : '#d2ee80'
    const doc = q('doc'); vis(doc, t, 22.75, 25.95, { dy: 80, sc: .04, di: .9 })
    doc.style.transform += ` rotate(${(1 - eo(seg(t, 22.75, 23.65))) * 3}deg)`
    vis(q('toast'), t, 23.65, 25.95, { dy: -30, back: true })

    /* 7 — benefícios e assinatura */
    words(q('s7a'), t, 26.25, 28.35, .07)
    words(q('s7b'), t, 26.7, 28.4, .07)
    words(q('s7c'), t, 27.15, 28.45, .07)
    logoAnim(q('endlogo'), t, 28.4, 30.3)
    vis(q('endsub'), t, 28.9, 30.3, { dy: 14 })
    words(q('endfor'), t, 29.0, 30.3, .04, .6)
    const pill = q('endpill'); vis(pill, t, 29.25, 30.3, { dy: 20, sc: .08, back: true, di: .55 })
    pill.style.pointerEvents = t > 29.4 ? 'auto' : 'none'

    renderStand(t)
    const c = cursorAt(t), cu = q('cursor')
    cu.style.opacity = c.o; cu.style.transform = `translate(${c.x}px,${c.y}px) scale(${c.s})`
  }

  encaixar()
  return {
    render,
    destruir() { ro.disconnect(); root.innerHTML = ''; root.classList.remove('sr', 'sr-port', 'sr-sem-canto', 'sr-sem-dica') },
  }
}
