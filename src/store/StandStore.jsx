// ============================================================================
//  StandStore — estado único que alimenta AS DUAS vistas (3D + planta baixa).
// ============================================================================
import { createContext, useContext, useReducer, useEffect, useMemo } from 'react'
import {
  PISOS, NAPAS, MOBILIARIO, PAISAGISMO, ELETRICA, PRECOS, REGRAS, DEMO_MODE,
} from '../data/catalogo.js'

const STORAGE_KEY = 'psf.projeto.v4'

// paredes personalizáveis (cor de napa e/ou lona), agrupadas em zonas
export const PAREDES = {
  'fundo-esq': { rotulo: 'Fundo · esquerda', zona: 'fundo' },
  'fundo-centro': { rotulo: 'Fundo · centro', zona: 'fundo' },
  'fundo-dir': { rotulo: 'Fundo · direita (madeira)', zona: 'fundo' },
  'dep-esq': { rotulo: 'Depósito · esquerda', zona: 'deposito' },
  'dep-frente': { rotulo: 'Depósito · frente', zona: 'deposito' },
  'dep-dir': { rotulo: 'Depósito · direita', zona: 'deposito' },
  'dep-fundo': { rotulo: 'Depósito · fundo', zona: 'deposito' },
  'col-esq': { rotulo: 'Coluna esq · frente', zona: 'colunas' },
  'col-esq-verso': { rotulo: 'Coluna esq · costas', zona: 'colunas' },
  'col-dir': { rotulo: 'Coluna dir · frente', zona: 'colunas' },
  'col-dir-verso': { rotulo: 'Coluna dir · costas', zona: 'colunas' },
}
export const ZONAS = {
  fundo: { rotulo: 'Parede do fundo', walls: ['fundo-esq', 'fundo-centro', 'fundo-dir'] },
  deposito: { rotulo: 'Depósito (bloco)', walls: ['dep-esq', 'dep-frente', 'dep-dir', 'dep-fundo'] },
  colunas: { rotulo: 'Colunas da frente', walls: ['col-esq', 'col-esq-verso', 'col-dir', 'col-dir-verso'] },
}

const napa = (corId, grupo = 'lisas') => ({ grupo, corId, lona: null })
export const estadoInicial = {
  piso: { grupo: 'carpete_eventos', corId: 'ce-436' },
  paredes: {
    'fundo-esq': napa('nl-156'),
    'fundo-centro': napa('nl-156'),
    'fundo-dir': { grupo: 'amadeiradas', corId: 'na-pinus', lona: null },
    'dep-esq': napa('nl-156'),
    'dep-frente': napa('nl-156'),
    'dep-dir': napa('nl-156'),
    'dep-fundo': napa('nl-156'),
    'col-esq': napa('nl-156'),
    'col-esq-verso': napa('nl-156'),
    'col-dir': napa('nl-156'),
    'col-dir-verso': napa('nl-156'),
  },
  paredeSel: 'fundo-esq',
  deposito: { x: 6.4, z: 0.85, w: 2.3, d: 1.5 },
  led: { colunas: 'nenhum', testeira: false },   // combináveis
  tv: { presente: true, x: 8.3 },
  balcaoCfg: { corId: 'nl-156', logoUrl: null },
  salaReuniao: null, // { x, z, w, d, pisoGrupo, pisoCorId }
  mobiliario: [
    { uid: 'm-balcao', tipo: 'balcao', x: 4.6, z: 2.7, rot: 0, base: true },
    { uid: 'm-bistro-1', tipo: 'mesa-bistro', x: 1.8, z: 2.0, rot: 0, base: true },
    { uid: 'm-bistro-2', tipo: 'mesa-bistro', x: 7.6, z: 2.6, rot: 0, base: true },
    { uid: 'm-aparador', tipo: 'aparador', x: 8.3, z: 0.55, rot: 0, base: true },
  ],
  paisagismo: [],
  eletrica: [],
  extras: { logos: 0 },
}

let seq = 0
const novoUid = (p) => `${p}-${Date.now().toString(36)}-${seq++}`
const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

