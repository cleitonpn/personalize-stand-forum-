export const ESTADOS_ARTE = {aguardando:'Faltando arte',recebida:'Arte enviada / em conferência',contestada:'Revisão técnica solicitada',em_prova:'Prova aguardando cliente',aprovada:'Arte aprovada',devolvida:'Arquivo devolvido',reprovada:'Prova reprovada',em_impressao:'Em impressão',impressa:'Arte impressa'}
export const normalizar = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()
export const momento = v => v?.toMillis?.() ?? ((v?.seconds??v?._seconds??0)*1000+(v?.nanoseconds??v?._nanoseconds??0)/1e6)
export function resumoArtes(areas=[]) {
  const contagens={}
  for(const a of areas)contagens[a.status||'aguardando']=(contagens[a.status||'aguardando']||0)+1
  return {total:areas.length,contagens,areas:areas.filter(a=>a.id).map(a=>({id:a.id,larguraCm:a.larguraCm||0,alturaCm:a.alturaCm||0,confirmada:!!a.confirmada,semGabarito:!!a.semGabarito,perfilId:a.perfilId||''}))}
}
export function estadosProposta(p) {
  const comercial=p.estadoProducao==='excluida'?'excluida':p.estadoProducao==='substituida'?'substituida':p.estadoProducao==='liberada'?'liberada':p.decisaoComercial==='recusada'?'recusada':'pendente'
  const estados=[comercial,p.liberadaEm?'cliente_liberada':'cliente_pendente',`envio_${p.status||'recebida'}`]
  const r=p.resumoArtes||{total:0,contagens:{}}
  if(p.pagamento?.pendenciaCancelamento)estados.push('financeiro_pendente')
  if(!r.total)estados.push('sem_arte')
  for(const [s,n] of Object.entries(r.contagens))if(n>0)estados.push(`arte_${s}`)
  if(r.total&&(r.contagens.aprovada||0)+(r.contagens.em_impressao||0)+(r.contagens.impressa||0)===r.total)estados.push('todas_artes_aprovadas')
  if(r.total&&r.contagens.impressa===r.total)estados.push('todas_artes_impressas')
  estados.push(`pagamento_${p.pagamento?.status||'sem_cobranca'}`)
  return estados
}
export const ROTULOS_STATUS={financeiro_pendente:'Pendência financeira de retirada',excluida:'Proposta retirada',pendente:'Aguardando análise comercial',liberada:'Comercial aprovado · produção liberada',recusada:'Comercial recusado / produção suspensa',substituida:'Substituída por outra proposta',cliente_liberada:'Proposta liberada ao cliente',cliente_pendente:'Proposta ainda não liberada ao cliente',sem_arte:'Sem arte solicitada',todas_artes_aprovadas:'Todas as artes aprovadas',todas_artes_impressas:'Todas as artes impressas',...Object.fromEntries(Object.entries(ESTADOS_ARTE).map(([k,v])=>[`arte_${k}`,v])),pagamento_sem_cobranca:'Sem cobrança registrada',pagamento_aguardando_integracao:'Pagamento aguardando integração',pagamento_paga:'Pagamento recebido',pagamento_pago:'Pagamento recebido',pagamento_cancelada:'Cobrança cancelada',envio_recebida:'Proposta recebida'}
export function filtrarPropostas(lista,{busca='',feira='',organizadora='',cliente='',status=''}={}) {
  const termos=normalizar(busca).split(/\s+/).filter(Boolean)
  return lista.filter(p=>(!feira||p.feiraId===feira)&&(!organizadora||p.organizadoraId===organizadora)&&(!cliente||p.cliente===cliente)&&(!status||(Array.isArray(status)?status.filter(Boolean).every(s=>estadosProposta(p).includes(s)):estadosProposta(p).includes(status)))&&termos.every(t=>normalizar([p.clienteNome,p.clienteEmail,p.feira,p.organizadoraNome,p.modeloNome,p.localizacao].join(' ')).includes(t)))
}
export function propostasValidas(lista,modo='aprovadas') {
  // Uma única versão por expositor/feira. Uma revisão substituída não vira material a produzir.
  const mapa=new Map()
  for(const p of lista){
    if(['substituida','excluida'].includes(p.estadoProducao))continue
    if(modo==='aprovadas'&&p.estadoProducao!=='liberada')continue
    const chave=p.cliente&&p.feiraId?`${p.cliente}|${p.feiraId}`:p.id
    const atual=mapa.get(chave)
    if(!atual||(p.estadoProducao==='liberada'&&atual.estadoProducao!=='liberada')||(p.estadoProducao===atual.estadoProducao&&momento(p.criadoEm)>momento(atual.criadoEm))||(!['liberada'].includes(atual.estadoProducao)&&!['liberada'].includes(p.estadoProducao)&&momento(p.criadoEm)>momento(atual.criadoEm)))mapa.set(chave,p)
  }
  return [...mapa.values()]
}
const numero=v=>Number.isFinite(v)&&v>=0?v:null
export function linhasQuantidades(p) {
  const m=p.manifestoProducao,linhas=[]
  const add=l=>linhas.push({propostaId:p.id,cliente:p.clienteNome,feira:p.feira,organizadora:p.organizadoraNome||'Sem organizadora',localizacao:p.localizacao||'',...l})
  if(!m){add({categoria:'Registro incompleto',item:p.modeloNome||'Projeto',material:'Conferir proposta antiga',cor:'',unidade:'m²',quantidade:null});return linhas}
  const ativos=(m.materiais||[]).filter(s=>!['retirado','substituido'].includes(s.origem))
  for(const s of ativos){
    const q=s.quantitativo
    const categoria=s.acabamento?.alterado&&s.acabamento.materialId?.startsWith('napa-')&&s.papel!=='piso'?'Napa':q?.categoria||({piso:'Carpete',bagum:'Bagum',madeira:'Madeira',lona:'Lona',adesivo:'Adesivo'}[s.papel])
    if(s.arte&&['Bagum','Napa','Lona','Adesivo'].includes(categoria)&&q?.manterSobArte!==true)continue
    // Malhas de móveis/estrutura não representam m² de revestimento de parede.
    if(categoria&&categoria!=='Ignorar'&&(!['movel','mobiliario','estrutura'].includes(s.tipo)||q?.manual))add({categoria,item:s.nome,material:s.acabamento?.alterado?(s.acabamento.nome||'Cor personalizada'):(q?.material||s.materialOriginal||'Original'),cor:s.acabamento?.alterado?(s.acabamento.nome||s.acabamento.corNome||s.acabamento.cor||'Não identificada'):(q?.cor||'Cor original a conferir'),codigo:s.acabamento?.codigo||q?.codigo||'',unidade:'m²',quantidade:numero(q?.areaM2)})
  }
  for(const original of m.areasArte||[]){
    const atual=p.resumoArtes?.areas?.find(a=>a.id===original.id),a=atual?{...original,...atual}:original
    if((a.superficieIds||[a.id]).every(id=>!ativos.some(s=>s.id===id)))continue
    add({categoria:a.semGabarito?'Logo':'Arte',item:a.nome,material:a.semGabarito?'Logo / arquivos de apoio':a.perfilId||'Arte',cor:'',unidade:a.semGabarito?'un.':'m²',quantidade:a.semGabarito?1:(a.confirmada?numero(a.larguraCm*a.alturaCm/10000):null)})
  }
  for(const o of m.moveis||[])if(!['retirado','substituido'].includes(o.origem))add({categoria:'Mobiliário',item:o.nome,material:o.nome,cor:'',unidade:'un.',quantidade:numero(o.quantidade)||1})
  for(const o of m.extras||[])if(!['retirado','substituido'].includes(o.origem))add({categoria:o.tipo==='mobiliario'?'Mobiliário':'Complementos',item:o.nome,material:o.nome,cor:'',unidade:'un.',quantidade:numero(o.quantidade)||1})
  if(m.eletrica?.pontos?.length)add({categoria:'Elétrica',item:'Ponto elétrico adicional',material:'Ponto elétrico',cor:'',unidade:'un.',quantidade:m.eletrica.pontos.length})
  return linhas
}
export function agruparQuantidades(linhas) {
  const grupos=new Map()
  for(const l of linhas){const key=JSON.stringify([l.categoria,l.material,l.cor,l.codigo||'',l.unidade]);if(!grupos.has(key))grupos.set(key,{...l,quantidade:0,pendencias:0,estandes:new Set()});const g=grupos.get(key);if(l.quantidade==null)g.pendencias++;else g.quantidade+=l.quantidade;g.estandes.add(l.propostaId)}
  return [...grupos.values()].map(g=>({...g,estandes:g.estandes.size})).sort((a,b)=>(a.categoria+a.material+a.cor).localeCompare(b.categoria+b.material+b.cor,'pt-BR'))
}
export function financeiro(p) {
  const pg=p.pagamento,proposto=p.historicoFinanceiro?0:numero(p.total)||0,aprovado=p.estadoProducao==='liberada'?(numero(pg?.valorCentavos)!=null?pg.valorCentavos/100:proposto):0
  const recebido=['paga','pago','paid'].includes(pg?.status)?(numero(pg.valorCentavos)||0)/100:0
  return {proposto,aprovado,recebido}
}
export function recebimentosHistoricos(lista) {
  const vigentes=new Set(propostasValidas(lista,'todas').map(p=>p.id))
  return lista.filter(p=>!vigentes.has(p.id)&&(p.pagamento?.pendenciaCancelamento||financeiro(p).recebido>0))
}
export function agruparFinanceiro(lista,por) {
  const mapa=new Map()
  for(const p of lista){const chave=p[`${por}Id`]||p[por]||'sem-vinculo',nome=p[por==='cliente'?'clienteNome':por==='organizadora'?'organizadoraNome':'feira']||'Sem vínculo';if(!mapa.has(chave))mapa.set(chave,{chave,nome,propostas:0,proposto:0,aprovado:0,recebido:0});const g=mapa.get(chave),f=financeiro(p);if(!p.historicoFinanceiro)g.propostas++;for(const k of ['proposto','aprovado','recebido'])g[k]+=f[k]}
  return [...mapa.values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
}
// Evita fórmulas ao abrir nomes enviados por clientes no Excel.
export function csv(colunas,linhas) { const cell=v=>'"'+String(v??'').replace(/^[\s]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';return '\ufeff'+[colunas,...linhas].map(r=>r.map(cell).join(';')).join('\r\n') }
