import { useState } from 'react'

const PASSOS = [
  { icone: '☝', titulo: 'Escolha uma parte do estande', texto: 'Clique em uma parede, no piso ou em um móvel. Você também pode escolher pela lista. As opções daquela parte aparecem no painel.' },
  { icone: '🎨', titulo: 'Experimente suas escolhas', texto: 'Escolha uma cor ou envie sua imagem. Nos móveis liberados, use Ajustar posição. Desfazer e Refazer ajudam a experimentar; as alterações ficam salvas neste navegador.' },
  { icone: '✓', titulo: 'Confira e envie', texto: 'Veja o total e clique em Enviar personalização para encaminhar suas escolhas à USET. Depois você pode salvar a proposta em PDF.' },
]

export default function Tutorial({ aoFechar }) {
  const [i, setI] = useState(0)
  const p = PASSOS[i]
  const ultimo = i === PASSOS.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center',
      background: 'rgba(4,6,13,.82)', backdropFilter: 'blur(6px)', padding: 24,
    }}>
      <div className="card card-pad fade-up" style={{ maxWidth: 460, width: '100%' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          <span className="label">Como personalizar seu estande</span>
          <button className="btn btn-ghost btn-sm" onClick={aoFechar}>Pular</button>
        </div>

        <div style={{ textAlign: 'center', padding: '10px 0 22px' }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>{p.icone}</div>
          <h2 style={{ fontSize: 19, marginBottom: 9 }}>{p.titulo}</h2>
          <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.65 }}>{p.texto}</p>
        </div>

        <div className="row" style={{ gap: 6, justifyContent: 'center', marginBottom: 18 }}>
          {PASSOS.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Passo ${k + 1}`}
              style={{
                width: k === i ? 22 : 7, height: 7, borderRadius: 99,
                background: k === i ? 'var(--brand-green)' : 'var(--surface-3)',
                transition: 'all var(--t) var(--ease)',
              }} />
          ))}
        </div>

        <div className="row" style={{ gap: 8 }}>
          {i > 0 && (
            <button className="btn" style={{ flex: 1 }} onClick={() => setI(i - 1)}>Voltar</button>
          )}
          <button className="btn btn-primary" style={{ flex: 2, padding: 11 }}
            onClick={() => (ultimo ? aoFechar() : setI(i + 1))}>
            {ultimo ? 'Começar a personalizar' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}
