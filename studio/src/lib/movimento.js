/* Curvas e cores compartilhadas pelas animações (showreel e tutorial). */
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const seg = (t, a, b) => clamp((t - a) / (b - a))
export const eo = p => 1 - Math.pow(1 - p, 3)
export const ei = p => p * p * p
export const eio = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
export const eback = p => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2) }

const HX = new Map()
const hx = h => { if (!HX.has(h)) { const s = h.slice(1); HX.set(h, [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16))) } return HX.get(h) }
export const mix = (a, b, p) => { if (p <= 0) return a; if (p >= 1) return b; const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * p).toString(16).padStart(2, '0')).join('') }
export const shade = (c, k) => k > 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k)
