import {jsPDF} from 'jspdf'
import {csv} from '../../functions/relatorios.mjs'
import {salvarBlob} from './baixarArquivo.js'

export async function exportarRelatorio({titulo,contexto,colunas,linhas,nome,tipo}) {
  if(tipo==='csv')return salvarBlob(new Blob([csv(colunas,linhas)],{type:'text/csv;charset=utf-8'}),`${nome}.csv`)
  return salvarBlob(gerarPDFRelatorio({titulo,contexto,colunas,linhas}),`${nome}.pdf`)
}
export function gerarPDFRelatorio({titulo,contexto,colunas,linhas}) {
  const pdf=new jsPDF({orientation:'landscape'}),w=pdf.internal.pageSize.getWidth(),h=pdf.internal.pageSize.getHeight(),m=12,cw=(w-m*2)/colunas.length
  let y=0,pagina=0
  const novaPagina=()=>{if(pagina++)pdf.addPage();pdf.setTextColor(23,59,50);pdf.setFont('helvetica','bold');pdf.setFontSize(19);pdf.text('USET | STUDIO',m,17);pdf.setFontSize(14);pdf.text(titulo,m,27);pdf.setFont('helvetica','normal');pdf.setFontSize(9);const resumo=pdf.splitTextToSize(contexto,w-m*2);pdf.text(resumo,m,35);y=40+resumo.length*4;pdf.setFillColor(232,236,222);pdf.rect(m,y,w-m*2,10,'F');pdf.setFont('helvetica','bold');colunas.forEach((c,i)=>pdf.text(pdf.splitTextToSize(c,cw-4),m+i*cw+2,y+4));y+=14;pdf.setFont('helvetica','normal');pdf.setFontSize(8)}
  novaPagina()
  for(const linha of linhas){const cells=linha.map(v=>pdf.splitTextToSize(String(v??''),cw-5)),altura=Math.max(...cells.map(c=>c.length))*3.5+5;if(y+altura>h-15)novaPagina();cells.forEach((c,i)=>pdf.text(c,m+i*cw+2,y));y+=altura;pdf.setDrawColor(211,217,203);pdf.line(m,y-3,w-m,y-3)}
  for(let i=1;i<=pdf.getNumberOfPages();i++){pdf.setPage(i);pdf.setFontSize(8);pdf.text(`Emitido em ${new Date().toLocaleString('pt-BR')} | ${i}/${pdf.getNumberOfPages()}`,m,h-6)}
  return pdf.output('blob')
}