function reducer(state, a) {
  switch (a.type) {
    case 'RESET': return structuredClone(estadoInicial)
    case 'CARREGAR': return { ...structuredClone(estadoInicial), ...a.payload }

    case 'SET_PISO':
      return { ...state, piso: { grupo: a.grupo, corId: a.corId } }

    case 'SELECT_PAREDE':
      return { ...state, paredeSel: a.parede }
    case 'SET_PAREDE_COR':
      return { ...state, paredes: { ...state.paredes, [a.parede]: { ...state.paredes[a.parede], grupo: a.grupo, corId: a.corId } } }
    case 'SET_LONA':
      return { ...state, paredes: { ...state.paredes, [a.parede]: { ...state.paredes[a.parede], lona: a.lona } } }
    case 'REMOVE_LONA':
      return { ...state, paredes: { ...state.paredes, [a.parede]: { ...state.paredes[a.parede], lona: null } } }
    case 'APLICAR_BLOCO': {
      const origem = state.paredes[a.de]
      const novas = { ...state.paredes }
      for (const id of ZONAS[a.zona].walls) novas[id] = { ...origem }
      return { ...state, paredes: novas }
    }

    case 'SET_LED_COLUNAS':
      return { ...state, led: { ...state.led, colunas: a.modo } }
    case 'TOGGLE_LED_TESTEIRA':
      return { ...state, led: { ...state.led, testeira: !state.led.testeira } }

    case 'SET_TV':
      return { ...state, tv: { ...state.tv, ...a.tv } }

    case 'SET_BALCAO':
      return { ...state, balcaoCfg: { ...state.balcaoCfg, ...a.cfg } }

    case 'MOVER_DEPOSITO': {
      const { largura, profundidade } = REGRAS.stand
      const { w, d } = state.deposito
      const m = REGRAS.margemParede
      return { ...state, deposito: { ...state.deposito, x: clamp(a.x, w / 2 + m, largura - w / 2 - m), z: clamp(a.z, d / 2, profundidade - d / 2 - m) } }
    }
    case 'REDIM_DEPOSITO': {
      const r = REGRAS.deposito
      let w = clamp(a.w ?? state.deposito.w, r.wMin, r.wMax)
      let d = clamp(a.d ?? state.deposito.d, r.dMin, r.dMax)
      if (w * d < r.areaMin) {
        if (a.w != null) d = clamp(r.areaMin / w, r.dMin, r.dMax)
        else w = clamp(r.areaMin / d, r.wMin, r.wMax)
      }
      return { ...state, deposito: { ...state.deposito, w, d } }
    }

    case 'TOGGLE_SALA':
      return state.salaReuniao
        ? { ...state, salaReuniao: null }
        : { ...state, salaReuniao: { x: 2.4, z: 1.6, w: 3.2, d: 2.6, pisoGrupo: null, pisoCorId: null } }
    case 'SET_SALA_PISO':
      if (!state.salaReuniao) return state
      return { ...state, salaReuniao: { ...state.salaReuniao, pisoGrupo: a.grupo, pisoCorId: a.corId } }
    case 'REDIM_SALA': {
      if (!state.salaReuniao) return state
      const r = REGRAS.salaReuniao
      return { ...state, salaReuniao: { ...state.salaReuniao, w: clamp(a.w ?? state.salaReuniao.w, r.wMin, r.wMax), d: clamp(a.d ?? state.salaReuniao.d, r.dMin, r.dMax) } }
    }
    case 'MOVER_SALA': {
      if (!state.salaReuniao) return state
      const { largura, profundidade } = REGRAS.stand
      const { w, d } = state.salaReuniao
      return { ...state, salaReuniao: { ...state.salaReuniao, x: clamp(a.x, w / 2, largura - w / 2), z: clamp(a.z, d / 2, profundidade - d / 2 - REGRAS.margemParede) } }
    }

    case 'ADD_MOBILIARIO':
      return { ...state, mobiliario: [...state.mobiliario, { uid: novoUid('m'), tipo: a.tipo, x: a.x ?? 5, z: a.z ?? 3.2, rot: 0, base: false }] }
    case 'MOVER_MOBILIARIO':
      return { ...state, mobiliario: state.mobiliario.map((m) => m.uid === a.uid ? { ...m, x: a.x, z: a.z } : m) }
    case 'GIRAR_MOBILIARIO':
      return { ...state, mobiliario: state.mobiliario.map((m) => m.uid === a.uid ? { ...m, rot: (m.rot + Math.PI / 4) % (Math.PI * 2) } : m) }
    case 'REMOVER_MOBILIARIO':
      return { ...state, mobiliario: state.mobiliario.filter((m) => m.uid !== a.uid) }

    case 'ADD_PAISAGISMO':
      return { ...state, paisagismo: [...state.paisagismo, { uid: novoUid('p'), tipo: a.tipo, x: a.x ?? 4, z: a.z ?? 3.4 }] }
    case 'MOVER_PAISAGISMO':
      return { ...state, paisagismo: state.paisagismo.map((p) => p.uid === a.uid ? { ...p, x: a.x, z: a.z } : p) }
    case 'REMOVER_PAISAGISMO':
      return { ...state, paisagismo: state.paisagismo.filter((p) => p.uid !== a.uid) }

    case 'ADD_ELETRICA':
      return { ...state, eletrica: [...state.eletrica, { uid: novoUid('e'), tipo: a.tipo, x: a.x, z: a.z }] }
    case 'REMOVER_ELETRICA':
      return { ...state, eletrica: state.eletrica.filter((e) => e.uid !== a.uid) }

    case 'SET_EXTRA':
      return { ...state, extras: { ...state.extras, [a.chave]: Math.max(0, a.valor) } }

    default: return state
  }
}

