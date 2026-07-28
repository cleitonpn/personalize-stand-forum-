import { useRef } from 'react'
import { useStand, NAPAS, PAREDES, ZONAS } from '../store/StandStore.jsx'
import { LONAS_PADRAO } from '../three/textures.js'
import { corPorId } from '../data/catalogo.js'
import Swatches from './Swatches.jsx'

export default function ParedeEditor() {
  const { state, dispatch } = useStand()
  const fileRef = useRef(null)
  const sel = state.paredeSel
  const zona = PAREDES[sel]?.zona || 'fundo'
  const parede = state.paredes[sel]
  const primeiraCor = (k) => NAPAS[k].itens[0].id

  const enviarImagem = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => dispatch({ type: 'SET_LONA', parede: sel, lona: { fonte: 'custom', dataUrl: reader.result, nome: f.name } })
    reader.readAsDataURL(f)
  }

  return (
    <>
      <p className="hint">Escolha a parede (ou clique nela na cena/planta) e defina a cor da napa <b>ou</b> aplique uma lona.</p>

      {/* zonas */}
      <div className="tabs">
        {Object.entries(ZONAS).map(([id, z]) => (
          <button key={id} className={`tab ${zona === id ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SELECT_PAREDE', parede: z.walls[0] })}>{z.rotulo}</button>
        ))}
      </div>

      {/* paredes da zona */}
      <div className="wall-chips">
        {ZONAS[zona].walls.map((id) => (
          <button key={id} className={`wall-chip ${sel === id ? 'sel' : ''}`}
            onClick={() => dispatch({ type: 'SELECT_PAREDE', parede: id })}>
            <span className="wc-sw" style={{ background: corHex(state, id) }} />
            {PAREDES[id].rotulo.split('·')[1]?.trim() || PAREDES[id].rotulo}
            {state.paredes[id].lona && <span className="wc-lona">▣</span>}
          </button>
        ))}
      </div>

      <div className="wall-block">
        <div className="wall-block-title">Cor da napa — {PAREDES[sel].rotulo}</div>
        <Swatches grupos={NAPAS} grupoAtivo={parede.grupo} corId={parede.corId}
          onGrupo={(k) => dispatch({ type: 'SET_PAREDE_COR', parede: sel, grupo: k, corId: primeiraCor(k) })}
          onCor={(id) => dispatch({ type: 'SET_PAREDE_COR', parede: sel, grupo: parede.grupo, corId: id })} />
      </div>

      {parede.logo !== undefined && (
        <div className="wall-block">
          <div className="wall-block-title">Logo Fórum nesta parede</div>
          <div className="toggle-row">
            <label className="switch">
              <input type="checkbox" checked={parede.logo !== false} onChange={() => dispatch({ type: 'TOGGLE_LOGO', parede: sel })} />
              <span className="slider" />
            </label>
            <span>{parede.logo !== false ? 'Logo exibido' : 'Logo removido — parede lisa'}</span>
          </div>
        </div>
      )}

      <div className="wall-block">
        <div className="wall-block-title">Lona impressa <span className="hint-inline">(+ orçamento)</span></div>
        <div className="lona-grid">
          {LONAS_PADRAO.map((l) => (
            <button key={l.id} className={`lona-opt ${parede.lona?.fonte === 'padrao' && parede.lona?.id === l.id ? 'sel' : ''}`}
              onClick={() => dispatch({ type: 'SET_LONA', parede: sel, lona: { fonte: 'padrao', id: l.id } })}>{l.nome}</button>
          ))}
          <button className="lona-opt upload" onClick={() => fileRef.current?.click()}>
            {parede.lona?.fonte === 'custom' ? `✓ ${parede.lona.nome?.slice(0, 14) || 'imagem'}` : '⬆ Enviar imagem'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={enviarImagem} />
        </div>
        {parede.lona && <button className="btn btn-ghost" style={{ marginTop: 8, width: '100%' }} onClick={() => dispatch({ type: 'REMOVE_LONA', parede: sel })}>Remover lona</button>}
      </div>

      <button className="btn" style={{ width: '100%', marginTop: 12 }}
        onClick={() => dispatch({ type: 'APLICAR_BLOCO', zona, de: sel })}>
        ⧉ Aplicar esta cor/lona em todo o bloco ({ZONAS[zona].rotulo})
      </button>
    </>
  )
}

function corHex(state, id) {
  return corPorId(state.paredes[id].corId)?.hex
}
