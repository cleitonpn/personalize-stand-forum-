// A unidade da interface é o elemento físico. As superfícies continuam
// separadas internamente para preservar acabamentos, preços e arquivos antigos.
import { nomeAmigavel } from './nomes.js'

export const TIPOS_ELEMENTO = {
  logo: 'Logo / placa', parede: 'Parede', piso: 'Piso', movel: 'Móvel', estrutura: 'Estrutura', outro: 'Outro elemento',
}
const hash = (s) => {
  let n = 2166136261
  for (const c of s) n = Math.imul(n ^ c.charCodeAt(0), 16777619)
  return (n >>> 0).toString(36)
}
export function tipoDaPeca(p, papel) {
  if (papel === 'piso') return 'piso'
  if (['metal', 'vidro', 'luz', 'ignorar'].includes(papel)) return 'estrutura'
  const d = p.dimensoesLocais || [p.bbox.largura, p.bbox.altura, p.bbox.profundidade]
  const equipamento = /samsung|televis|monitor|smart.*tv/i.test(p.nomeComponente || '')
  if (!equipamento && ['mobiliario', 'adesivo'].includes(papel)
    && Math.min(...d) < 0.06 && p.bbox.min?.[1] > 0.35 && p.bbox.max?.[1] < 2.8
    && p.bbox.altura > 0.25 && Math.max(p.bbox.largura, p.bbox.profundidade) > 0.5) return 'logo'
  const fino = Math.min(...d) < 0.4
  const face = d.slice().sort((a, b) => a - b)[1] > 0.5
  const vertical = p.normalPlano ? Math.abs(p.normalPlano[1]) < 0.25 : p.bbox.altura > Math.min(p.bbox.largura, p.bbox.profundidade) * 3
  if (fino && vertical && p.bbox.altura > 1.2 && ['bagum', 'lona', 'madeira', 'adesivo'].includes(papel)) return 'parede'
  const nomeDeMovel = /tiffany|eames|cadeira|chair|banqueta|sof[aá]|poltrona/i.test(p.materialNome || '')
  if (papel === 'mobiliario' && !nomeDeMovel && fino && face && vertical
    && (p.bbox.altura > 1.2 || (p.bbox.min?.[1] > 2.2 && p.bbox.altura > 0.6))) return 'parede'
  if (papel === 'bagum' || papel === 'lona') return 'parede'
  return ['mobiliario', 'madeira', 'adesivo'].includes(papel) ? 'movel' : 'outro'
}
const perto = (a, b) => [0, 1, 2].every(k => a.bbox.min[k] <= b.bbox.max[k] + 0.08 && a.bbox.max[k] + 0.08 >= b.bbox.min[k])
function mesmoPlano(a, b) {
  if (!a.normalPlano || !b.normalPlano) return false
  const dot = a.normalPlano.reduce((n, v, k) => n + v * b.normalPlano[k], 0)
  if (Math.abs(dot) < 0.995) return false
  const distancia = Math.abs(a.normalPlano.reduce((n, v, k) => n + v * (b.bbox.centro[k] - a.bbox.centro[k]), 0))
  if (distancia > 0.08 || !perto(a, b)) return false
  // Encostar pelas bordas não transforma painéis independentes numa parede só.
  const normal = a.normalPlano.map(Math.abs)
  const eixo = normal.indexOf(Math.max(...normal))
  const planos = [0, 1, 2].filter(k => k !== eixo)
  return planos.every(k => Math.min(a.bbox.max[k], b.bbox.max[k]) - Math.max(a.bbox.min[k], b.bbox.min[k]) > 0.02)
}

/** Sugestões geométricas, nunca um remapeamento silencioso de decisões manuais.
 * Superfícies referenciadas por complementos conservam IDs e abrangência.
 * A grade reduz comparações; planos inclinados usam normais em espaço-mundo.
 */
