import { useRef } from 'react'
import { useStand, NAPAS, PAREDES } from '../store/StandStore.jsx'
import { LONAS_PADRAO } from '../three/textures.js'
import Swatches from './Swatches.jsx'

export default function ParedeEditor() {
  const { state, dispatch } = useStand()
  const fileRef = useRef(null)
  const sel = state.paredeSel
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
      <p className="hint">Escolha a parede e defina a cor da napa <b>ou</b> aplique uma lona impressa.</p>
      <div className="tabs">
        {Object.entries(PAREDES).map(([id, p]) => (
          <button key={id} className={`tab ${sel === id ? 'active' : ''}`} onClick={() => dispatch({ type: 'SELECT_PAREDE', parede: id })}>
            {p.rotulo}
          </button>
        ))}
      </div>

      <div className="wall-block">
        <div className="wall-block-title">Cor da napa</div>
        <Swatches grupos={NAPAS} grupoAtivo={parede.grupo} corId={parede.corId}
          onGrupo={(k) => dispatch({ type: 'SET_PAREDE_COR', parede: sel, grupo: k, corId: primeiraCor(k) })}
          onCor={(id) => dispatch({ type: 'SET_PAREDE_COR', parede: sel, grupo: parede.grupo, corId: id })} />
      </div>

      <div className="wall-block">
        <div className="wall-block-title">Lona impressa <span className="hint-inline">(+ orçamento)</span></div>
        <div className="lona-grid">
          {LONAS_PADRAO.map((l) => (
            <button key={l.id}
              className={`lona-opt ${parede.lona?.fonte === 'padrao' && parede.lona?.id === l.id ? 'sel' : ''}`}
              onClick={() => dispatch({ type: 'SET_LONA', parede: sel, lona: { fonte: 'padrao', id: l.id } })}>
              {l.nome}
            </button>
          ))}
          <button className="lona-opt upload" onClick={() => fileRef.current?.click()}>
            {parede.lona?.fonte === 'custom' ? `✓ ${parede.lona.nome?.slice(0, 14) || 'imagem'}` : '⬆ Enviar imagem'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={enviarImagem} />
        </div>
        {parede.lona && (
          <button className="btn btn-ghost" style={{ marginTop: 8, width: '100%' }}
            onClick={() => dispatch({ type: 'REMOVE_LONA', parede: sel })}>Remover lona</button>
        )}
      </div>
    </>
  )
}
