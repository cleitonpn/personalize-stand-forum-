import { useNapas } from '../store/NapasContext.jsx'
import { nomeNapa } from '../lib/napas.js'
export default function PermissoesNapas({elemento,mudar}) {
  const {catalogo,erro}=useNapas(),s=elemento.superficies[0]
  if(!s)return null
  const lista=catalogo.filter(n=>n.ativo!==false&&n.tipos?.includes(elemento.tipo))
  const ids=s.acabamentosPermitidos
  return <details className="orientacao"><summary>Revestimentos disponíveis neste elemento</summary>
    <p>Os materiais vêm da biblioteca compartilhada. Salve o projeto depois de ajustar esta seleção.</p>
    {erro&&<p role="alert">{erro}</p>}
    <label className="row"><input type="checkbox" checked={!Array.isArray(ids)} onChange={e=>mudar({acabamentosPermitidos:e.target.checked?null:lista.map(n=>n.id)})}/>Todos os acabamentos compatíveis, incluindo novos</label>
    {Array.isArray(ids)&&<div className="napas-permissoes">{lista.map(n=><label className="row" key={n.id}><input type="checkbox" checked={ids.includes(n.id)} onChange={e=>mudar({acabamentosPermitidos:e.target.checked?[...ids,n.id]:ids.filter(id=>id!==n.id)})}/>{nomeNapa(n)}</label>)}</div>}
    {!lista.length&&<p className="dim">Nenhum acabamento compatível na biblioteca.</p>}
  </details>
}
