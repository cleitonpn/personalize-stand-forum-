import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { useAuth } from '../store/AuthContext.jsx'
import Viewer, { useGLB, VISTAS } from '../components/Viewer.jsx'
import PainelExpositor from '../components/PainelExpositor.jsx'
import { analisar } from '../lib/glb/analyze.js'
import { indicePorPeca } from '../lib/glb/superficies.js'
import { calcularOrcamento, fmtBRL } from '../lib/glb/precos.js'
import { PRECOS_PADRAO, PRECOS_OBJETO_PADRAO } from '../lib/glb/precos.js'
import Tutorial from '../components/Tutorial.jsx'
import { gerarPropostaHTML } from '../lib/proposta.js'
import { opcoesAtivas, superficiesEscondidas, chavesEscondidas, pecasParaCena } from '../lib/glb/complementos.js'
import { limitesDoEstande } from '../lib/glb/nomes.js'
import { limitarTransformacao } from '../lib/glb/elementos.js'
import { useHistorico } from '../lib/useHistorico.js'

export default function Expositor() {
  const { user, perfil } = useAuth()
  const [modelo, setModelo] = useState(null)
  const [erro, setErro] = useState(null)
  const historico = useHistorico({ acabamentos: {}, escolhas: {}, objetos: [] })
  const { acabamentos, escolhas, objetos, restaurar } = historico
  const setAcabamentos = v => historico.mudar('acabamentos', v)
  const setEscolhas = v => historico.mudar('escolhas', v)
  const setObjetos = v => historico.mudar('objetos', v)
  const [rascunhoStatus, setRascunhoStatus] = useState('')
  const [enviandoArte, setEnviandoArte] = useState(false)
  const [supFoco, setSupFoco] = useState(null)
  const [objFoco, setObjFoco] = useState(null)
  const [objSel, setObjSel] = useState(null)
  const [tutorial, setTutorial] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [gravado, setGravado] = useState(null)
  const [vista, setVista] = useState(null)

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
  const analise = useMemo(() => (cena ? analisar(cena) : null), [cena])

  const superficies = modelo?.superficies || []
  const precos = { ...PRECOS_PADRAO, ...(modelo?.precos || {}) }
  const precosObjeto = { ...PRECOS_OBJETO_PADRAO, ...(modelo?.precosObjeto || {}) }
  const indice = useMemo(() => (superficies.length ? indicePorPeca(superficies) : null), [superficies])

  const complementos = modelo?.complementos || []
  const ativas = useMemo(() => opcoesAtivas(complementos, escolhas), [complementos, escolhas])
  const extras = useMemo(() => pecasParaCena(ativas), [ativas])
  const escondidos = useMemo(() => chavesEscondidas(ativas, superficies), [ativas, superficies])

  const orcamento = useMemo(() => (analise ? calcularOrcamento({
    analise, superficies, objetos, acabamentos, precos, precosObjeto, recorte: modelo?.recorte,
    complementos: { ativas, escondidas: superficiesEscondidas(ativas) },
  }) : { itens: [], total: 0, porGrupo: {} }), [analise, superficies, objetos, acabamentos, modelo, ativas])

  // Escolher a peça vira a câmera para cima: é de lá que arrastar no chão
  // corresponde exatamente ao movimento do mouse, sem dúvida de profundidade.
  const escolherObjeto = (id) => {
    setObjSel(id)
    setObjFoco(id)
    if (id) setVista('cima')
  }

  const transformarObjeto = (id, patch) => !gravando && setObjetos((os) => os.map((o) => (o.id === id
    ? { ...o, transform: limitarTransformacao(o, patch, limitesDoEstande(analise, modelo?.recorte)) }
    : o)))

  const limitesGizmo = useMemo(
    () => (analise ? limitesDoEstande(analise, modelo?.recorte) : null),
    [analise, modelo],
  )

  const fecharTutorial = () => {
    setTutorial(false)
    try { localStorage.setItem(`psf.tutorial.${user.uid}`, '1') } catch { /* opcional */ }
  }

  const gravar = async () => {
    if (enviandoArte || gravando) return
    setGravando(true)
    try {
      // A imagem do 3D entra na proposta como registro do que foi escolhido.
      const imagem = window.__psfShot?.() || null
      const ref = await addDoc(collection(db, 'propostas'), {
        cliente: user.uid,
        clienteNome: perfil?.nome || user.email,
        clienteEmail: user.email,
        feira: perfil?.feira || null,
        modeloId: modelo.id,
        modeloNome: modelo.nome,
        acabamentos,
        objetos: (objetos || []).map((o) => ({ id: o.id, nome: o.nome, transform: o.transform })),
        // As escolhas vão pelo nome, não só pelo id: quem abrir a proposta na
        // produção precisa ler "Depósito na ponta esquerda" sem ter que
        // consultar o mapeamento do modelo para traduzir um id.
        escolhas,
        complementos: ativas.map((o) => ({
          grupo: o.grupoNome, opcao: o.nome, arquivo: o.arquivo?.nomeOriginal || null,
        })),
        itens: orcamento.itens,
        total: orcamento.total,
        criadoEm: serverTimestamp(),
      })
      setGravado({ id: ref.id, imagem, itens: orcamento.itens, total: orcamento.total, complementos: ativas.map(o => ({ grupo: o.grupoNome, opcao: o.nome })) })
    } catch (ex) {
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
      modelo: modelo?.nome,
      itens: gravado?.itens || orcamento.itens,
      total: gravado?.total ?? orcamento.total,
      complementos: gravado?.complementos || ativas.map((o) => ({ grupo: o.grupoNome, opcao: o.nome })),
      imagem: gravado?.imagem || window.__psfShot?.() || null,
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

        <Viewer cena={cena} papeis={modelo?.papeis} modo="original" recorte={modelo?.recorte}
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

        <button className="chip" onClick={() => setTutorial(true)}
          style={{ position: 'absolute', bottom: 14, left: 14, backdropFilter: 'blur(10px)' }}>
          ? Como funciona
        </button>

        <div className="dim" style={{
          position: 'absolute', bottom: 64, left: 14, fontSize: 11.5,
          background: 'rgba(7,10,20,.7)', backdropFilter: 'blur(8px)',
          padding: '6px 11px', borderRadius: 99, border: '1px solid var(--line)',
        }}>
          {objSel
            ? 'Arraste a marca verde para mover · o anel azul para girar'
            : 'Clique para personalizar · arraste para girar'}
        </div>
      </div>

      <aside className="studio-painel">
        <div style={{ padding: '18px 18px 0' }}>
          <h1 style={{ fontSize: 19, marginBottom: 3 }}>Seu estande</h1>
          <div className="filtros-elementos" style={{ margin: '12px 0' }}>
            <button className="btn btn-sm" disabled={!historico.podeDesfazer || gravando} onClick={historico.desfazer}>↶ Desfazer</button>
            <button className="btn btn-sm" disabled={!historico.podeRefazer || gravando} onClick={historico.refazer}>↷ Refazer</button>
          </div>
          <small className="dim" role="status">{rascunhoStatus}</small>
          <div className="dim" style={{ fontSize: 12.5 }}>
            {modelo?.nome}{perfil?.feira ? ` · ${perfil.feira}` : ''}
          </div>
        </div>

        <div style={{ padding: 18, flex: 1 }}>
          {analise ? (
            <fieldset disabled={gravando} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><PainelExpositor
              aoEnviarArte={setEnviandoArte}
              analise={analise} superficies={superficies}
              acabamentos={acabamentos} setAcabamentos={setAcabamentos}
              supFoco={supFoco} setSupFoco={setSupFoco}
              complementos={complementos} escolhas={escolhas} setEscolhas={setEscolhas}
              objetos={objetos} setObjetos={setObjetos} objFoco={objFoco} setObjFoco={setObjFoco}
              objSel={objSel} setObjSel={escolherObjeto}
              recorte={modelo?.recorte} precos={precos} orcamento={orcamento} /></fieldset>
          ) : null}
        </div>

        <div style={{
          position: 'sticky', bottom: 0, padding: 18, background: 'rgba(4,6,13,.94)',
          backdropFilter: 'blur(10px)', borderTop: '1px solid var(--line)',
        }}>
          {gravado ? (
            <>
              <div style={{ padding: '10px 12px', borderRadius: 'var(--r)', marginBottom: 10,
                background: 'rgba(22,224,163,.08)', border: '1px solid var(--brand-green)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--brand-green)' }}>Proposta enviada</div>
                <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                  A equipe da USET já recebeu sua personalização.
                </div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: 12 }} onClick={baixarPDF}>
                Baixar proposta em PDF
              </button>
            </>
          ) : (
            <>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="label" style={{ fontSize: 10.5 }}>Total</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 21, color: 'var(--brand-green)' }}>
                  {fmtBRL(orcamento.total)}
                </span>
              </div>
              {/* Trocar o depósito de lugar pode custar zero e mesmo assim é uma
                  escolha que a produção precisa receber — então também libera o
                  envio, não só o que gera valor. */}
              <button className="btn btn-primary" style={{ width: '100%', padding: 12 }}
                disabled={gravando || enviandoArte || !analise || (!orcamento.itens.length && !ativas.length && !objetos.some(o => o.transform?.dx || o.transform?.dz || o.transform?.rotY))} onClick={gravar}>
                {gravando ? <><span className="spinner" /> Enviando…</> : 'Enviar personalização'}
              </button>
              {!orcamento.itens.length && !ativas.length && !objetos.some(o => o.transform?.dx || o.transform?.dz || o.transform?.rotY) && (
                <div className="dim" style={{ fontSize: 11.5, marginTop: 8, textAlign: 'center' }}>
                  Faça ao menos uma personalização para enviar.
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
