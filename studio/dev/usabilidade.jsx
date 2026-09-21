import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Viewer, { carregarGLB } from '../src/components/Viewer.jsx'
import PainelElementos from '../src/components/PainelElementos.jsx'
import PainelExpositor from '../src/components/PainelExpositor.jsx'
import { analisar } from '../src/lib/glb/analyze.js'
import { superficiesPadrao, indicePorPeca } from '../src/lib/glb/superficies.js'
import { detectarObjetos, numerar } from '../src/lib/glb/objetos.js'
import { organizarElementos, limitarTransformacao } from '../src/lib/glb/elementos.js'
import { calcularOrcamento, fmtBRL } from '../src/lib/glb/precos.js'
import { caixaDe } from '../src/lib/glb/complementos.js'
import { criarCenaExemplo } from './exemplo.js'
import '../src/styles/app.css'

function Previa({ cena, nome, controles }) {
  const analise = useMemo(() => analisar(cena), [cena])
  const papeis = useMemo(() => Object.fromEntries(analise.materiais.map(m => [m.nome, m.papelSugerido])), [analise])
  const iniciais = useMemo(() => {
    const sups = superficiesPadrao(analise, papeis)
    const objetos = numerar(detectarObjetos(analise, papeis, { superficies: sups }))
    return { superficies: organizarElementos(analise, sups, objetos), objetos }
  }, [analise, papeis])
  const [superficies, setSuperficies] = useState(iniciais.superficies)
  const [objetos, setObjetos] = useState(iniciais.objetos)
  const [acabamentos, setAcabamentos] = useState({})
  const [escolhas, setEscolhas] = useState({})
  const [supFoco, setSupFoco] = useState(null)
  const [objFoco, setObjFoco] = useState(null)
  const [objSel, setObjSel] = useState(null)
  const [vista, setVista] = useState(null)
  const [admin, setAdmin] = useState(true)
  const [salvo, setSalvo] = useState(false)
  const [partesFoco, setPartesFoco] = useState(null)
  const indice = useMemo(() => indicePorPeca(superficies), [superficies])
  const caixa = useMemo(() => caixaDe(cena), [cena])
  const limites = { x0: caixa.min[0], x1: caixa.max[0], z0: caixa.min[2], z1: caixa.max[2] }
  const orcamento = calcularOrcamento({ analise, superficies, objetos, acabamentos,
    precos: { bagum: { unidade: 'm2', valor: 30 }, madeira: { unidade: 'm2', valor: 45 }, piso: { unidade: 'm2', valor: 25 } } })
  const selecionar = (s, o) => { setSupFoco(s); setObjFoco(o); setObjSel(null) }
  const uploadLocal = f => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve({ arte: r.result, nomeArte: f.name }); r.onerror = reject; r.readAsDataURL(f) })
  return <>
    <header className="topbar"><span className="brand-mark">U</span><strong>Stand Studio</strong><span className="spacer" />
      <span className="dim" style={{ fontSize: 11 }}>Prévia local · sem envio de dados</span></header>
    <div className="studio-workspace">
      <div className="studio-cena"><Viewer cena={cena} papeis={papeis} indice={indice} acabamentos={admin ? {} : acabamentos}
        objetos={objetos} partesFoco={partesFoco} supFoco={supFoco} objFoco={objFoco} objSel={objSel} realceSuave mostrarGrade={!!objSel}
        aoSelecionar={selecionar} somentePersonalizaveis={!admin} vista={vista} aoAplicarVista={() => setVista(null)}
        limitesGizmo={limites} aoTransformarObjeto={(id, patch) => setObjetos(os => os.map(o => o.id === id ? { ...o, transform: limitarTransformacao(o, patch, limites) } : o))} />
        <div className="filtros-elementos" style={{ position: 'absolute', top: 14, left: 14 }}><button className="chip" onClick={() => setVista('perspectiva')}>Visão geral</button><button className="chip" onClick={() => setVista('cima')}>Vista de cima</button></div>
      </div>
      <aside className="studio-painel"><div style={{ padding: '18px 18px 0' }}><h1 style={{ fontSize: 19 }}>{nome}</h1><small className="dim">Teste de paredes, piso e móveis</small>{controles}</div>
        <nav className="etapas-studio"><button className={`btn ${admin ? 'btn-primary' : ''}`} onClick={() => { setAdmin(true); selecionar(null, null) }}>1 · Revisar elementos</button><button className={`btn ${!admin ? 'btn-primary' : ''}`} onClick={() => { setAdmin(false); selecionar(null, null) }}>2 · Ver como expositor</button></nav>
        <div style={{ padding: 18 }}>{admin ? <PainelElementos {...{ analise, superficies, objetos, setSuperficies, setObjetos, supFoco, objFoco }} aoSelecionar={selecionar}
          acabamentos={acabamentos} setAcabamentos={setAcabamentos} aoFocarPartes={setPartesFoco} aoOrganizar={() => setSuperficies(organizarElementos(analise, superficies, objetos))} />
          : <PainelExpositor {...{ analise, superficies, objetos, setObjetos, acabamentos, setAcabamentos, escolhas, setEscolhas, supFoco, setSupFoco, objFoco, setObjFoco, objSel, orcamento }}
            setObjSel={id => { setObjSel(id); if (id) setVista('cima') }} enviarArquivo={uploadLocal} />}

        </div>
        <div style={{ position: 'sticky', bottom: 0, padding: 18, background: 'var(--bg-deep)', borderTop: '1px solid var(--line)' }}>
          {!admin && <p>Total das personalizações <strong>{fmtBRL(orcamento.total)}</strong></p>}
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setSalvo(true)}>{admin ? 'Conferir configuração local' : 'Conferir personalização'}</button>
          {salvo && <p role="status" className="dim">Exemplo conferido. Esta prévia não envia dados ao Firebase.</p>}
        </div>
      </aside>
    </div>
  </>
}
function Laboratorio() {
  const [modelo, setModelo] = useState(() => ({ cena: criarCenaExemplo(), nome: 'Estande de exemplo', id: 0 }))
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  async function abrir(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    setCarregando(true); setErro('')
    try {
      const cena = await carregarGLB(arquivo)
      setModelo(m => ({ cena, nome: arquivo.name, id: m.id + 1 }))
    } catch (err) { setErro(`Não foi possível abrir o GLB: ${err.message || 'arquivo inválido'}`) }
    finally { setCarregando(false) }
  }
  const controles = <div style={{ marginTop: 12 }}>
    <label className="btn" style={{ display: 'block', maxWidth: '100%', boxSizing: 'border-box' }}>{carregando ? 'Abrindo modelo…' : 'Abrir GLB do computador'}
      <input aria-label="Abrir GLB do computador" type="file" accept=".glb" disabled={carregando} onChange={abrir} style={{ maxWidth: '100%', display: 'block', marginTop: 8 }} />
    </label>
    <p className="dim" style={{ fontSize: 11 }}>O arquivo permanece neste navegador. Trocar o modelo reinicia este teste.</p>
    {erro && <p role="alert">{erro}</p>}
  </div>
  return <Previa key={modelo.id} {...modelo} controles={controles} />
}
if (import.meta.env.DEV) createRoot(document.getElementById('root')).render(<React.StrictMode><Laboratorio /></React.StrictMode>)