export function organizarElementos(analise, superficies, objetos = [], complementos = []) {
  const protegidas = new Set(complementos.flatMap(g => [g.ancora, ...(g.opcoes || []).flatMap(o => o.esconde || [])]))
  const porPeca = new Map(superficies.flatMap(s => s.pecas.map(k => [k, s])))
  const porObjeto = new Map(objetos.flatMap(o => o.pecas.map(k => [k, o])))
  const pecas = [...new Map(analise.pecas.map(p => [p.chave, p])).values()].filter(p => porPeca.has(p.chave))
  const pais = pecas.map((_, i) => i)
  const raiz = (i) => { while (pais[i] !== i) { pais[i] = pais[pais[i]]; i = pais[i] } return i }
  const unir = (i, j) => { pais[raiz(j)] = raiz(i) }
  const tipos = pecas.map(p => tipoDaPeca(p, porPeca.get(p.chave).papel))
  const grade = new Map()
  const objetosVistos = new Map()
  pecas.forEach((p, i) => {
    const s = porPeca.get(p.chave)
    if (s.grupoManual || s.agrupada || s.nomeManual || s.tipoManual || s.permsManuais || s.revisado || protegidas.has(s.id)) return
    const obj = porObjeto.get(p.chave)
    if (tipos[i] === 'movel' && obj) {
      if (objetosVistos.has(obj.id)) unir(i, objetosVistos.get(obj.id))
      else objetosVistos.set(obj.id, i)
      return
    }
    if (!['parede', 'piso'].includes(tipos[i])) return
    const min = p.bbox.min.map(n => Math.floor((n - 0.08) / 2))
    const max = p.bbox.max.map(n => Math.floor((n + 0.08) / 2))
    if (max.reduce((n, v, k) => n * (v - min[k] + 1), 1) > 4096) return
    const vistos = new Set()
    for (let x = min[0]; x <= max[0]; x++) for (let y = min[1]; y <= max[1]; y++) for (let z = min[2]; z <= max[2]; z++) {
      const k = `${x},${y},${z}`
      for (const j of grade.get(k) || []) if (!vistos.has(j)) {
        vistos.add(j)
        if (tipos[i] === tipos[j] && mesmoPlano(p, pecas[j])) unir(i, j)
      }
      if (!grade.has(k)) grade.set(k, [])
      grade.get(k).push(i)
    }
  })
  const membros = new Map()
  pecas.forEach((p, i) => {
    const r = raiz(i)
    if (!membros.has(r)) membros.set(r, [])
    membros.get(r).push(p.chave)
  })
  const ids = new Map([...membros].map(([r, chaves]) => [r, `el-${hash(chaves.slice().sort().join('|'))}`]))
  const grupoDaPeca = new Map()
  const porChave = new Map(pecas.map(p => [p.chave, p]))
  pecas.forEach((p, i) => grupoDaPeca.set(p.chave, {
    id: ids.get(raiz(i)),
    tipo: tipos[i],
  }))
  const permissoesGrupo = new Map()
  for (const p of pecas) {
    const g = grupoDaPeca.get(p.chave), s = porPeca.get(p.chave)
    if (g.tipo !== 'parede' || s.papel === 'mobiliario') continue
    const anterior = permissoesGrupo.get(g.id) || {}
    permissoesGrupo.set(g.id, { podeCor: !!(anterior.podeCor || s.podeCor), podeArte: !!(anterior.podeArte || s.podeArte) })
  }
  return superficies.flatMap(s => {
    const ps = s.pecas.map(k => porChave.get(k)).filter(Boolean)
    const tipo = s.tipoElemento || (ps.length ? tipoDaPeca(ps[0], s.papel) : 'outro')
    if (s.grupoManual || s.agrupada || s.nomeManual || s.tipoManual || s.permsManuais || s.revisado || protegidas.has(s.id)) {
      return [{ ...s, tipoElemento: tipo, elementoId: s.elementoId || s.id }]
    }
    // Estruturas fixas não exigem uma confirmação para cada parafuso ou perfil.
    if (tipo === 'estrutura' && ps.every(p => tipoDaPeca(p, s.papel) === 'estrutura')) {
      return [{ ...s, tipoElemento: tipo, elementoId: s.elementoId || s.id, revisado: false,
        motivoElemento: 'Partes fixas reunidas. Confira se este conjunto deve permanecer sem personalização.' }]
    }
    const grupos = new Map()
    for (const k of s.pecas) {
      const g = grupoDaPeca.get(k) || { id: s.id, tipo }
      if (!grupos.has(g.id)) grupos.set(g.id, { ...g, pecas: [] })
      grupos.get(g.id).pecas.push(k)
    }
    return [...grupos.values()].map((g, i) => ({ ...s,
      id: i === 0 ? s.id : `${s.id}-${hash(g.pecas.slice().sort().join('|'))}`,
      elementoId: g.id, tipoElemento: g.tipo, pecas: [...new Set(g.pecas)],
      // Camada anônima sobre a mesma parede acompanha seu acabamento.
      // O papel original continua disponível para a regra de preço do projeto.
      ...(s.papel === 'mobiliario' && g.tipo === 'parede' ? permissoesGrupo.get(g.id) : {}),
      ...(g.tipo === 'logo' ? { papel: 'adesivo', podeCor: true, podeArte: true, podeRemover: true } : {}),
      revisado: false,
      motivoElemento: ['parede', 'piso'].includes(g.tipo)
        ? 'Identificado pela forma, orientação e continuidade das peças.'
        : 'Confira se todas as partes deste elemento estão juntas.',
    }))
  })
}

