import { corPorId } from '../data/catalogo.js'

export default function Swatches({ grupos, grupoAtivo, corId, onGrupo, onCor }) {
  const itens = grupos[grupoAtivo].itens
  const cor = corPorId(corId)
  return (
    <>
      <div className="tabs">
        {Object.entries(grupos).map(([k, g]) => (
          <button key={k} className={`tab ${k === grupoAtivo ? 'active' : ''}`} onClick={() => onGrupo(k)}>
            {g.rotulo}
          </button>
        ))}
      </div>
      <div className="swatches">
        {itens.map((c) => (
          <div key={c.id} className={`swatch ${c.id === corId ? 'sel' : ''}`}
            style={{ background: c.hex }} title={`${c.nome} ${c.cb}`}
            onClick={() => onCor(c.id)} />
        ))}
      </div>
      {cor && <div className="sel-label">Selecionado: <b>{cor.nome}</b> {cor.cb && `· ${cor.cb}`}</div>}
    </>
  )
}
