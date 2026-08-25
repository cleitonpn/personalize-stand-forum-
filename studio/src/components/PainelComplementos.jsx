import { useRef, useState } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase.js'
import { carregarGLB } from './Viewer.jsx'
import { UNIDADES, fmtBRL, fmtM2 } from '../lib/glb/precos.js'
import {
  novoGrupo, novaOpcao, caixaDe, areaDaOpcao, conferirAlinhamento,
} from '../lib/glb/complementos.js'
import { limitesDoEstande } from '../lib/glb/nomes.js'

const n2 = (v) => (isFinite(v) ? v.toFixed(2) : '—')
const fmtMB = (b) => `${((b || 0) / 1024 / 1024).toFixed(1)} MB`

/* ------------------------- envio de uma peça .glb ------------------------ */
function EnviarPeca({ analise, recorte, aoCriar }) {
  const fileRef = useRef(null)
  const [nome, setNome] = useState('')
  const [progresso, setProgresso] = useState(null)
  const [erro, setErro] = useState(null)

  const escolher = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.glb')) { setErro('O arquivo precisa ser .glb.'); return }

    setErro(null); setProgresso(0)
    const rotulo = (nome.trim() || f.name.replace(/\.glb$/i, '').replace(/[_-]+/g, ' '))

    // Mede ANTES de enviar. Se a peça veio recentrada na origem, o admin
    // descobre agora — e não quando o expositor abrir e não achar nada.
    let bbox = null
    try {
      bbox = caixaDe(await carregarGLB(f))
    } catch {
      setProgresso(null)
      setErro('Não foi possível ler este .glb. Confira se o arquivo abre no visualizador.')
      return
    }

    const caminho = `modelos/${Date.now()}_peca_${f.name.replace(/[^\w.-]/g, '_')}`
    const tarefa = uploadBytesResumable(ref(storage, caminho), f, { contentType: 'model/gltf-binary' })
    tarefa.on('state_changed',
      (s) => setProgresso(s.bytesTransferred / s.totalBytes),
      (ex) => {
        setProgresso(null)
        setErro(ex.code === 'storage/unauthorized'
          ? 'Sem permissão para enviar. Confira as regras do Storage.'
          : `Falha no envio: ${ex.message}`)
      },
      async () => {
        const url = await getDownloadURL(tarefa.snapshot.ref)
        const opc = novaOpcao({
          nome: rotulo, bbox,
          arquivo: { caminho, url, bytes: f.size, nomeOriginal: f.name },
        })
        // Alinhamento fora do estande já entra com o ajuste sugerido preenchido;
        // sem isso o admin veria a peça sumida e teria que adivinhar o número.
        const check = conferirAlinhamento(bbox, limitesDoEstande(analise, recorte))
        if (!check.ok) opc.offset = check.sugestao
        aoCriar(opc)
        setNome(''); setProgresso(null)
      })
  }

  const enviando = progresso !== null

  return (
    <div className="col" style={{ gap: 7 }}>
      <div className="row" style={{ gap: 7 }}>
        <input className="input" value={nome} onChange={(e) => setNome(e.target.value)}
          placeholder="Nome da opção (ex.: Painel de LED)" disabled={enviando}
          style={{ padding: '7px 10px', fontSize: 12.5 }} />
        <button className="btn btn-sm" style={{ flex: 'none' }} disabled={enviando}
          onClick={() => fileRef.current?.click()}>
          {enviando ? <><span className="spinner" /> {Math.round(progresso * 100)}%</> : '⬆ Enviar .glb'}
        </button>
      </div>
      {enviando && <div className="progress"><i style={{ width: `${progresso * 100}%` }} /></div>}
      {erro && <div style={{ fontSize: 11.5, color: '#fda4af' }}>{erro}</div>}
      <input ref={fileRef} type="file" accept=".glb" hidden onChange={escolher} />
      <p className="dim" style={{ margin: 0, fontSize: 11, lineHeight: 1.6 }}>
        Exporte a peça do mesmo arquivo do projeto, <b>sem centralizar na origem</b>.
        Assim ela chega no lugar certo sozinha.
      </p>
    </div>
  )
}