export function listarElementos(superficies = [], objetos = [], analise, recorte) {
  const grupos = new Map()
  const porPeca = new Map((analise?.pecas || []).map(p => [p.chave, p]))
  for (const s of superficies) {
    if (s.papel === 'ignorar') continue
    const ps = s.pecas.map(k => porPeca.get(k)).filter(Boolean)
    if (recorte && !ps.some(p => dentro(p.bbox.centro, recorte))) continue
    const id = s.elementoId || s.id
    if (!grupos.has(id)) grupos.set(id, { id, superficies: [], objetos: [] })
    grupos.get(id).superficies.push(s)
  }
  const lista = [...grupos.values()]
  for (const e of lista) {
    const s = e.superficies[0]
    const chaves = new Set(e.superficies.flatMap(x => x.pecas))
    e.tipo = s.tipoElemento || tipoDaPeca(porPeca.get(s.pecas[0]) || { bbox: { largura: 0, altura: 0, profundidade: 0 } }, s.papel)
    e.nome = e.superficies.find(x => x.nomeManual)?.nome || (analise ? nomeAmigavel({ ...s, papel: e.tipo === 'parede' ? 'bagum' : s.papel, pecas: [...chaves] }, analise, recorte) : s.nome)
    if (e.tipo === 'logo' && !e.superficies.some(x => x.nomeManual)) e.nome = 'Logo / placa'
    const ps = [...chaves].map(k => porPeca.get(k)).filter(Boolean)
    if (!e.superficies.some(x => x.nomeManual) && e.tipo === 'parede' && ps.length
      && ps.every(p => p.bbox.min[1] > 2.2 && p.bbox.altura < 1.5)) {
      e.nome = e.nome.replace(/^Paredes/, 'Testeiras').replace(/^Parede/, 'Testeira')
    }
    // Só associa um móvel inteiro; uma superfície antiga que contém várias
    // cadeiras não transforma todas elas em um único controle de movimento.
    e.objetos = objetos.filter(o => o.pecas.every(k => chaves.has(k)))
    e.revisado = e.superficies.every(x => x.revisado) && e.objetos.every(x => x.revisado)
  }
  for (const o of objetos) {
    if (recorte && !dentro(o.centro, recorte)) continue
    const donos = lista.filter(e => e.objetos.some(x => x.id === o.id))
    if (donos.length === 1 && donos[0].objetos.length === 1) {
      if (donos[0].tipo === 'movel') donos[0].nome = o.nome
      continue
    }
    for (const e of donos) e.objetos = e.objetos.filter(x => x.id !== o.id)
    lista.push({ id: `obj:${o.id}`, nome: o.nome, tipo: 'movel', superficies: [], objetos: [o], revisado: !!o.revisado })
  }
  const ordem = { logo: -1, parede: 0, piso: 1, movel: 2, estrutura: 3, outro: 4 }
  lista.sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || a.nome.localeCompare(b.nome, 'pt-BR'))
  const contagem = new Map()
  for (const e of lista) contagem.set(e.nome, (contagem.get(e.nome) || 0) + 1)
  const sequencia = new Map()
  for (const e of lista) if (contagem.get(e.nome) > 1) {
    const n = (sequencia.get(e.nome) || 0) + 1
    sequencia.set(e.nome, n)
    e.nome = `${e.nome} ${n}`
  }
  return lista
}
export function dentro(c, r) {
  return c[0] >= Math.min(r.x0, r.x1) && c[0] <= Math.max(r.x0, r.x1)
    && c[2] >= Math.min(r.z0, r.z1) && c[2] <= Math.max(r.z0, r.z1)
}

export function limitarTransformacao(obj, patch, limites) {
  const anterior = { dx: 0, dz: 0, rotY: 0, ...obj.transform }
  const t = { ...anterior }
  if (obj.podeMover) for (const k of ['dx', 'dz']) if (Number.isFinite(patch[k])) t[k] = patch[k]
  if (obj.podeGirar && Number.isFinite(patch.rotY)) t.rotY = patch.rotY
  if (!limites) return t
  const c = Math.abs(Math.cos(t.rotY)), s = Math.abs(Math.sin(t.rotY))
  const l = (obj.largura * c + obj.profundidade * s) / 2
  const p = (obj.largura * s + obj.profundidade * c) / 2
  const clamp = (n, a, b) => a > b ? (a + b) / 2 : Math.max(a, Math.min(b, n))
  const dx = clamp(obj.apoio[0] + t.dx, limites.x0 + l, limites.x1 - l) - obj.apoio[0]
  const dz = clamp(obj.apoio[2] + t.dz, limites.z0 + p, limites.z1 - p) - obj.apoio[2]
  if (!obj.podeMover && (Math.abs(dx - t.dx) > 0.001 || Math.abs(dz - t.dz) > 0.001)) return anterior
  return { ...t, dx, dz }
}