const LED_COL_LABEL = {
  coluna1: 'Painel de LED — 1 coluna frontal',
  colunas2: 'Painel de LED — 2 colunas frontais',
}

export function calcularOrcamento(state) {
  const linhas = []
  const add = (label, valor, detalhe) => { if (valor) linhas.push({ label, valor: DEMO_MODE ? 0 : valor, detalhe }) }

  if (state.piso.grupo === 'vinilico') add('Upgrade para piso vinílico', PRECOS.vinilicoUpgrade, 'área cheia (40 m²)')

  if (state.led.colunas !== 'nenhum') add(LED_COL_LABEL[state.led.colunas], PRECOS.led[state.led.colunas])
  if (state.led.testeira) add('Painel de LED — testeira frontal + laterais', PRECOS.led.testeira)

  if (state.salaReuniao) {
    const { w, d } = state.salaReuniao
    add('Sala de reunião de vidro', PRECOS.salaReuniao, `${w.toFixed(1)} × ${d.toFixed(1)} m, com porta`)
  }

  for (const [id, p] of Object.entries(state.paredes)) {
    if (p.lona) add(`Lona impressa — ${PAREDES[id].rotulo}`, PRECOS.lonaParede)
  }

  for (const m of state.mobiliario) {
    if (m.base) continue
    const meta = MOBILIARIO.find((x) => x.id === m.tipo)
    if (meta?.preco) add(`Mobiliário: ${meta.nome}`, meta.preco)
  }
  for (const p of state.paisagismo) {
    const meta = PAISAGISMO.find((x) => x.id === p.tipo)
    if (meta?.preco) add(`Paisagismo: ${meta.nome}`, meta.preco)
  }
  const porTipo = {}
  for (const e of state.eletrica) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1
  for (const [tipo, qtd] of Object.entries(porTipo)) {
    const meta = ELETRICA.find((x) => x.id === tipo)
    if (meta) add(`Elétrica: ${meta.nome} ×${qtd}`, meta.preco * qtd)
  }
  if (state.extras.logos) add(`Logos adicionais ×${state.extras.logos}`, PRECOS.logoExtra * state.extras.logos)

  return { linhas, total: linhas.reduce((s, l) => s + l.valor, 0) }
}

// ---------- link compartilhável ----------
export function codificarProjeto(state) {
  const slim = structuredClone(state)
  // imagens enviadas (data URLs) são grandes demais para URL — troca por lona padrão
  for (const p of Object.values(slim.paredes)) {
    if (p.lona?.fonte === 'custom') p.lona = { fonte: 'padrao', id: 'lona-marca' }
  }
  if (slim.balcaoCfg?.logoUrl) slim.balcaoCfg = { ...slim.balcaoCfg, logoUrl: null }
  return btoa(unescape(encodeURIComponent(JSON.stringify(slim))))
}
function decodificarHash() {
  try {
    if (location.hash.startsWith('#p=')) {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(3)))))
      history.replaceState(null, '', location.pathname + location.search)
      return parsed
    }
  } catch { /* hash inválido — ignora */ }
  return null
}

const StandCtx = createContext(null)

export function StandProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const doLink = decodificarHash()
    if (doLink) return { ...structuredClone(estadoInicial), ...doLink }
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...structuredClone(estadoInicial), ...JSON.parse(raw) }
    } catch { /* ignora */ }
    return structuredClone(estadoInicial)
  })
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* ignora */ }
  }, [state])

  const orcamento = useMemo(() => calcularOrcamento(state), [state])
  const value = useMemo(() => ({ state, dispatch, orcamento }), [state, orcamento])
  return <StandCtx.Provider value={value}>{children}</StandCtx.Provider>
}

export function useStand() {
  const ctx = useContext(StandCtx)
  if (!ctx) throw new Error('useStand fora do StandProvider')
  return ctx
}

export { PISOS, NAPAS, MOBILIARIO, PAISAGISMO, ELETRICA, REGRAS, DEMO_MODE }
