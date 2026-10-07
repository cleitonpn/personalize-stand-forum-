import { useEffect, useRef, useState } from 'react'
import { montarTutorial, DURACOES } from '../lib/tutorial/motor.js'
import '../lib/tutorial/tutorial.css'

const PASSOS = [
  { titulo: 'Seu projeto já vem pronto', texto: 'Paredes, piso e mobiliário já fazem parte do estande que você contratou. Gire a cena com o mouse ou use as vistas prontas e siga o passo a passo.' },
  { titulo: 'Coloque sua marca', texto: 'Escolha uma parede ou lona, toque numa cor da cartela ou envie a imagem da sua marca. O estande muda na hora, e o total acompanha.' },
  { titulo: 'Piso e mobiliário', texto: 'Compare as cores do piso e, nos móveis liberados, use Ajustar posição para arrastar a peça. Não gostou? Desfazer volta um passo.' },
  { titulo: 'Complementos e elétrica', texto: 'Inclua itens extras, como o painel de LED, e toque no piso onde precisa de um ponto de energia. O valor aparece antes de você confirmar.' },
  { titulo: 'Revise e envie', texto: 'Confira suas mudanças e o valor adicional, envie as escolhas para a USET e baixe a proposta em PDF. Este guia fica sempre em “? Como funciona”.' },
]
const PAUSA = 2.6 // segundos parados no quadro final antes de avançar sozinho

export default function Tutorial({ aoFechar }) {
  const [i, setI] = useState(0)
  const [manual, setManual] = useState(false)
  const palco = useRef(null), motor = useRef(null), barra = useRef(null), principal = useRef(null)
  const passo = useRef(0); passo.current = i
  const ultimo = i === PASSOS.length - 1

  useEffect(() => {
    motor.current = montarTutorial(palco.current)
    principal.current?.focus()
    return () => motor.current?.destruir()
  }, [])

  useEffect(() => {
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches
    const d = DURACOES[i], t0 = performance.now()
    let raf
    const quadro = agora => {
      const t = reduz ? d : Math.min(d, (agora - t0) / 1000)
      motor.current?.render(i, t)
      if (barra.current) barra.current.style.width = (t / d) * 100 + '%'
      if (!reduz && !manual && !ultimo && (agora - t0) / 1000 > d + PAUSA) { setI(i + 1); return }
      if (!reduz || t < d) raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(raf)
  }, [i, manual, ultimo])

  const ir = k => { setManual(true); setI(Math.max(0, Math.min(PASSOS.length - 1, k))) }

  useEffect(() => {
    const tecla = e => {
      if (e.key === 'Escape') aoFechar()
      if (e.key === 'ArrowRight') ir(passo.current + 1)
      if (e.key === 'ArrowLeft') ir(passo.current - 1)
    }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }, [aoFechar])

  const p = PASSOS[i]
  return (
    <div className="tutorial-fundo" role="dialog" aria-modal="true" aria-labelledby="tutorial-titulo">
      <div className="tutorial-modal">
        <div className="tutorial-topo">
          <span>Como personalizar seu estande</span>
          <button className="tutorial-pular" onClick={aoFechar}>Pular tutorial</button>
        </div>
        <div className="tutorial-palco"><div ref={palco} aria-hidden="true" /></div>
        <div className="tutorial-tempo"><i ref={barra} /></div>
        <div className="tutorial-legenda" aria-live="polite">
          <small>Passo {i + 1} de {PASSOS.length}</small>
          <h2 id="tutorial-titulo">{p.titulo}</h2>
          <p>{p.texto}</p>
        </div>
        <div className="tutorial-rodape">
          <div className="tutorial-pontos">
            {PASSOS.map((x, k) => <button key={k} aria-label={`Passo ${k + 1}: ${x.titulo}`} aria-current={k === i ? 'step' : undefined} onClick={() => ir(k)} />)}
          </div>
          {i > 0 && <button className="btn" onClick={() => ir(i - 1)}>Voltar</button>}
          {ultimo
            ? <button ref={principal} className="btn btn-primary tutorial-comecar" onClick={aoFechar}>Começar a personalizar meu estande →</button>
            : <button ref={principal} className="btn btn-primary" onClick={() => ir(i + 1)}>Próximo →</button>}
        </div>
      </div>
    </div>
  )
}