/* ---------------------------- uma opção do grupo ------------------------- */
function Opcao({ opc, superficies, analise, recorte, mudar, remover, previa, setPrevia }) {
  const [abrirEsconde, setAbrirEsconde] = useState(false)
  const check = conferirAlinhamento(opc.bbox, limitesDoEstande(analise, recorte))
  const ativa = previa === opc.id
  const area = areaDaOpcao(opc.bbox)

  const alternarEsconde = (id) => mudar({
    esconde: opc.esconde.includes(id)
      ? opc.esconde.filter((x) => x !== id)
      : [...opc.esconde, id],
  })

  return (
    <div style={{
      padding: '11px 12px', borderRadius: 'var(--r)',
      background: ativa ? 'var(--surface-3)' : 'var(--bg-deep)',
      border: `1px solid ${ativa ? 'var(--brand-green)' : 'var(--line)'}`,
      transition: 'background var(--t) var(--ease), border-color var(--t) var(--ease)',
    }}>
      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
        <input className="input" value={opc.nome} onChange={(e) => mudar({ nome: e.target.value })}
          style={{ padding: '5px 9px', fontSize: 12.5, fontWeight: 600 }} />
        <button className={`chip ${ativa ? 'sel' : ''}`} style={{ flex: 'none' }}
          title="Mostra esta opção no 3D, do jeito que o expositor vai ver"
          onClick={() => setPrevia(ativa ? null : opc.id)}>
          {ativa ? '👁 no 3D' : 'Ver no 3D'}
        </button>
      </div>

      <div className="dim" style={{ fontSize: 11, marginBottom: 9 }}>
        {opc.arquivo?.nomeOriginal} · {fmtMB(opc.arquivo?.bytes)}
        {opc.bbox && ` · ${n2(opc.bbox.largura)}×${n2(opc.bbox.altura)}×${n2(opc.bbox.profundidade)} m`}
      </div>

      {!check.ok && (
        <div style={{
          padding: '9px 11px', borderRadius: 'var(--r)', marginBottom: 9,
          background: 'rgba(245,165,36,.08)', border: '1px solid rgba(245,165,36,.3)',
        }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--warn)', marginBottom: 3 }}>
            {check.titulo}
          </div>
          <div className="muted" style={{ fontSize: 11.5, lineHeight: 1.55 }}>{check.detalhe}</div>
        </div>
      )}

      {/* ajuste de posição — só faz falta quando o export veio recentrado */}
      <div className="label" style={{ fontSize: 10, marginBottom: 5 }}>Ajuste de posição (m)</div>
      <div className="row" style={{ gap: 6, marginBottom: 10 }}>
        {['X', 'Altura', 'Z'].map((rot, i) => (
          <input key={rot} className="input" type="number" step="0.1" title={rot}
            value={opc.offset?.[i] ?? 0}
            onChange={(e) => {
              const v = [...(opc.offset || [0, 0, 0])]
              v[i] = Number(e.target.value) || 0
              mudar({ offset: v })
            }}
            style={{ padding: '5px 8px', fontSize: 12 }} />
        ))}
      </div>

      {/* o que esta opção substitui */}
      <button className="btn btn-sm btn-ghost" style={{ width: '100%', marginBottom: 8 }}
        onClick={() => setAbrirEsconde((v) => !v)}>
        {opc.esconde.length
          ? `Substitui ${opc.esconde.length} superfície${opc.esconde.length > 1 ? 's' : ''} ▾`
          : 'O que some quando esta opção entra? ▾'}
      </button>
      {abrirEsconde && (
        <div className="col" style={{ gap: 5, marginBottom: 10, maxHeight: 190, overflowY: 'auto' }}>
          <p className="dim" style={{ margin: '0 0 2px', fontSize: 11, lineHeight: 1.55 }}>
            Marque o que sai de cena. Um painel novo normalmente não tira nada;
            um depósito noutra posição tira o do projeto.
          </p>
          {superficies.map((s) => (
            <label key={s.id} className="row" style={{ gap: 7, fontSize: 12, cursor: 'pointer' }}>
              <input type="checkbox" checked={opc.esconde.includes(s.id)}
                onChange={() => alternarEsconde(s.id)}
                style={{ width: 14, height: 14, flex: 'none', cursor: 'pointer' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
            </label>
          ))}
        </div>
      )}

      {/* preço da opção */}
      <div className="row" style={{ gap: 6 }}>
        <select className="select" value={opc.preco?.unidade || 'peca'}
          onChange={(e) => mudar({ preco: { ...opc.preco, unidade: e.target.value } })}
          style={{ padding: '5px 8px', fontSize: 12, width: 'auto', flex: 'none' }}>
          {Object.entries(UNIDADES).map(([k, r]) => <option key={k} value={k}>por {r}</option>)}
        </select>
        <input className="input" type="number" min="0" step="1" placeholder="0,00"
          value={opc.preco?.valor || ''}
          onChange={(e) => mudar({ preco: { ...opc.preco, valor: Number(e.target.value) || 0 } })}
          style={{ padding: '5px 9px', fontSize: 12 }} />
        <button className="btn btn-sm btn-ghost" style={{ flex: 'none', color: '#fda4af' }}
          onClick={remover} title="Remover esta opção">✕</button>
      </div>
      <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>
        {opc.preco?.valor
          ? (opc.preco.unidade === 'm2'
              ? `${fmtM2(area)} × ${fmtBRL(opc.preco.valor)} = ${fmtBRL(area * opc.preco.valor)}`
              : `${fmtBRL(opc.preco.valor)} por peça`)
          : 'Sem custo — aparece na proposta, mas não soma valor.'}
      </div>
    </div>
  )
}

/* -------------------------------- painel -------------------------------- */

/**
 * Complementos: as opções que o expositor escolhe e que trocam a GEOMETRIA,
 * não o acabamento.
 *
 * A tela é montada em torno de uma pergunta por bloco ("Painel de LED?",
 * "Onde fica o depósito?") porque é assim que o expositor vai ver. Escolher
 * uma opção sempre exclui as outras do mesmo bloco, e blocos diferentes não
 * conversam entre si — é isso que impede a explosão de combinações.
 */
export default function PainelComplementos({
  analise, recorte, superficies, grupos, setGrupos, previa, setPrevia,
}) {
  const mudarGrupo = (id, patch) =>
    setGrupos(grupos.map((g) => (g.id === id ? { ...g, ...patch } : g)))

  const mudarOpcao = (gid, oid, patch) =>
    setGrupos(grupos.map((g) => (g.id !== gid ? g : {
      ...g, opcoes: g.opcoes.map((o) => (o.id === oid ? { ...o, ...patch } : o)),
    })))

  return (
    <div className="col" style={{ gap: 13 }}>
      <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
        Aqui entram as escolhas que mudam a <b>peça</b>, não a cor: incluir um painel
        de LED, levar o depósito para outra ponta. Cada bloco é uma pergunta que o
        expositor vai responder, e cada opção é um <b>.glb</b> exportado do projeto.
      </p>

      <button className="btn btn-sm" style={{ width: '100%' }}
        onClick={() => setGrupos([...grupos, novoGrupo()])}>
        + Nova pergunta
      </button>

      {!grupos.length && (
        <div className="card card-pad" style={{ textAlign: 'center', padding: '26px 20px' }}>
          <div style={{ fontSize: 24, marginBottom: 8, opacity: .5 }}>🧩</div>
          <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>
            Nenhuma pergunta ainda. Crie uma para "Painel de LED na parede do
            depósito" ou "Posição do depósito".
          </p>
        </div>
      )}

      {grupos.map((g) => (
        <div key={g.id} className="card card-pad" style={{ padding: 14 }}>
          <div className="row" style={{ gap: 7, marginBottom: 9 }}>
            <input className="input" value={g.nome}
              onChange={(e) => mudarGrupo(g.id, { nome: e.target.value })}
              placeholder="O que o expositor escolhe aqui?"
              style={{ padding: '6px 10px', fontSize: 13, fontWeight: 600 }} />
            <button className="btn btn-sm btn-ghost" style={{ flex: 'none', color: '#fda4af' }}
              title="Remover esta pergunta"
              onClick={() => setGrupos(grupos.filter((x) => x.id !== g.id))}>✕</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 11 }}>
            <div className="field">
              <label className="label" style={{ fontSize: 10 }}>Aparece junto de</label>
              <select className="select" value={g.ancora || ''}
                onChange={(e) => mudarGrupo(g.id, { ancora: e.target.value || null })}
                style={{ padding: '6px 9px', fontSize: 12 }}>
                <option value="">Lista geral</option>
                {superficies.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label" style={{ fontSize: 10 }}>Nome da opção padrão</label>
              <input className="input" value={g.rotuloPadrao}
                onChange={(e) => mudarGrupo(g.id, { rotuloPadrao: e.target.value })}
                placeholder="Como está no projeto"
                style={{ padding: '6px 9px', fontSize: 12 }} />
            </div>
          </div>

          <div className="col" style={{ gap: 9, marginBottom: 11 }}>
            {(g.opcoes || []).map((o) => (
              <Opcao key={o.id} opc={o} superficies={superficies}
                analise={analise} recorte={recorte}
                previa={previa?.[g.id]} setPrevia={(v) => setPrevia({ ...previa, [g.id]: v })}
                mudar={(patch) => mudarOpcao(g.id, o.id, patch)}
                remover={() => mudarGrupo(g.id, { opcoes: g.opcoes.filter((x) => x.id !== o.id) })} />
            ))}
          </div>

          <EnviarPeca analise={analise} recorte={recorte}
            aoCriar={(opc) => mudarGrupo(g.id, { opcoes: [...(g.opcoes || []), opc] })} />
        </div>
      ))}
    </div>
  )
}
