// ============================================================================
//  StandStore — estado único que alimenta AS DUAS vistas (3D + planta baixa).
// ============================================================================
import { createContext, useContext, useReducer, useEffect, useMemo } from 'react'
import {
  PISOS, NAPAS, MOBILIARIO, PAISAGISMO, ELETRICA, PRECOS, REGRAS,
} from '../data/catalogo.js'

const STORAGE_KEY = 'psf.projeto.v2'

// paredes que o cliente pode personalizar (cor de napa e/ou lona)
export const PAREDES = {
  fundo: { rotulo: 'Fundo — napa' },
  direita: { rotulo: 'Fundo — painel de madeira' },
}

export const estadoInicial = {
  piso: { grupo: 'carpete_eventos', corId: 'ce-436' },
  paredes: {
    fundo: { grupo: 'lisas', corId: 'nl-156', lona: null },
    direita: { grupo: 'amadeiradas', corId: 'na-pinus', lona: null },
  },
  paredeSel: 'fundo',
  deposito: { x: 6.4, z: 0.85, w: 2.3, d: 1.5 },
  led: 'nenhum', // 'nenhum' | 'colunas2' | 'coluna1' | 'testeira'
  salaReuniao: null,
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
    case 'CARREGAR': return a.payload

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

    case 'SET_LED':
      return { ...state, led: a.modo }

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
      return state.salaReuniao ? { ...state, salaReuniao: null } : { ...state, salaReuniao: { x: 2.4, z: 1.6, w: 3.2, d: 2.6 } }
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

const LED_LABEL = {
  colunas2: 'Painel de LED — 2 colunas frontais',
  coluna1: 'Painel de LED — 1 coluna frontal',
  testeira: 'Painel de LED — testeira frontal + laterais',
}

export function calcularOrcamento(state) {
  const linhas = []
  const add = (label, valor, detalhe) => { if (valor) linhas.push({ label, valor, detalhe }) }

  if (state.piso.grupo === 'vinilico') add('Upgrade para piso vinílico', PRECOS.vinilicoUpgrade, 'área cheia (40 m²)')

  if (state.led !== 'nenhum') add(LED_LABEL[state.led], PRECOS.led[state.led])

  if (state.salaReuniao) {
    const { w, d } = state.salaReuniao
    add('Sala de reunião de vidro', PRECOS.salaReuniao, `${w.toFixed(1)} × ${d.toFixed(1)} m, com porta`)
  }

  // lonas por parede
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

const StandCtx = createContext(null)

export function StandProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
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

export { PISOS, NAPAS, MOBILIARIO, PAISAGISMO, ELETRICA, REGRAS }
