import { useState } from 'react'

const PASSOS = [
  {
    icone: '🎨',
    titulo: 'Escolha as cores',
    texto: 'Cada superfície liberada tem uma cartela de cores. Clique numa cor e o estande muda na hora, no 3D ao lado.',
  },
  {
    icone: '🖼',
    titulo: 'Aplique sua arte',
    texto: 'Onde houver o botão de arte, envie a imagem da sua campanha. Ela é aplicada direto na lona ou no adesivo.',
  },
  {
    icone: '🧩',
    titulo: 'Troque peças de lugar',
    texto: 'Alguns pontos do estande têm opções prontas — um painel de LED, o depósito noutra posição. Clique numa opção e a peça entra no 3D; clique na primeira para voltar ao projeto original.',
  },
  {
    icone: '🖱',
    titulo: 'Gire e aproxime',
    texto: 'Arraste com o botão esquerdo para girar o estande. Use a rolagem do mouse para aproximar e afastar.',
  },
  {
    icone: '💰',
    titulo: 'Acompanhe o valor',
    texto: 'Cada escolha soma no total, calculado pela metragem real de cada parede. O mobiliário do projeto já está incluso.',
  },
  {
    icone: '📄',
    titulo: 'Envie a proposta',
    texto: 'Quando estiver satisfeito, clique em Gravar. A equipe da USET recebe sua personalização e você baixa o PDF.',
  },
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
