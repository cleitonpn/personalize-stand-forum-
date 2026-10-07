import { fmtBRL, fmtM2 } from './glb/precos.js'
import { posicaoPonto,pontosEletricos } from './eletrica.js'
import { LOGO_VIEWBOX, LOGO_PARTES } from './showreel/logo.js'

const LOGO_SVG = `<svg viewBox="${LOGO_VIEWBOX}" role="img" aria-label="USET">${[LOGO_PARTES.anel, LOGO_PARTES.haste, LOGO_PARTES.s, LOGO_PARTES.e, LOGO_PARTES.t].map(d => `<path d="${d}"/>`).join('')}<path fill-rule="evenodd" d="${LOGO_PARTES.registro[0]}"/><path d="${LOGO_PARTES.registro[1]}"/></svg>`

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/**
 * Proposta em HTML, aberta numa aba para o expositor salvar em PDF pelo próprio
 * navegador (Imprimir → Salvar como PDF).
 *
 * Sem biblioteca de PDF: são ~40 KB de dependência a menos e o resultado sai com
 * texto selecionável e na fonte certa. Quando o fluxo virar envio automático por
 * e-mail, isso passa para o servidor.
 */
export function gerarPropostaHTML({ cliente, email, feira, modelo, itens, total, imagem, complementos, pendenciasArte=[],eletrica,franquia }) {
  const data = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  const linhas = (itens || []).map((i) => `
    <tr>
      <td>
        <div class="nome">${esc(i.nome)}</div>
        <div class="det">${esc(i.detalhe || '')}</div>
      </td>
      <td class="num">${i.unidade === 'm2' ? fmtM2(i.quantidade)+(i.incluidoM2>0?' extras':'') : `${esc(i.quantidade??1)} un.`}</td>
      <td class="num">${fmtBRL(i.valorUnitario)}</td>
      <td class="num forte">${fmtBRL(i.total)}</td>
    </tr>`).join('')

  // As escolhas de peça entram numa lista à parte porque várias custam zero e
  // não geram linha no orçamento — mas a produção precisa de todas elas para
  // montar o estande certo.
  const pendencias = pendenciasArte.map(nome=>`<li>${esc(nome)} — arte a enviar</li>`).join('')
  const escolhas = (complementos || []).map((c) => `
    <li><b>${esc(c.grupo)}:</b> ${esc(c.opcao)}${c.tipo === 'mobiliario' ? ` — 1 unidade (${c.substitui?.length ? 'substituição' : 'inclusão'}); deslocamento X/Y/Z: ${(c.offset || [0, 0, 0]).map(v => Number(v).toFixed(2)).join(' / ')} m; rotação ${Math.round((c.rotY || 0) * 180 / Math.PI)}°` : ''}</li>`).join('')

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8">
<title>Proposta — ${esc(cliente)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
         color: #14181f; margin: 0; font-size: 12px; line-height: 1.55; }
  .topo { display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid #14181f; padding-bottom: 14px; margin-bottom: 20px; }
  .marca { display: flex; align-items: center; gap: 12px; }
  .marca svg { height: 30px; width: auto; fill: #01622f; }
  .marca small { font-size: 10px; font-weight: 600; color: #6b7280; letter-spacing: .18em;
                 text-transform: uppercase; border-left: 1px solid #d1d5db; padding-left: 12px; }
  .meta { text-align: right; font-size: 11px; color: #4b5563; }
  h1 { font-size: 16px; margin: 0 0 14px; }
  .dados { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .dado { background: #f4f6f9; border-radius: 7px; padding: 9px 11px; }
  .dado .r { font-size: 9px; text-transform: uppercase; letter-spacing: .09em; color: #6b7280; font-weight: 700; }
  .dado .v { font-size: 12.5px; font-weight: 600; margin-top: 2px; }
  img.render { width: 100%; border-radius: 9px; border: 1px solid #e5e7eb; margin-bottom: 20px; display: block; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: .09em;
       color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 0 8px 7px; }
  th.num, td.num { text-align: right; }
  td { padding: 10px 8px; border-bottom: 1px solid #eef1f5; vertical-align: top; }
  .nome { font-weight: 600; }
  .det { font-size: 10.5px; color: #6b7280; }
  .forte { font-weight: 700; }
  .total { display: flex; justify-content: space-between; align-items: center;
           margin-top: 16px; padding: 14px 16px; background: #14181f; color: #fff; border-radius: 9px; }
  .total .r { font-size: 10px; text-transform: uppercase; letter-spacing: .12em; opacity: .75; }
  .total .v { font-size: 21px; font-weight: 800; }
  .escolhas { margin-top: 16px; padding: 12px 16px; background: #f4f6f9; border-radius: 9px; }
  .escolhas .r { font-size: 9px; text-transform: uppercase; letter-spacing: .09em;
                 color: #6b7280; font-weight: 700; }
  .escolhas ul { margin: 7px 0 0; padding-left: 17px; }
  .escolhas li { margin-bottom: 3px; }
  .rodape { margin-top: 22px; padding-top: 12px; border-top: 1px solid #e5e7eb;
            font-size: 10px; color: #6b7280; line-height: 1.7; }
  .acoes { position: fixed; top: 14px; right: 14px; display: flex; gap: 8px; }
  .acoes button { font: inherit; font-weight: 600; font-size: 12px; padding: 9px 15px;
                  border: 0; border-radius: 7px; background: #14181f; color: #fff; cursor: pointer; }
  @media print { .acoes { display: none; } }
</style></head>
<body>
  <div class="acoes"><button onclick="window.print()">Salvar em PDF</button></div>

  <div class="topo">
    <div class="marca">${LOGO_SVG}<small>Stand Studio</small></div>
    <div class="meta">Proposta de personalização<br>${esc(data)}</div>
  </div>

  <h1>Personalização do estande</h1>

  <div class="dados">
    <div class="dado"><div class="r">Expositor</div><div class="v">${esc(cliente)}</div></div>
    <div class="dado"><div class="r">Feira</div><div class="v">${esc(feira || '—')}</div></div>
    <div class="dado"><div class="r">Projeto</div><div class="v">${esc(modelo || '—')}</div></div>
  </div>

  ${imagem ? `<img class="render" src="${imagem}" alt="Estande personalizado">` : ''}
  ${blocoEletrica(eletrica)}

  ${franquia?.ativo?`<p><b>Arte incluída no pacote:</b> ${fmtM2(franquia.utilizadaM2)} utilizados de ${fmtM2(franquia.limiteM2)}. Saldo: ${fmtM2(franquia.restanteM2)}. Área de arte cobrada à parte: ${fmtM2(franquia.extraM2)}.</p>`:''}
  <table>
    <thead><tr>
      <th>Item</th><th class="num">Quantidade</th><th class="num">Unitário</th><th class="num">Total</th>
    </tr></thead>
    <tbody>${linhas || '<tr><td colspan="4">Nenhuma personalização.</td></tr>'}</tbody>
  </table>

  <div class="total">
    <span class="r">Total das personalizações</span>
    <span class="v">${fmtBRL(total)}</span>
  </div>

  ${(escolhas || pendencias) ? `<div class="escolhas">
    <div class="r">Configuração escolhida</div>
    <ul>${escolhas}${pendencias}</ul>
  </div>` : ''}

  <div class="rodape">
    As metragens são apuradas na geometria do projeto aprovado. O mobiliário que
    consta no projeto está incluso no valor do estande. Contato: ${esc(email || '')}.
  </div>
</body></html>`
}

export function blocoEletrica(eletrica){
  const ps=pontosEletricos({_eletrica:eletrica?.pontos}),l=eletrica?.limites
  if(!ps.length)return ''
  const valido=l&&[l.x0,l.x1,l.z0,l.z1].every(Number.isFinite)&&l.x1>l.x0&&l.z1>l.z0
  const mapa=valido?`<svg viewBox="0 0 500 270" role="img" aria-label="Posições dos pontos elétricos, vista superior" style="width:100%;max-height:240px"><rect x="35" y="20" width="430" height="200" fill="#f4f6f9" stroke="#6b7280"/><text x="250" y="255" text-anchor="middle" font-size="12">FRENTE DO ESTANDE (Z máximo)</text>${ps.map((p,i)=>{const x=35+(p.x-l.x0)/(l.x1-l.x0)*430,y=20+(p.z-l.z0)/(l.z1-l.z0)*200;return `<circle cx="${x}" cy="${y}" r="11" fill="#173a31"/><text x="${x}" y="${y+4}" text-anchor="middle" fill="white" font-size="11">${i+1}</text>`}).join('')}</svg>`:''
  return `<section class="escolhas"><h2>Pontos elétricos adicionais</h2><p>Esquema de localização, sem escala. Posições e equipamentos sujeitos à conferência da equipe.</p>${mapa}<ol>${ps.map(p=>`<li>${esc(p.uso||'Uso a informar')} · ${esc(p.tensao||'A confirmar')} · ${esc(posicaoPonto(p,valido?l:null))}</li>`).join('')}</ol></section>`
}
