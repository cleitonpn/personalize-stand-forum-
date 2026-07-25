// ============================================================================
//  StandStore — estado único que alimenta AS DUAS vistas (3D + planta baixa).
//  Nenhuma vista fala com a outra: ambas leem daqui e despacham ações.
// ============================================================================
import { createContext, useContext, useReducer, useEffect, useMemo } from 'react'
import {
  PISOS, NAPAS, MOBILIARIO, PAISAGISMO, ELETRICA, PRECOS, REGRAS,
} from '../data/catalogo.js'

const STORAGE_KEY = 'psf.projeto.v1'

// --- configuração inicial = Opção C comprada pelo cliente ---
export const estadoInicial = {
  piso: { grupo: 'carpete_eventos', corId: 'ce-436' }, // preto (padrão da montagem)
  parede: { grupo: 'lisas', corId: 'nl-156' },          // napa preta
  napaMadeira: { corId: 'na-pinus' },                   // parede de madeira clara (aparador/TV)
  deposito: { x: 6.2, z: 0.85, w: 2.3, d: 1.5 },        // centro-fundo
  ledTesteira: false,
  salaReuniao: null, // { x, z, w, d } quando ativa
  mobiliario: [
    { uid: 'm-balcao', tipo: 'balcao', x: 5.0, z: 2.7, rot: 0, base: true },
    { uid: 'm-bistro-1', tipo: 'mesa-bistro', x: 1.6, z: 2.2, rot: 0, base: true },
    { uid: 'm-bistro-2', tipo: 'mesa-bistro', x: 8.4, z: 2.2, rot: 0, base: true },
    { uid: 'm-aparador', tipo: 'aparador', x: 8.6, z: 0.35, rot: 0, base: true },
  ],
  paisagismo: [],
  eletrica: [],   // { uid, tipo, x, z }
  extras: { lonas: 0, logos: 0 },
}

let seq = 0
const novoUid = (p) => `${p}-${Date.now().toString(36)}-${seq++}`

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }

function reducer(state, a) {
  switch (a.type) {
    case 'RESET':
      return structuredClone(estadoInicial)
    case 'CARREGAR':
      return a.payload
    case 'SET_PISO':
      return { ...state, piso: { grupo: a.grupo, corId: a.corId } }
    case 'SET_PAREDE':
      return { ...state, parede: { grupo: a.grupo, corId: a.corId } }
    case 'SET_NAPA_MADEIRA':
      return { ...state, napaMadeira: { corId: a.corId } }
    case 'TOGGLE_LED':
      return { ...state, ledTesteira: !state.ledTesteira }

    case 'MOVER_DEPOSITO': {
      const { largura, profundidade } = REGRAS.stand
      const { w, d } = state.deposito
      const m = REGRAS.margemParede
      const x = clamp(a.x, w / 2 + m, largura - w / 2 - m)
      const z = clamp(a.z, d / 2, profundidade - d / 2 - m)
      return { ...state, deposito: { ...state.deposito, x, z } }
    }
    case 'REDIM_DEPOSITO': {
      const r = REGRAS.deposito
      let w = clamp(a.w ?? state.deposito.w, r.wMin, r.wMax)
      let d = clamp(a.d ?? state.deposito.d, r.dMin, r.dMax)
      // mantém a área mínima original: se encolheu demais, compensa a outra dimensão
      if (w * d < r.areaMin) {
        if (a.w != null) d = clamp(r.areaMin / w, r.dMin, r.dMax)
        else w = clamp(r.areaMin / d, r.wMin, r.wMax)
      }
      return { ...state, deposito: { ...state.deposito, w, d } }
    }

    case 'TOGGLE_SALA':
      return state.salaReuniao
        ? { ...state, salaReuniao: null }
        : { ...state, salaReuniao: { x: 2.4, z: 1.6, w: 3.2, d: 2.6 } }
    case 'REDIM_SALA': {
      if (!state.salaReuniao) return state
      const r = REGRAS.salaReuniao
      const w = clamp(a.w ?? state.salaReuniao.w, r.wMin, r.wMax)
      const d = clamp(a.d ?? state.salaReuniao.d, r.dMin, r.dMax)
      return { ...state, salaReuniao: { ...state.salaReuniao, w, d } }
    }
    case 'MOVER_SALA': {
      if (!state.salaReuniao) return state
      const { largura, profundidade } = REGRAS.stand
      const { w, d } = state.salaReuniao
      const x = clamp(a.x, w / 2, largura - w / 2)
      const z = clamp(a.z, d / 2, profundidade - d / 2 - REGRAS.margemParede)
      return { ...state, salaReuniao: { ...state.salaReuniao, x, z } }
    }

    case 'ADD_MOBILIARIO':
      return { ...state, mobiliario: [...state.mobiliario, { uid: novoUid('m'), tipo: a.tipo, x: a.x ?? 5, z: a.z ?? 3.2, rot: 0, base: false }] }
    case 'MOVER_MOBILIARIO':
      return { ...state, mobiliario: state.mobiliario.map((m) => m.uid === a.uid ? { ...m, x: a.x, z: a.z } : m) }
    case 'GIRAR_MOBILIARIO':
      return { ...state, mobiliario: state.mobiliario.map((m) => m.uid === a.uid ? { ...m, rot: (m.rot + Math.PI / 2) % (Math.PI * 2) } : m) }
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

    default:
      return state
  }
}

// ---------- ORÇAMENTO derivado do estado ----------
export function calcularOrcamento(state) {
  const linhas = []
  const add = (label, valor, detalhe) => { if (valor) linhas.push({ label, valor, detalhe }) }

  if (state.piso.grupo === 'vinilico')
    add('Upgrade para piso vinílico', PRECOS.vinilicoUpgrade, 'área cheia (40 m²)')
  if (state.ledTesteira)
    add('Painéis de LED na testeira', PRECOS.ledTesteiraPar, 'par (colunas frontais)')
  if (state.salaReuniao) {
    const { w, d } = state.salaReuniao
    add('Sala de reunião de vidro', PRECOS.salaReuniao, `${w.toFixed(1)} × ${d.toFixed(1)} m, com porta`)
  }

  // mobiliário extra (o base incluso não conta)
  for (const m of state.mobiliario) {
    if (m.base) continue
    const meta = MOBILIARIO.find((x) => x.id === m.tipo)
    if (meta?.preco) add(`Mobiliário: ${meta.nome}`, meta.preco)
  }
  for (const p of state.paisagismo) {
    const meta = PAISAGISMO.find((x) => x.id === p.tipo)
    if (meta?.preco) add(`Paisagismo: ${meta.nome}`, meta.preco)
  }
  // elétrica agrupada por tipo
  const porTipo = {}
  for (const e of state.eletrica) porTipo[e.tipo] = (porTipo[e.tipo] || 0) + 1
  for (const [tipo, qtd] of Object.entries(porTipo)) {
    const meta = ELETRICA.find((x) => x.id === tipo)
    if (meta) add(`Elétrica: ${meta.nome} ×${qtd}`, meta.preco * qtd)
  }
  if (state.extras.lonas) add(`Lonas adicionais ×${state.extras.lonas}`, PRECOS.lonaExtra * state.extras.lonas)
  if (state.extras.logos) add(`Logos adicionais ×${state.extras.logos}`, PRECOS.logoExtra * state.extras.logos)

  const total = linhas.reduce((s, l) => s + l.valor, 0)
  return { linhas, total }
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
