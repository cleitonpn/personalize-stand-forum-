import {estadoItem} from '../lib/operacao.js'
const metros=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2})
export default function ResumoOperacional({manifesto:m}) {
  const moveis=[...(m?.moveis||[]),...(m?.extras||[])]
  return <>
    <details className="card card-pad operacao-acordeao"><summary><span>Mobiliário e complementos<small>{moveis.length} itens · incluídos, adicionais e retirados</small></span></summary><div className="operacao-fichas">{moveis.map(x=><article key={x.id}><h3>{x.nome||'Item sem nome'}</h3><dl><dt>Quantidade</dt><dd>{x.quantidade??1}</dd><dt>Situação</dt><dd>{estadoItem[x.origem]}</dd><dt>Posição</dt><dd>{x.offset?x.offset.map(metros).join(' / '):`X ${metros(x.transform?.dx)} m · Z ${metros(x.transform?.dz)} m`} · giro {Math.round((x.rotY||x.transform?.rotY||0)*180/Math.PI)}°</dd></dl>{x.conferirAgrupamento&&<p>Conferir retirada parcial.</p>}</article>)}</div></details>
    <details className="card card-pad operacao-acordeao"><summary><span>Paredes, revestimentos e piso<small>{m?.materiais?.length||0} áreas · acabamentos e artes</small></span></summary><div className="operacao-fichas">{m?.materiais?.map(x=><article key={x.id}><h3>{x.nome||'Área sem nome'}</h3><dl><dt>Tipo</dt><dd>{x.tipo}</dd><dt>Situação</dt><dd>{estadoItem[x.origem]}</dd><dt>Acabamento</dt><dd>{x.acabamento?.alterado?`${x.acabamento.nome||x.acabamento.cor} ${x.acabamento.codigo||''} ${x.acabamento.fornecedor||''}${x.acabamento.textura?' · texturizado':''}`:`Original: ${x.materialOriginal||'Conforme projeto'}`}</dd><dt>Arte</dt><dd>{x.arte?(x.artePendente?'Aguardando arquivo':'Conferir arquivo final'):'Sem arte'}</dd></dl></article>)}</div></details>
  </>
}
