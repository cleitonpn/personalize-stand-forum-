import {useState} from 'react'
import {Link} from 'react-router-dom'
import {executarComercial} from '../lib/comercial.js'
export default function DecisaoProposta({proposta:p,aoAtualizar}){
  const [motivo,setMotivo]=useState(''),[ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[legado,setLegado]=useState(false),[substituir,setSubstituir]=useState(false)
  async function decidir(decisao){setErro('');setOcupado(true);try{await executarComercial('decidirProposta',{propostaId:p.id,decisao,motivo,confirmarLegado:legado,confirmarSubstituicao:substituir});await aoAtualizar()}catch(e){setErro(e.message)}finally{setOcupado(false)}}
  return <section className="card card-pad operacao-decisao"><h3>Aprovação comercial e produção</h3><p><strong>{({aprovada:'Aprovada · produção liberada',recusada:'Recusada · produção bloqueada'})[p.decisaoComercial]||'Aguardando análise do admin'}</strong></p><p>Ao aprovar, a equipe recebe os itens incluídos, adicionais, acabamentos e posições deste envio. A aprovação das provas de arte continua separada.</p>{p.decisaoMotivo&&<p>Orientação: {p.decisaoMotivo}</p>}
    {!p.manifestoProducao&&<label className="operacao-check"><input type="checkbox" checked={legado} onChange={e=>setLegado(e.target.checked)}/>Esta é uma proposta antiga. Conferi o GLB enviado e o mapeamento atual, inclusive os itens originais.</label>}
    <label className="operacao-check"><input type="checkbox" checked={substituir} onChange={e=>setSubstituir(e.target.checked)}/>Substituir uma ordem já aprovada para este expositor nesta feira, se existir.</label>
    <label>Motivo ou orientação<textarea className="input" maxLength={2000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label><div className="row operacao-acoes"><button className="btn btn-primary" disabled={ocupado||p.decisaoComercial==='aprovada'||(!p.manifestoProducao&&!legado)} onClick={()=>decidir('aprovada')}>Aprovar e liberar produção</button><button className="btn" disabled={ocupado||!motivo.trim()||p.decisaoComercial==='recusada'} onClick={()=>decidir('recusada')}>Recusar / suspender produção</button>{p.ordemProducaoId&&p.decisaoComercial==='aprovada'&&<Link className="btn" to={`/producao/${p.ordemProducaoId}`}>Ver ordem de produção</Link>}</div>{erro&&<p role="alert">{erro}</p>}
  </section>
}
