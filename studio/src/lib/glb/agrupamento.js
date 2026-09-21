import { organizarElementos, listarElementos } from './elementos.js'
import { superficiesPadrao } from './superficies.js'
import { detectarObjetos, numerar } from './objetos.js'

export const chavesDoElemento = e => [...new Set([...e.superficies.flatMap(s => s.pecas), ...e.objetos.flatMap(o => o.pecas)])]
const idDe = chaves => {
  let h = 2166136261
  for (const c of chaves.slice().sort().join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return `manual-${(h >>> 0).toString(36)}`
}

// Recalcula somente as partes do elemento escolhido; não desfaz decisões fora dele.
export function sugerirPartes(elemento, superficies, analise) {
  const chaves = new Set(chavesDoElemento(elemento))
  const a = { ...analise, pecas: analise.pecas.filter(p => chaves.has(p.chave)) }
  const base = superficiesPadrao(a, Object.fromEntries(analise.materiais.map(m => [m.nome, m.papelSugerido]))).filter(s => s.pecas.length)
  const objetos = numerar(detectarObjetos(a, {}, { superficies: base }))
  const ss = organizarElementos(a, base, objetos)
  return listarElementos(ss, objetos, a).map(e => ({ nome: e.nome, tipo: e.tipo, chaves: chavesDoElemento(e) })).filter(g => g.chaves.length)
}

export function aplicarGrupos({ grupos, superficies, objetos, analise, complementos = [], acabamentos = {} }) {
  const todas = grupos.flatMap(g => g.chaves)
  const afetadas = new Set(todas)
  if (!grupos.length || grupos.some(g => !g.chaves.length) || todas.length !== afetadas.size) throw new Error('Cada parte deve pertencer a um único grupo.')
  const conhecidas = new Set(superficies.flatMap(s => s.pecas))
  if (todas.some(k => !conhecidas.has(k))) throw new Error('Há partes que não pertencem ao mapeamento atual.')
  const ids = grupos.map(g => idDe(g.chaves)), remapeados = new Map()
  const novas = superficies.flatMap(s => {
    const restantes = [...new Set(s.pecas.filter(k => !afetadas.has(k)))]
    const saida = restantes.length ? [{ ...s, pecas: restantes }] : []
    grupos.forEach((g, i) => {
      const ks = new Set(g.chaves), pecas = [...new Set(s.pecas.filter(k => ks.has(k)))]
      if (!pecas.length) return
      saida.push({ ...s, id: saida.length ? `${s.id}-${ids[i]}` : s.id, pecas,
        elementoId: ids[i], grupoManual: ids[i], tipoElemento: g.tipo,
        tipoManual: true, nome: g.nome, nomeManual: true, revisado: false,
        ...(g.tipo === 'logo' ? { papel: 'adesivo', podeCor: true, podeArte: true, podeRemover: true } : {}) })
    })
    remapeados.set(s.id, saida.map(x => x.id))
    return saida
  })
  const detectados = numerar(detectarObjetos(analise, {}, { superficies: novas }))
  const assinatura = ps => [...new Set(ps)].sort().join('|')
  const antigos = new Map(objetos.map(o => [assinatura(o.pecas), o]))
  const intactos = objetos.filter(o => !o.pecas.some(k => afetadas.has(k)))
  const chavesIntactas = new Set(intactos.flatMap(o => o.pecas))
  const novosObjetos = detectados.filter(o => !o.pecas.some(k => chavesIntactas.has(k))).map(o => {
    const anterior = antigos.get(assinatura(o.pecas))
    const g = grupos.find(g => o.pecas.every(k => g.chaves.includes(k)))
    if (anterior) return g ? { ...anterior, nome: g.nome, nomeManual: true, revisado: false } : anterior
    const fonte = objetos.find(a => o.pecas.every(k => a.pecas.includes(k)))
    const fontes = objetos.filter(a => a.pecas.some(k => o.pecas.includes(k)))
    if (!fonte && fontes.some(a => Object.values(a.transform || {}).some(v => Math.abs(v) > 1e-8))) {
      throw new Error('Volte os móveis à posição original antes de juntá-los. Assim a união não desloca suas partes.')
    }
    let transform = o.transform
    if (fonte) {
      const t = fonte.transform || {}, ang = t.rotY || 0
      const x = o.apoio[0] - fonte.apoio[0], z = o.apoio[2] - fonte.apoio[2]
      transform = { dx: (t.dx || 0) + Math.cos(ang) * x + Math.sin(ang) * z - x,
        dz: (t.dz || 0) - Math.sin(ang) * x + Math.cos(ang) * z - z, rotY: ang }
    }
    return { ...o, transform, ...(fontes.length ? { podeMover: fontes.every(a => a.podeMover), podeGirar: fontes.every(a => a.podeGirar), incluso: fontes.every(a => a.incluso) } : {}),
      ...(g ? { nome: g.nome, nomeManual: true } : {}), revisado: false }
  })
  return { superficies: novas, objetos: [...intactos, ...novosObjetos],
    acabamentos: Object.fromEntries(Object.entries(acabamentos).flatMap(([id, valor]) => (remapeados.get(id) || [id]).map(novo => [novo, { ...valor }]))),
    complementos: complementos.map(g => ({ ...g, opcoes: (g.opcoes || []).map(o => ({ ...o,
      esconde: [...new Set((o.esconde || []).flatMap(id => remapeados.get(id) || [id]))],
    })) })) }
}
