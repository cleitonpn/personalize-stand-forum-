import {useNapas} from '../store/NapasContext.jsx'
import Miniatura from './Miniatura.jsx'
import CartelaNapas from './CartelaNapas.jsx'
import EditorArte from './EditorArte.jsx'
import { etapaGrupo, pertenceEtapa, ordenarCliente } from '../lib/jornada.js'
import CatalogoMobiliario from './CatalogoMobiliario.jsx'
import { ehBalcao } from '../lib/glb/frente.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { listarElementos, limitarTransformacao } from '../lib/glb/elementos.js'
import { limitesDoEstande } from '../lib/glb/nomes.js'
import { fmtBRL, calcularOrcamento } from '../lib/glb/precos.js'
import { acabamentoNapa } from '../lib/napas.js'
import { opcoesAtivas, superficiesEscondidas } from '../lib/glb/complementos.js'
import { CORES } from '../lib/cores.js'
import { enviarArte } from '../lib/artes.js'
import EscolhaComplemento from './EscolhaComplemento.jsx'

export default function PainelExpositor({ analise, superficies, acabamentos, setAcabamentos,
  supFoco, setSupFoco, recorte, orcamento, precos, complementos = [], escolhas, setEscolhas,
  objetos = [], setObjetos, objFoco, setObjFoco, objSel, setObjSel,
  enviarArquivo = enviarArte, aoEnviarArte, aoErroUpload, etapaGuiada, aoFocarElemento, aoVista, aoVoltarLista, cena, elementosOrdenados }) {
  const {catalogo}=useNapas()
  const [filtroLivre, setFiltro] = useState('todos')
  const filtro = etapaGuiada || filtroLivre
  const [intencaoMoveis,setIntencaoMoveis]=useState('manter')
  useEffect(() => { if (supFoco?.startsWith('extra:')) {setFiltro('mobiliario');setIntencaoMoveis('adicionar')} }, [supFoco])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const arquivo = useRef(null)
  const destinosArte = useRef([])
  const escondidas = useMemo(() => superficiesEscondidas(opcoesAtivas(complementos, escolhas)), [complementos, escolhas])
  const listaCalculada = useMemo(() => ordenarCliente(listarElementos(superficies, objetos || [], analise, recorte)), [superficies, objetos, analise, recorte])
  const lista=elementosOrdenados || listaCalculada
  const disponiveis = lista.filter(e => e.superficies.some(s => !escondidas.has(s.id) && (s.podeCor || s.podeArte || s.podeRemover))
    || e.objetos.some(o => (o.podeMover || o.podeGirar) && !o.pecas.every(k => superficies.some(s => escondidas.has(s.id) && s.pecas.includes(k))))
    || complementos.some(g => e.superficies.some(s => s.id === g.ancora)))
  const atual = disponiveis.find(e => e.superficies.some(s => s.id === supFoco) || e.objetos.some(o => o.id === objFoco))
  const selecionar = e => { setSupFoco(e.superficies[0]?.id || null); setObjFoco(e.objetos[0]?.id || null); setObjSel(null); setErro(''); aoFocarElemento?.(e) }
  const voltar = () => { if (aoVoltarLista) aoVoltarLista(); else { setSupFoco(null); setObjFoco(null); setObjSel(null) } }
  const aplicar = (ids, patch) => setAcabamentos(a => {
    const n = { ...a }; for (const id of ids) n[id] = { ...n[id], ...patch }; return n
  })
  const upload = async ev => {
    const f = ev.target.files?.[0]; ev.target.value = ''
    if (!f) return
    const ids = destinosArte.current.slice()
    setEnviando(true); aoEnviarArte?.(true); setErro('')
    try {
      const bitmap=await createImageBitmap(f)
      const artePixels=[bitmap.width,bitmap.height];bitmap.close()
      aplicar(ids, { ...await enviarArquivo(f), artePixels, artePendente:false, enquadramento:{modo:'conter',zoom:1,x:.5,y:.5} })
    }
    catch (e) { aoErroUpload?.(); setErro(e.message || 'Não foi possível enviar. Tente novamente.') }
    finally { setEnviando(false); aoEnviarArte?.(false) }
  }
  const perguntasSoltas = complementos.filter(g => g.tipo !== 'mobiliario').filter(g => !g.ancora || !lista.some(e => e.superficies.some(s => s.id === g.ancora)))
  const transformar = (o, patch) => setObjetos(os => os.map(x => x.id === o.id
    ? { ...x, transform: limitarTransformacao(x, patch, limitesDoEstande(analise, recorte)) } : x))
  const gruposVisiveis=ordenarCliente(complementos.filter(g=>g.tipo!=='mobiliario' && (!etapaGuiada || etapaGrupo(g)===etapaGuiada)))
  const opcoes = g => <EscolhaComplemento key={g.id} grupo={g} escolhido={escolhas?.[g.id]}
    aoEscolher={oid => setEscolhas(e => ({ ...e, [g.id]: oid }))} />
  return <div className="elementos-painel">{orcamento?.franquia?.ativo&&<section className="orientacao" aria-live="polite"><strong>Arte incluída no pacote: {orcamento.franquia.limiteM2.toLocaleString('pt-BR')} m²</strong><p>{orcamento.franquia.utilizadaM2.toLocaleString('pt-BR',{maximumFractionDigits:2})} m² utilizados · {orcamento.franquia.restanteM2.toLocaleString('pt-BR',{maximumFractionDigits:2})} m² disponíveis.</p><small>O saldo vale para as áreas selecionadas pela organizadora. Arte fora do saldo é cobrada pelo preço de cada área.</small></section>}
    {!etapaGuiada && <div className="orientacao"><strong>Deixe o estande do seu jeito</strong>
      <p>Clique em uma parte do estande ou escolha abaixo. Você verá apenas as opções disponíveis.</p></div>}
    {!etapaGuiada && <div className="filtros-elementos" aria-label="O que personalizar">
      {[['todos', 'Tudo'], ['parede', 'Paredes'], ['logo', 'Logos'], ['piso', 'Piso'], ['movel', 'Móveis do projeto'], ['mobiliario', 'Incluir / substituir móveis'], ['adicionais', 'Adicionais']].map(([id, nome]) =>
        <button className={`chip ${filtro === id ? 'sel' : ''}`} aria-pressed={filtro === id} key={id} onClick={() => { setFiltro(id); voltar() }}>{nome}</button>)}
    </div>}
    {enviando && <p className="orientacao" role="status">Enviando sua arte… Você pode continuar escolhendo as cores.</p>}
    {erro && <p className="erro-inline" role="alert">{erro}</p>}
    {atual && (!etapaGuiada || pertenceEtapa(atual,etapaGuiada)) ? <article className="elemento-card selecionado">
      <div className="elemento-titulo"><span className="elemento-nome"><strong>{atual.nome}</strong><small>Item do projeto · mudanças opcionais</small></span>
        <button className="btn btn-sm btn-ghost" disabled={enviando} onClick={voltar}>{etapaGuiada==='marca'?'Ver paredes e logos':etapaGuiada==='mobiliario'?'Ver todos os móveis':etapaGuiada==='piso'?'Ver opções de piso':'Ver todos os itens'}</button></div>
      <div className="elemento-opcoes">
        {(() => {
          const sups = atual.superficies.filter(s => !escondidas.has(s.id))
          const cores = sups.filter(s => s.podeCor).map(s => s.id)
          const artes = sups.filter(s => s.podeArte).map(s => s.id)
          const removiveis = sups.filter(s => s.podeRemover).map(s => s.id)
          const removido = removiveis.length > 0 && removiveis.every(id => acabamentos[id]?.removido)
          const modificado = sups.some(s => acabamentos[s.id]?.cor || acabamentos[s.id]?.arte)
          const valor = (orcamento?.itens || []).filter(i => atual.superficies.some(s => s.id === i.id)).reduce((n, i) => n + i.total, 0)
          const estimar=(ids,patch,novas=[])=>calcularOrcamento({analise,superficies,recorte,precos,catalogo:[...catalogo,...novas],complementos:{escondidas:superficiesEscondidas(opcoesAtivas(complementos,escolhas))},acabamentos:{...acabamentos,...Object.fromEntries(ids.map(id=>[id,{...acabamentos[id],...patch}]))}}).itens.filter(i=>ids.includes(i.id)).reduce((n,i)=>n+i.total,0)
          return <>
            <p className="dim">Manter o acabamento original não gera adicional. Veja o valor da personalização antes de escolher.</p>
            {removiveis.length > 0 && <button className="btn" onClick={() => aplicar(removiveis, { removido: !removido })}>{removido ? 'Restaurar no estande' : atual.tipo === 'logo' ? 'Remover logo do estande' : 'Remover do estande'}</button>}
            {removido && <p className="orientacao" role="status">Removido desta personalização. Você pode restaurar quando quiser.</p>}
            {!removido&&cores.length>0&&<CartelaNapas tipo={atual.tipo} superficies={sups.filter(s=>s.podeCor)} acabamentos={acabamentos} aplicar={aplicar} estimar={n=>estimar(cores,acabamentoNapa(n),[n])}/>}
            {!removido && cores.length > 0 && atual.tipo!=='parede' && <div><div className="label">Escolha uma cor</div>
              <small className="dim">Adicional pela troca de cor: {fmtBRL(estimar(cores,{cor:'#ffffff',materialId:null}))}</small><div className="cartela-cores">{CORES.map(c => {
                const marcado = cores.every(id => acabamentos[id]?.corId === c.id)
                return <button key={c.id} className={`amostra ${marcado ? 'ativa' : ''}`} aria-pressed={marcado}
                  aria-label={c.nome} title={c.nome} onClick={() => aplicar(cores, { cor: c.hex, corId: c.id,corNome:c.nome,materialId:null,materialNome:null,materialCodigo:null,materialFornecedor:null,textura:null,escalaTextura:null,brilho:null })}>
                  <span style={{ background: c.hex }} /><small>{c.nome}</small></button>
              })}</div></div>}
            {!removido && artes.length > 0 && <div className="col" style={{ gap: 8 }}><div className="label">{(atual.superficies[0]?.arteFrontal ?? ehBalcao(atual)) ? 'Sua arte — somente na frente' : 'Sua arte'}</div>
              <small className="dim">Arte neste elemento, considerando o saldo compartilhado do pacote: {fmtBRL(estimar(artes,{arte:'previa'}))} neste elemento</small>
              <button className="btn" disabled={enviando} onClick={() => { destinosArte.current = artes; arquivo.current?.click() }}>
                {enviando ? 'Enviando…' : artes.some(id => acabamentos[id]?.arte) ? 'Trocar imagem' : 'Enviar imagem'}</button>
              {artes.some(id => acabamentos[id]?.arte) && <button className="btn btn-sm btn-ghost" onClick={() => setAcabamentos(a => {
                const n = { ...a }; for (const id of artes) { n[id] = { ...n[id] }; for (const k of ['arte', 'nomeArte', 'caminhoArte', 'enquadramento', 'artePixels']) delete n[id][k] } return n
              })}>Remover imagem</button>}
              {!artes.some(id=>acabamentos[id]?.arte) && <button className="btn btn-sm" aria-pressed={artes.every(id=>acabamentos[id]?.artePendente)} onClick={()=>aplicar(artes,{artePendente:!artes.every(id=>acabamentos[id]?.artePendente)})}>{artes.every(id=>acabamentos[id]?.artePendente)?'✓ Arte pendente — cancelar pendência':'Ainda não tenho minha arte'}</button>}
              {artes.some(id=>acabamentos[id]?.arte) && <EditorArte acabamento={acabamentos[artes.find(id=>acabamentos[id]?.arte)]} aoMudar={patch=>aplicar(artes,patch)} proporcao={(()=>{const ps=analise.pecas.filter(p=>atual.superficies.some(s=>s.pecas.includes(p.chave)));if(!ps.length)return 1;const min=[0,1,2].map(i=>Math.min(...ps.map(p=>p.bbox.min[i]))),max=[0,1,2].map(i=>Math.max(...ps.map(p=>p.bbox.max[i])));return Math.max(max[0]-min[0],max[2]-min[2])/(max[1]-min[1]||1)})()} />}
              <small className="dim">PNG, JPG ou WebP · menos de 25 MB</small>
            </div>}
            {modificado && <><div className="row" style={{ justifyContent: 'space-between' }}><span>Personalização</span><strong>{fmtBRL(valor)}</strong></div>
              <button className="btn btn-sm" onClick={() => setAcabamentos(a => { const n = { ...a }; for (const s of atual.superficies) delete n[s.id]; return n })}>Restaurar acabamento original</button></>}
          </>
        })()}
        {atual.objetos.filter(o => o.podeMover || o.podeGirar).map(o => <div className="col" style={{ gap: 10 }} key={o.id}>
          <button className={`btn ${objSel === o.id ? 'btn-primary' : ''}`} onClick={() => setObjSel(objSel === o.id ? null : o.id)}>
            {objSel === o.id ? 'Concluir posicionamento' : 'Ajustar posição'}</button>
          {objSel === o.id && <>
            <p className="dim">{o.podeMover ? 'Arraste a marca no chão ou use as setas.' : ''} {o.podeGirar ? 'Use o anel azul ou os botões para girar.' : ''}</p>
            {o.podeMover && <div className="filtros-elementos">{[['←', -0.25, 0, 'Mover para esquerda'], ['↑', 0, -0.25, 'Mover para fundo'], ['↓', 0, 0.25, 'Mover para frente'], ['→', 0.25, 0, 'Mover para direita']].map(([nome, x, z, label]) =>
              <button className="btn" aria-label={label} key={nome} onClick={() => transformar(o, { dx: (o.transform?.dx || 0) + x, dz: (o.transform?.dz || 0) + z })}>{nome}</button>)}</div>}
            {o.podeGirar && <div className="filtros-elementos">{[-1, 1].map(s => <button className="btn" key={s} onClick={() => transformar(o, { rotY: (o.transform?.rotY || 0) + s * Math.PI / 12 })}>{s < 0 ? '↶' : '↷'} Girar 15°</button>)}</div>}
            <button className="btn btn-sm btn-ghost" onClick={() => transformar(o, { dx: 0, dz: 0, rotY: 0 })}>Voltar à posição original</button>
          </>}
        </div>)}
        {gruposVisiveis.filter(g => atual.superficies.some(s => s.id === g.ancora)).map(opcoes)}
      </div>
    </article> : <>
      {filtro==='mobiliario'&&<div className="col" style={{gap:10}}><strong>Móveis do projeto</strong><p className="dim">{lista.filter(e=>e.tipo==='movel').map(e=>e.nome).join(', ') || 'Veja os itens disponíveis abaixo.'}</p><div className="filtros-elementos">{[['manter','Manter e organizar'],['trocar','Trocar o conjunto'],['adicionar','Acrescentar móveis']].map(([id,n])=><button className={`btn ${intencaoMoveis===id?'btn-primary':''}`} key={id} aria-pressed={intencaoMoveis===id} onClick={()=>{setIntencaoMoveis(id);voltar();aoVista?.('cima')}}>{n}</button>)}</div></div>}
      {disponiveis.filter(e => etapaGuiada ? pertenceEtapa(e,etapaGuiada) && (etapaGuiada!=='mobiliario'||intencaoMoveis==='manter') : filtro === 'todos' || e.tipo===filtro || (filtro==='mobiliario' && intencaoMoveis==='manter' && e.tipo==='movel')).map(e =>
        <button className="elemento-card elemento-titulo" key={e.id} onClick={() => selecionar(e)}>
          <Miniatura cena={cena} elemento={e} numero={lista.indexOf(e)+1} />
          <span className="elemento-nome"><strong>{e.nome}</strong><small>{e.superficies.some(s=>acabamentos[s.id]?.artePendente&&!acabamentos[s.id]?.arte)?'Arte pendente':e.superficies.some(s => acabamentos[s.id]?.cor || acabamentos[s.id]?.arte || acabamentos[s.id]?.removido) || e.objetos.some(o=>o.transform?.dx||o.transform?.dz||o.transform?.rotY) ? 'Personalizado' : escolhas?._itensRevisados?.[e.id] ? 'Mantido como no projeto' : 'Já incluído · ver opções para mudar'}</small></span><span aria-hidden="true">→</span>
        </button>)}
      {(etapaGuiada ? gruposVisiveis : filtro === 'adicionais' ? gruposVisiveis : filtro === 'todos' ? perguntasSoltas : []).map(opcoes)}
      {((filtro === 'mobiliario' && intencaoMoveis!=='manter') || (!etapaGuiada&&filtro==='todos')) && <CatalogoMobiliario
        grupos={ordenarCliente(complementos.filter(g => g.tipo === 'mobiliario'))} escolhas={escolhas} setEscolhas={setEscolhas} intencao={intencaoMoveis}
        elementos={lista} foco={supFoco} aoFocar={id=>{setSupFoco(id);setObjSel(null);if(id)aoVista?.('cima')}} limites={limitesDoEstande(analise, recorte)} />}
      {etapaGuiada && !disponiveis.some(e=>pertenceEtapa(e,etapaGuiada)) && !gruposVisiveis.length && etapaGuiada!=='mobiliario' && <p className="orientacao">O projeto não tem opções adicionais nesta etapa. Você pode manter como está e continuar.</p>}
      {!etapaGuiada && !disponiveis.length && !complementos.length && <p className="muted">A equipe está preparando as opções deste estande.</p>}

    </>}
    <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={upload} />
  </div>
}
