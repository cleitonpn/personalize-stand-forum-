import {STATUS_PENDENCIAS} from './pendencias.js'
export function resumoPendencias(linhas){
  const porStatus={},equipes={},executores={}
  for(const a of linhas){porStatus[a.status]=(porStatus[a.status]||0)+1;const e=a.equipeNome||'Equipe a definir';equipes[e]=(equipes[e]||0)+1;if(a.status==='concluida'){const u=a.executadoNome||'Executor não registrado (legado)';executores[u]=(executores[u]||0)+1}}
  return {total:linhas.length,porStatus,equipes,executores}
}
const data=v=>v?new Date(v).toLocaleString('pt-BR'):'—'
const csv=v=>'"'+String(v??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"'
export function csvPendencias(linhas){return '\uFEFF'+[['Feira','Empresa','Localização','Serviço','Equipe','Prioridade','Origem','Situação','Responsável','Executor','Execução','Validador','Validação','Nota da execução','Nota da validação','Fotos abertura','Fotos execução','Revisão'],...linhas.map(a=>[a.feira,a.clienteNome,a.localizacao,a.descricao,a.equipeNome,a.prioridade,a.origem,STATUS_PENDENCIAS[a.status],a.responsavel,a.executadoNome,data(a.executadoEm),a.validadoNome,data(a.validadoEm),a.notaExecucao,a.notaValidacao,a.fotos?.length||0,a.fotosConclusao?.length||0,a.revisao])].map(r=>r.map(csv).join(';')).join('\r\n')}
export async function pdfPendencias(linhas){
  const {jsPDF}=await import('jspdf'),pdf=new jsPDF(),r=resumoPendencias(linhas);let y=30
  const cab=()=>{pdf.setFillColor(23,59,50);pdf.rect(0,0,210,22,'F');pdf.setTextColor(255);pdf.setFontSize(16);pdf.text('USET | Relatório de operação',14,14);pdf.setTextColor(23,59,50);pdf.setFontSize(10)}
  const escrever=(valor,negrito=false)=>{pdf.setFont('helvetica',negrito?'bold':'normal');const linhasTexto=pdf.splitTextToSize(String(valor||'—').replace(/[\u0000-\u001f]/g,' '),180);for(const l of linhasTexto){if(y>278){pdf.addPage();cab();y=30}pdf.text(l,14,y);y+=5}y+=2}
  cab();escrever('Gerado em '+new Date().toLocaleString('pt-BR'));escrever(`${r.total} pendências · ${r.porStatus.concluida||0} validadas · ${r.porStatus.aguardando_validacao||0} aguardando validação`,true)
  escrever('Conclusões por executor',true);for(const [n,t] of Object.entries(r.executores))escrever(`${n}: ${t}`)
  for(const a of linhas){escrever(`${a.clienteNome} | ${a.feira} | ${a.localizacao||'Localização pendente'}`,true);escrever(a.descricao,true);escrever(`${STATUS_PENDENCIAS[a.status]} | ${a.equipeNome||'Equipe a definir'} | prioridade ${a.prioridade||'normal'} | revisão ${a.revisao}`);escrever(`Responsável: ${a.responsavel||'A definir'} | origem: ${a.origem||'equipe'}`);escrever(`Executor: ${a.executadoNome||'Não registrado'} | ${data(a.executadoEm)}`);if(a.notaExecucao)escrever('Execução: '+a.notaExecucao);escrever(`Validador: ${a.validadoNome||'A validar'} | ${data(a.validadoEm)}`);if(a.notaValidacao)escrever('Validação: '+a.notaValidacao);escrever(`Fotos de abertura: ${a.fotos?.length||0} | de execução: ${a.fotosConclusao?.length||0}. Fotos disponíveis no registro privado do estande.`);y+=5}
  for(let n=1;n<=pdf.getNumberOfPages();n++){pdf.setPage(n);pdf.setFontSize(8);pdf.text(`${n}/${pdf.getNumberOfPages()} | USET Produção`,14,291)}
  return pdf.output('blob')
}
