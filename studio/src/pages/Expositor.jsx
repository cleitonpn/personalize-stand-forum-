import { transformarMovelAdicionado } from '../lib/glb/mobiliario.js'
import { registroComplemento } from '../lib/glb/mobiliario.js'
import { useEffect, useMemo, useState, useRef } from 'react'
import { doc, getDoc, collection } from 'firebase/firestore'
import { executarComercial } from '../lib/comercial.js'
import { db, storage } from '../lib/firebase.js'
import { ref as arquivoRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { useTelemetria } from '../lib/useTelemetria.js'
import { useAuth } from '../store/AuthContext.jsx'
import { useNapas } from '../store/NapasContext.jsx'
import Viewer, { useGLB, VISTAS } from '../components/Viewer.jsx'
import PainelExpositor from '../components/JornadaExpositor.jsx'
import { analisar } from '../lib/glb/analyze.js'
import { indicePorPeca } from '../lib/glb/superficies.js'
import { calcularOrcamento, fmtBRL } from '../lib/glb/precos.js'
import { PRECOS_PADRAO, PRECOS_OBJETO_PADRAO } from '../lib/glb/precos.js'
import Tutorial from '../components/Tutorial.jsx'
import { gerarPropostaHTML } from '../lib/proposta.js'
import { opcoesAtivas, superficiesEscondidas, chavesEscondidas, pecasParaCena } from '../lib/glb/complementos.js'
import { limitesDoEstande } from '../lib/glb/nomes.js'
import { listarElementos, limitarTransformacao } from '../lib/glb/elementos.js'
import { useHistorico } from '../lib/useHistorico.js'
import { pontosEletricos,precoPonto } from '../lib/eletrica.js'
import { reiniciarPersonalizacao } from '../lib/reiniciarPersonalizacao.js'
import { mesmaVersao } from '../lib/salvarModelo.js'
import { quantidadePersonalizada } from '../lib/quantidadePersonalizada.js'

export default function Expositor() {
  const {catalogo,erro:erroCatalogo,carregando:carregandoCatalogo}=useNapas()
  const { user, perfil } = useAuth()
  const exportadorRef=useRef(null)
  const [metricas,setMetricas]=useState(()=>{try{return localStorage.getItem('psf.metricas')!=='nao'}catch{return false}})
  const registrar=useTelemetria(user?.uid,perfil?.modeloId,metricas&&perfil?.papel==='expositor')
  const [modelo, setModelo] = useState(null)
  const [organizadora,setOrganizadora]=useState(null)
  const [erro, setErro] = useState(null)
  const historico = useHistorico({ acabamentos: {}, escolhas: {}, objetos: [] })
  const { acabamentos, escolhas, objetos, restaurar } = historico
  const setAcabamentos = v => {registrar('alteracao');historico.mudar('acabamentos', v)}
  const setEscolhas = v => {registrar('alteracao');historico.mudar('escolhas', v)}
  const setObjetos = v => historico.mudar('objetos', v)
  const [rascunhoStatus, setRascunhoStatus] = useState('')
  const [enviandoArte, setEnviandoArte] = useState(false)
  const [supFoco, setSupFoco] = useState(null)
  const [objFoco, setObjFoco] = useState(null)
  const [objSel, setObjSel] = useState(null)
  // abre sozinho no primeiro acesso de cada conta; depois, só pelo "? Como funciona"
  const [tutorial, setTutorial] = useState(() => { try { return !localStorage.getItem(`psf.tutorial.${user?.uid}`) } catch { return false } })
  const [gravando, setGravando] = useState(false)
  const [gravado, setGravado] = useState(null)
  const [vista, setVista] = useState(null)
  const [cenaCliente,setCenaCliente]=useState({})
  const [revisando,setRevisando]=useState(false)
  const [solicitarRevisao,setSolicitarRevisao]=useState(0)

  useEffect(()=>{if(!perfil.organizadoraId)return;getDoc(doc(db,'organizadoras',perfil.organizadoraId)).then(s=>setOrganizadora(s.data())).catch(()=>setOrganizadora(null))},[perfil.organizadoraId])

  useEffect(() => {
    if (!perfil) return
    if (!perfil.modeloId) { setErro('Seu projeto ainda não foi liberado. Fale com a equipe da USET.'); return }
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'modelos', perfil.modeloId))
        if (!snap.exists()) { setErro('O projeto vinculado à sua conta não foi encontrado.'); return }
        const d = snap.data()
        setModelo({ id: snap.id, ...d })
        let rascunho = null
        try {
          const salvo = JSON.parse(localStorage.getItem(`psf.rascunho.${user.uid}.${snap.id}`) || 'null')
          if (salvo?.versao === (d.atualizadoEm?.seconds || 0)) rascunho = salvo
        } catch { /* armazenamento indisponível não bloqueia o projeto */ }
        const os = (d.objetos || []).map(o => ({ ...o, transform: rascunho?.transformes?.[o.id] || o.transform }))
        restaurar({ acabamentos: rascunho?.acabamentos || {}, escolhas: rascunho?.escolhas || {}, objetos: os })
        setRascunhoStatus(rascunho ? 'Suas escolhas foram recuperadas neste navegador.' : '')
      } catch (ex) { setErro(ex.message) }
    })()
  }, [perfil, user, restaurar])

  useEffect(() => {
    if (!modelo || !user) return
    setGravado(null)
    setRascunhoStatus('Salvando neste navegador…')
    const salvar = () => {
      try {
        localStorage.setItem(`psf.rascunho.${user.uid}.${modelo.id}`, JSON.stringify({
          versao: modelo.atualizadoEm?.seconds || 0, acabamentos, escolhas,
          transformes: Object.fromEntries(objetos.map(o => [o.id, o.transform || { dx: 0, dz: 0, rotY: 0 }])),
        }))
        setRascunhoStatus('Alterações salvas neste navegador')
      } catch { setRascunhoStatus('Não foi possível salvar neste navegador. Mantenha esta aba aberta.') }
    }
    const timer = setTimeout(salvar, 500)
    window.addEventListener('pagehide', salvar)
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', salvar) }
  }, [modelo, user, acabamentos, escolhas, objetos])

  const { cena, erro: erroGlb, progresso, carregando } = useGLB(modelo?.arquivo?.url)
  useEffect(()=>{if(erroGlb)registrar('glb_erro')},[erroGlb,registrar])
  const analise = useMemo(() => (cena ? analisar(cena) : null), [cena])

  const superficies = modelo?.superficies || []
  const precos = { ...PRECOS_PADRAO, ...(modelo?.precos || {}) }
  const precosObjeto = { ...PRECOS_OBJETO_PADRAO, ...(modelo?.precosObjeto || {}) }
  const indice = useMemo(() => (superficies.length ? indicePorPeca(superficies) : null), [superficies])

  const complementos = modelo?.complementos || []
  const ativas = useMemo(() => opcoesAtivas(complementos, escolhas), [complementos, escolhas])
  const pendenciasArte = useMemo(()=>{
    const ocultas=superficiesEscondidas(ativas)
    return listarElementos(superficies,objetos,analise,modelo?.recorte).filter(e=>e.superficies.some(s=>!ocultas.has(s.id)&&!acabamentos[s.id]?.removido&&acabamentos[s.id]?.artePendente&&!acabamentos[s.id]?.arte)).map(e=>e.nome)
  },[ativas,superficies,objetos,analise,modelo,acabamentos])
  const extras = useMemo(() => pecasParaCena(ativas), [ativas])
  const escondidos = useMemo(() => chavesEscondidas(ativas, superficies), [ativas, superficies])

  const orcamento = useMemo(() => (analise ? calcularOrcamento({
    analise, superficies, objetos, acabamentos, precos, precosObjeto, catalogo, eletrica:pontosEletricos(escolhas), recorte: modelo?.recorte,
    complementos: { ativas, escondidas: superficiesEscondidas(ativas) },
  }) : { itens: [], total: 0, porGrupo: {} }), [analise, superficies, objetos, acabamentos, modelo, ativas,catalogo,escolhas])

  // Escolher a peça vira a câmera para cima: é de lá que arrastar no chão
  // corresponde exatamente ao movimento do mouse, sem dúvida de profundidade.
  const escolherObjeto = (id) => {
    setObjSel(id)
    setObjFoco(id)
    if (id) setVista('cima')
  }

  const transformarObjeto = (id, patch, gesto) => !gravando && historico.mudar('objetos', os => os.map(o => o.id === id
    ? { ...o, transform: limitarTransformacao(o, patch, limitesDoEstande(analise, modelo?.recorte)) } : o), gesto)
  const transformarExtra = (id, patch, gesto) => !gravando && historico.mudar('escolhas', es => transformarMovelAdicionado(complementos,es,id,patch,limitesDoEstande(analise,modelo?.recorte)),gesto)


  const limitesGizmo = useMemo(
    () => (analise ? limitesDoEstande(analise, modelo?.recorte) : null),
    [analise, modelo],
  )

  const fecharTutorial = () => {
    setTutorial(false)
    try { localStorage.setItem(`psf.tutorial.${user.uid}`, '1') } catch { /* opcional */ }
  }

  const reiniciar = () => {
    if (!modelo || gravando || enviandoArte) return
    const { estado, persistido } = reiniciarPersonalizacao(modelo,
      `psf.rascunho.${user.uid}.${modelo.id}`,
      `psf.jornada.${user.uid}.${modelo.id}.${modelo.atualizadoEm?.seconds || 0}`)
    registrar('reinicio')
    restaurar(estado)
    setSupFoco(null); setObjFoco(null); setObjSel(null)
    setGravado(null); setRevisando(false); setSolicitarRevisao(0); setCenaCliente({}); setVista('perspectiva')
    if (!persistido) alert('A personalização foi reiniciada, mas o navegador não permitiu atualizar o rascunho salvo. Mantenha esta aba aberta.')
  }

  const gravar = async () => {
    if (enviandoArte || gravando) return
    if(pontosEletricos(escolhas).length&&precoPonto(precos)==null){alert('A equipe precisa liberar o preço dos pontos elétricos. Remova os pontos adicionais para enviar sem eles.');return}
    setGravando(true)
    let arquivoEnviado=null, registrada=false
    try {
      const publicado=await getDoc(doc(db,'modelos',modelo.id))
      if(!publicado.exists()||!mesmaVersao(publicado.data().atualizadoEm,modelo.atualizadoEm)) {
        throw Error('A equipe atualizou o projeto ou seus preços. Recarregue a página e confira as escolhas antes de enviar.')
      }
      // A imagem do 3D entra na proposta como registro do que foi escolhido.
      const imagem = window.__psfShot?.() || null
      const ref = doc(collection(db, 'propostas'))
      if(!exportadorRef.current)throw Error('A cena ainda não está pronta. Aguarde e tente novamente.')
      const glb=await exportadorRef.current()
      if(glb.size>=200*1024*1024)throw Error('A personalização ultrapassou o limite de 200 MB para a proposta. Fale com a equipe da USET.')
      const caminho=`propostas/${user.uid}/${ref.id}/estande.glb`
      arquivoEnviado=arquivoRef(storage,caminho)
      await uploadBytes(arquivoEnviado,glb,{contentType:'model/gltf-binary'})
      const arquivoPersonalizado={caminho,url:await getDownloadURL(arquivoEnviado),bytes:glb.size,nomeOriginal:'estande-personalizado.glb'}
      await executarComercial('registrarProposta', {id:ref.id,versao:{seconds:modelo.atualizadoEm?.seconds||0,nanoseconds:modelo.atualizadoEm?.nanoseconds||0},proposta:{
        arquivoPersonalizado,
        cliente: user.uid,
        clienteNome: perfil?.empresa || perfil?.nome || user.email,
        clienteEmail: user.email,
        organizadoraId: perfil.organizadoraId || null,
        feiraId: perfil.feiraId || null,
        contatoNome: perfil.contatoNome || '', telefone: perfil.telefone || '', localizacao: perfil.localizacao || '',
        quantidadePersonalizada: quantidadePersonalizada(listarElementos(superficies,objetos,analise,modelo.recorte), acabamentos, ativas, pontosEletricos(escolhas), modelo.objetos || []),
        feira: perfil?.feira || null,
        modeloId: modelo.id,
        modeloNome: modelo.nome,
        acabamentos, pendenciasArte,eletrica:{pontos:pontosEletricos(escolhas),limites:limitesGizmo},
        objetos: (objetos || []).map((o) => ({ id: o.id, nome: o.nome, transform: o.transform || {dx:0,dz:0,rotY:0} })),
        // As escolhas vão pelo nome, não só pelo id: quem abrir a proposta na
        // produção precisa ler "Depósito na ponta esquerda" sem ter que
        // consultar o mapeamento do modelo para traduzir um id.
        escolhas,
        complementos: ativas.map(registroComplemento),
        itens: orcamento.itens,
        total: orcamento.total,
      }})
      registrada=true;registrar('envio')
      setGravado({ id: ref.id, imagem, pendenciasArte,eletrica:{pontos:pontosEletricos(escolhas),limites:limitesGizmo}, itens: orcamento.itens, total: orcamento.total, complementos: ativas.map(registroComplemento) })
    } catch (ex) {
      registrar('envio_erro')
      if(arquivoEnviado&&!registrada)try{await deleteObject(arquivoEnviado)}catch{/* O arquivo fica sem proposta; um novo envio usa outro ID. */}
      alert(`Não foi possível gravar: ${ex.message}`)
    } finally {
      setGravando(false)
    }
  }

  const baixarPDF = () => {
    const html = gerarPropostaHTML({
      cliente: perfil?.nome || user.email,
      email: user.email,
      feira: perfil?.feira,
      modelo: modelo?.nome, pendenciasArte:gravado?.pendenciasArte || pendenciasArte,
      itens: gravado?.itens || orcamento.itens,
      total: gravado?.total ?? orcamento.total,
      complementos: gravado?.complementos || ativas.map(registroComplemento),
      imagem: gravado?.imagem || window.__psfShot?.() || null,
      eletrica:gravado?.eletrica || {pontos:pontosEletricos(escolhas),limites:limitesGizmo},
    })
    const w = window.open('', '_blank')
    if (!w) { alert('O navegador bloqueou a janela. Libere pop-ups para gerar o PDF.'); return }
    w.document.write(html); w.document.close()
  }

  if (erro) {
    return (
      <div className="card card-pad" style={{ maxWidth: 460, margin: '80px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 10, opacity: .6 }}>🗂</div>
        <h2 style={{ fontSize: 17, marginBottom: 8 }}>Ainda não há projeto</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>{erro}</p>
      </div>
    )
  }

  return (
    <div className="studio-workspace">
      {tutorial && <Tutorial aoFechar={fecharTutorial} />}

      <div className="studio-cena">
        {(carregando || !cena) && !erroGlb && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 5 }}>
            <div className="col" style={{ alignItems: 'center', gap: 12, width: 240 }}>
              <span className="spinner" style={{ width: 22, height: 22 }} />
              <div className="muted" style={{ fontSize: 13 }}>Carregando seu estande…</div>
              <div className="progress" style={{ width: '100%' }}><i style={{ width: `${(progresso || 0) * 100}%` }} /></div>
            </div>
          </div>
        )}

        {erroGlb && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'grid', placeItems: 'center', padding: 30 }}>
            <div className="card card-pad" style={{ maxWidth: 420, textAlign: 'center', borderColor: 'rgba(244,63,94,.35)' }}>
              <div style={{ color: '#fda4af', fontWeight: 700, marginBottom: 6 }}>{erroGlb.titulo}</div>
              <div className="muted" style={{ fontSize: 13 }}>{erroGlb.detalhe}</div>
            </div>
          </div>
        )}

        <Viewer exportadorRef={exportadorRef} {...cenaCliente} aoTransformarExtra={transformarExtra} cena={cena} papeis={modelo?.papeis} modo="original" recorte={modelo?.recorte}
          indice={indice} acabamentos={acabamentos} supFoco={supFoco} objetos={objetos}
          complementos={modelo?.complementos || []} extras={extras} escondidos={escondidos} objFoco={objFoco}
          objSel={objSel} aoTransformarObjeto={transformarObjeto} limitesGizmo={limitesGizmo}
          realceSuave mostrarGrade={!!objSel} somentePersonalizaveis
          aoSelecionar={(s, o) => { setSupFoco(s); setObjFoco(o); setObjSel(null) }}
          vista={vista} aoAplicarVista={() => setVista(null)} />

        {/* vistas prontas: girar com o mouse não é óbvio para quem não usa 3D */}
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {VISTAS.map((v) => (
            <button key={v.id} className="chip" onClick={() => setVista(v.id)}
              style={{ backdropFilter: 'blur(10px)' }}>{v.rotulo}</button>
          ))}
        </div>

        <button className="chip" onClick={() => {registrar('ajuda');setTutorial(true)}}
          style={{ position: 'absolute', bottom: 14, left: 14, backdropFilter: 'blur(10px)' }}>
          ? Como funciona
        </button>

        <div className="dim dica-cena" style={{
          position: 'absolute', bottom: 64, left: 14, fontSize: 11.5,
          background: 'rgba(7,10,20,.7)', backdropFilter: 'blur(8px)',
          padding: '6px 11px', borderRadius: 99, border: '1px solid var(--line)',
        }}>
          {cenaCliente.modoEletrica?'Clique no piso para marcar o ponto elétrico':objSel
            ? 'Arraste a marca verde para mover · o anel azul para girar'
            : 'Clique para personalizar · arraste para girar'}
        </div>
      </div>

      <aside className="studio-painel">
        <div className="cliente-projeto" style={{ padding: '18px 18px 0' }}>
          <h1 style={{ fontSize: 19, marginBottom: 3 }}>Seu estande</h1>
          <div className="filtros-elementos" style={{ margin: '12px 0' }}>
            <button className="btn btn-sm" disabled={!historico.podeDesfazer || gravando} onClick={()=>{registrar('desfazer');historico.desfazer()}}>↶ Desfazer</button>
            <button className="btn btn-sm" disabled={!historico.podeRefazer || gravando} onClick={()=>{registrar('refazer');historico.refazer()}}>↷ Refazer</button>
          </div>
          <details className="dim" style={{fontSize:11,marginBottom:10}}><summary>Dados de uso para melhorar a ferramenta</summary><p>A USET registra etapas, tempo ativo, erros e contagens de ações ligados à sua conta. Não registra o conteúdo das artes, senhas ou textos digitados. A consulta fica restrita ao admin.</p><label><input type="checkbox" checked={metricas} onChange={e=>{setMetricas(e.target.checked);try{localStorage.setItem('psf.metricas',e.target.checked?'sim':'nao')}catch{}}}/> Permitir métricas de uso neste navegador</label></details>
          <small className="dim" role="status">{rascunhoStatus}</small>
          <div className="dim" style={{ fontSize: 12.5 }}>
            {modelo?.nome}{perfil?.feira ? ` · ${perfil.feira}` : ''}
          </div>
        </div>

        <div style={{ padding: 18, flex: 1 }}>
          {analise ? (
            <fieldset disabled={gravando} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><PainelExpositor cena={cena} chaveRascunho={`${user.uid}.${modelo.id}.${modelo.atualizadoEm?.seconds||0}`} aoVista={setVista} aoCena={patch=>setCenaCliente(c=>({...c,...patch}))} solicitarRevisao={solicitarRevisao} aoRevisao={setRevisando}
              aoEnviarArte={setEnviandoArte} aoReiniciar={reiniciar} aoEvento={registrar} aoErroUpload={()=>registrar('upload_erro')}
              analise={analise} superficies={superficies}
              acabamentos={acabamentos} setAcabamentos={setAcabamentos}
              supFoco={supFoco} setSupFoco={setSupFoco}
              complementos={complementos} escolhas={escolhas} setEscolhas={setEscolhas}
              objetos={objetos} setObjetos={setObjetos} objFoco={objFoco} setObjFoco={setObjFoco}
              objSel={objSel} setObjSel={escolherObjeto}
              recorte={modelo?.recorte} precos={precos} orcamento={orcamento} /></fieldset>
          ) : null}
        </div>

        <div className="cliente-total" style={{
          position: 'sticky', bottom: 0, padding: 18, background: 'rgba(4,6,13,.94)',
          backdropFilter: 'blur(10px)', borderTop: '1px solid var(--line)',
        }}>
          {gravado ? (
            <>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--r)', marginBottom: 10,
                background: 'rgba(22,224,163,.08)', border: '1px solid var(--brand-green)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--brand-green)' }}>Proposta enviada</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  {organizadora?.cobranca==='organizadora'?`${organizadora.nome} recebeu sua proposta e entrará em contato para combinar os próximos passos.`:'A USET recebeu sua personalização. O valor será revisado antes do pagamento.'}
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: 12 }} onClick={baixarPDF}>
                Baixar proposta em PDF
              </button>
            </>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="label" style={{ fontSize: 10.5 }}>Adicionais escolhidos</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, color: 'var(--brand-green)' }}>
                  {fmtBRL(orcamento.total)}
                </span>
              </div>
              {/* Trocar o depósito de lugar pode custar zero e mesmo assim é uma
                  escolha que a produção precisa receber — então também libera o
                  envio, não só o que gera valor. */}
              <button className={`btn ${revisando?'btn-primary':'btn-ghost btn-sm'}`} style={{ width: '100%', padding: 12 }}
                disabled={gravando || enviandoArte || !analise || cenaCliente.compararOriginal || !!erroCatalogo || carregandoCatalogo} onClick={revisando?gravar:()=>setSolicitarRevisao(v=>v+1)}>
                {gravando ? <><span className="spinner" /> Enviando…</> : revisando ? organizadora?.cobranca==='organizadora'?'Enviar proposta para a organizadora':'Enviar escolhas para a USET' : 'Ver resumo das escolhas'}
              </button>
              {erroCatalogo&&<p role="alert" className="dim">{erroCatalogo} O envio aguarda a consulta dos preços.</p>}
              {!orcamento.itens.length && !ativas.length && !objetos.some(o => o.transform?.dx || o.transform?.dz || o.transform?.rotY) && (
                <div className="dim" style={{ fontSize: 11.5, marginTop: 8, textAlign: 'center' }}>
                  Você também pode enviar o projeto original, sem adicionais.
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
