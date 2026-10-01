import { useState } from 'react'
import { useNapas } from '../store/NapasContext.jsx'
import { napasDisponiveis, nomeNapa, acabamentoNapa } from '../lib/napas.js'
import { fmtBRL } from '../lib/glb/precos.js'

export default function CartelaNapas({tipo,superficies,acabamentos,aplicar,estimar}) {
  const {catalogo,erro,carregando}=useNapas()
  const [busca,setBusca]=useState(''),[familia,setFamilia]=useState('lisa')
  const permitidas=napasDisponiveis(catalogo,tipo,superficies)
  if(!permitidas.length&&!erro&&!carregando&&tipo!=='parede')return null
  const normal=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  const lista=permitidas.filter(n=>n.familia===familia&&normal(nomeNapa(n)).includes(normal(busca)))
  const selecionada=acabamentos[superficies[0]?.id]
  return <section className="col" style={{gap:10}} aria-label="Acabamento da parede">
    <strong>Escolha o revestimento</strong>
    <div className="filtros-elementos">{[['lisa','Napas lisas'],['especial','Napas especiais']].map(([id,nome])=><button key={id} className={`chip ${familia===id?'sel':''}`} aria-pressed={familia===id} onClick={()=>setFamilia(id)}>{nome}</button>)}</div>
    {selecionada?.materialNome&&<p role="status">Selecionado: {nomeNapa({nome:selecionada.materialNome,codigo:selecionada.materialCodigo})}</p>}
    {!carregando&&!erro&&selecionada?.materialId&&!permitidas.some(n=>n.id===selecionada.materialId)&&<p className="orientacao" role="status">Este acabamento não está mais disponível para novas escolhas neste elemento. Escolha outro ou restaure o acabamento original.</p>}
    <input className="input" aria-label="Buscar napa por nome ou código" placeholder="Buscar cor ou código…" value={busca} onChange={e=>setBusca(e.target.value)}/>
    {erro&&<p role="alert">{erro}</p>}
    {carregando&&<p role="status">Consultando acabamentos…</p>}
    {!carregando&&!erro&&!lista.length&&<p className="dim">{familia==='especial'?'Nenhuma napa especial liberada para este elemento.':'Nenhuma napa encontrada para este elemento.'}</p>}
    <div className="cartela-cores napas-cartela">{lista.map(n=><button className={`amostra ${superficies.every(s=>acabamentos[s.id]?.materialId===n.id)?'ativa':''}`} key={n.id} aria-label={nomeNapa(n)} aria-pressed={superficies.every(s=>acabamentos[s.id]?.materialId===n.id)} onClick={()=>aplicar(superficies.map(s=>s.id),acabamentoNapa(n))}>
      <span style={{backgroundColor:n.cor,backgroundImage:n.textura?`url("${n.textura}")`:undefined,backgroundSize:'cover'}}/><small>{n.nome}<br/>{n.codigo||'Código não informado'}{estimar?<><br/>+ {fmtBRL(estimar(n))}</>:n.preco!=null&&<><br/>{fmtBRL(n.preco)}/m²</>}</small>
    </button>)}</div>
    <small className="dim">{estimar?'Valores para personalizar este elemento, já considerando sua metragem. ':''}Cores aproximadas na tela. A referência de produção é o nome e código do material.</small>
    {superficies.some(s=>acabamentos[s.id]?.arte)&&<p className="dim">A arte está aplicada sobre o revestimento. Remova a imagem para visualizar o material inteiro.</p>}
  </section>
}
