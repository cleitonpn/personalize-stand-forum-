import { useStand, PAREDES } from '../store/StandStore.jsx'
import {
  corPorId, fmtBRL, CLIENTE_DEMO, MOBILIARIO, PAISAGISMO, ELETRICA, PISOS, NAPAS,
} from '../data/catalogo.js'

const LED_TXT = {
  nenhum: 'não',
  coluna1: '1 coluna frontal',
  colunas2: '2 colunas frontais',
  testeira: 'testeira frontal + laterais',
}
const lonaTxt = (l) => !l ? '—' : l.fonte === 'custom' ? `imagem enviada (${l.nome || 'custom'})` : `padrão (${l.id})`

export default function Resumo() {
  const { state, orcamento } = useStand()
  const pisoCor = corPorId(state.piso.corId)
  const fundoCor = corPorId(state.paredes.fundo.corId)
  const direitaCor = corPorId(state.paredes.direita.corId)

  const briefing = () => construirBriefing(state, orcamento, { pisoCor, fundoCor, direitaCor })

  const exportarPDF = () => {
    const w = window.open('', '_blank')
    if (!w) { alert('Permita pop-ups para gerar o resumo.'); return }
    w.document.write(briefingHTML(briefing())); w.document.close(); w.focus()
    setTimeout(() => w.print(), 350)
  }
  const baixarJSON = () => {
    const blob = new Blob([JSON.stringify(briefing(), null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `resumo-comercial-stand-${CLIENTE_DEMO.empresa.replace(/\W+/g, '-').toLowerCase()}.json`
    a.click(); URL.revokeObjectURL(a.href)
  }

  const linhaCor = (rotulo, cor) => (
    <div className="orc-line">
      <span className="lbl">{rotulo}</span>
      <span className="val" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <i style={{ width: 14, height: 14, borderRadius: 3, background: cor?.hex, display: 'inline-block' }} />{cor?.nome}
      </span>
    </div>
  )

  return (
    <div>
      <div className="resumo-head">
        <h3>Resumo do projeto</h3>
        <div className="empresa">{CLIENTE_DEMO.empresa}</div>
      </div>

      <div className="orc-list">
        <div className="orc-line">
          <span className="lbl">Pacote base · Opção C<small>{CLIENTE_DEMO.area} m² · piso, paredes, testeira, mobiliário base</small></span>
          <span className="val" style={{ color: 'var(--ok)' }}>incluso</span>
        </div>
        {orcamento.linhas.length === 0 && (
          <div className="orc-empty">Nenhum extra selecionado ainda.<br />Personalize no menu à esquerda.</div>
        )}
        {orcamento.linhas.map((l, i) => (
          <div key={i} className="orc-line">
            <span className="lbl">{l.label}{l.detalhe && <small>{l.detalhe}</small>}</span>
            <span className="val">{fmtBRL(l.valor)}</span>
          </div>
        ))}
      </div>

      <div className="orc-total">
        <div className="row"><span className="cap">Total de extras</span></div>
        <div className="row"><span className="big">{fmtBRL(orcamento.total)}</span></div>
        <div className="note">Valores ilustrativos do protótipo. O pacote base já está incluso na compra do espaço.</div>
      </div>

      <div className="orc-list" style={{ paddingBottom: 8 }}>
        {linhaCor('Piso', pisoCor)}
        {linhaCor('Fundo · napa', fundoCor)}
        {linhaCor('Fundo · madeira', direitaCor)}
      </div>

      <div className="resumo-actions">
        <button className="btn btn-primary" onClick={exportarPDF}>Gerar resumo comercial (PDF)</button>
        <button className="btn" onClick={baixarJSON}>Baixar dados (JSON)</button>
        <p className="hint" style={{ margin: '2px 0 0' }}>Documento para o time comercial dar continuidade no atendimento pós-venda.</p>
      </div>
    </div>
  )
}

function construirBriefing(state, orcamento, cores) {
  const elet = {}
  for (const e of state.eletrica) elet[e.tipo] = (elet[e.tipo] || 0) + 1
  const parede = (id, cor) => ({
    parede: PAREDES[id].rotulo,
    tipo: NAPAS[state.paredes[id].grupo]?.rotulo,
    cor: cor?.nome, codigo: cor?.cb, hex: cor?.hex,
    lona: state.paredes[id].lona ? lonaTxt(state.paredes[id].lona) : null,
  })
  return {
    cliente: CLIENTE_DEMO.empresa, opcao: CLIENTE_DEMO.opcao, area: CLIENTE_DEMO.area, medidas: CLIENTE_DEMO.medidas,
    gerado_em: new Date().toLocaleString('pt-BR'),
    piso: { tipo: PISOS[state.piso.grupo]?.rotulo, cor: cores.pisoCor?.nome, codigo: cores.pisoCor?.cb, hex: cores.pisoCor?.hex },
    paredes: [parede('fundo', cores.fundoCor), parede('direita', cores.direitaCor)],
    led: LED_TXT[state.led],
    deposito: { x: +state.deposito.x.toFixed(2), z: +state.deposito.z.toFixed(2), largura: state.deposito.w, profundidade: state.deposito.d, area: +(state.deposito.w * state.deposito.d).toFixed(2) },
    sala_reuniao: state.salaReuniao ? { largura: state.salaReuniao.w, profundidade: state.salaReuniao.d, x: +state.salaReuniao.x.toFixed(2), z: +state.salaReuniao.z.toFixed(2) } : null,
    mobiliario_extra: state.mobiliario.filter((m) => !m.base).map((m) => ({ item: MOBILIARIO.find((x) => x.id === m.tipo)?.nome, x: +m.x.toFixed(2), z: +m.z.toFixed(2), rotacao_graus: Math.round((m.rot * 180) / Math.PI) })),
    paisagismo: state.paisagismo.map((p) => ({ item: PAISAGISMO.find((x) => x.id === p.tipo)?.nome, x: +p.x.toFixed(2), z: +p.z.toFixed(2) })),
    eletrica_pontos: state.eletrica.map((e) => ({ tipo: ELETRICA.find((x) => x.id === e.tipo)?.nome, x: +e.x.toFixed(2), z: +e.z.toFixed(2) })),
    logos_extra: state.extras.logos,
    orcamento_extras: orcamento.linhas.map((l) => ({ item: l.label, valor: l.valor })),
    total_extras: orcamento.total,
  }
}

function briefingHTML(b) {
  const linhas = (arr, cols) => arr.length
    ? `<table><thead><tr>${cols.map((c) => `<th>${c.h}</th>`).join('')}</tr></thead><tbody>${arr.map((r) => `<tr>${cols.map((c) => `<td>${r[c.k] ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<p class="muted">—</p>'
  const paredesRows = b.paredes.map((p) => ({
    parede: p.parede, napa: `${p.tipo || ''} — ${p.cor || ''} ${p.codigo || ''}`, lona: p.lona || '—',
  }))
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Resumo comercial — ${b.cliente}</title>
  <style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;margin:32px;line-height:1.5}
    h1{font-size:20px;margin:0} .badge{background:#f4c20d;padding:4px 10px;border-radius:6px;font-weight:800;font-size:13px}
    h2{font-size:14px;border-bottom:2px solid #f4c20d;padding-bottom:4px;margin:22px 0 8px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin:6px 0}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left} th{background:#f5f5f5}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;font-size:13px}
    .grid div{border-bottom:1px dashed #ddd;padding:5px 0} .grid b{color:#000}
    .muted{color:#999;font-size:12px} .tot{font-size:22px;font-weight:800;color:#111;margin-top:6px}
    .sw{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:middle;margin-right:5px;border:1px solid #0002}
    header{display:flex;align-items:center;gap:12px;margin-bottom:6px}
  </style></head><body>
  <header><span class="badge">FÓRUM</span><h1>Resumo comercial · personalização do stand</h1></header>
  <p class="muted">${b.cliente} · Opção ${b.opcao} · ${b.area} m² (${b.medidas}) · gerado em ${b.gerado_em}<br>
  Documento para o atendimento comercial dar continuidade no pós-venda com o cliente.</p>

  <h2>Acabamentos</h2>
  <div class="grid">
    <div><b>Piso:</b> <span class="sw" style="background:${b.piso.hex}"></span>${b.piso.tipo} — ${b.piso.cor} ${b.piso.codigo || ''}</div>
    <div><b>Painel de LED:</b> ${b.led}</div>
  </div>

  <h2>Paredes</h2>
  ${linhas(paredesRows, [{ h: 'Parede', k: 'parede' }, { h: 'Napa', k: 'napa' }, { h: 'Lona', k: 'lona' }])}

  <h2>Estrutura</h2>
  <div class="grid">
    <div><b>Depósito:</b> ${b.deposito.largura} × ${b.deposito.profundidade} m (${b.deposito.area} m²) · pos. (${b.deposito.x}, ${b.deposito.z})</div>
    <div><b>Sala de reunião:</b> ${b.sala_reuniao ? `${b.sala_reuniao.largura} × ${b.sala_reuniao.profundidade} m · pos. (${b.sala_reuniao.x}, ${b.sala_reuniao.z})` : 'não incluída'}</div>
    <div><b>Logos extras:</b> ${b.logos_extra}</div>
  </div>

  <h2>Mobiliário adicional</h2>
  ${linhas(b.mobiliario_extra, [{ h: 'Item', k: 'item' }, { h: 'X (m)', k: 'x' }, { h: 'Z (m)', k: 'z' }, { h: 'Rot°', k: 'rotacao_graus' }])}

  <h2>Paisagismo</h2>
  ${linhas(b.paisagismo, [{ h: 'Item', k: 'item' }, { h: 'X (m)', k: 'x' }, { h: 'Z (m)', k: 'z' }])}

  <h2>Elétrica extra</h2>
  ${linhas(b.eletrica_pontos, [{ h: 'Tipo', k: 'tipo' }, { h: 'X (m)', k: 'x' }, { h: 'Z (m)', k: 'z' }])}

  <h2>Orçamento de extras</h2>
  ${linhas(b.orcamento_extras.map((l) => ({ item: l.item, valor: fmtBRL(l.valor) })), [{ h: 'Item', k: 'item' }, { h: 'Valor', k: 'valor' }])}
  <div class="tot">Total de extras: ${fmtBRL(b.total_extras)}</div>
  <p class="muted">Coordenadas em metros a partir do canto fundo-esquerdo (X = largura 0–10, Z = profundidade 0–4). Valores ilustrativos.</p>
  </body></html>`
}
