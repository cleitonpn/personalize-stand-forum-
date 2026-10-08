import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { montarShowreel, criarRitmo, CAPITULOS } from '../lib/showreel/motor.js'
import '../lib/showreel/showreel.css'

/* Abertura da página inicial: a apresentação toca sozinha, no ritmo de
   leitura, e termina parada na chamada para personalizar o estande.
   Pausa sozinha quando sai da tela ou a aba fica escondida. */
const ritmo = criarRitmo('site')
const INICIO_CAPITULO = CAPITULOS.map(c => ritmo.real(c[1]))

export default function ShowreelInicio({ destino, rotulo, aoMudarTema }) {
  const secao = useRef(null), palco = useRef(null), barras = useRef([])
  const navigate = useNavigate()
  const destinoRef = useRef(destino); destinoRef.current = destino
  const temaRef = useRef(aoMudarTema); temaRef.current = aoMudarTema
  const tempo = useRef(0), tocandoRef = useRef(true), visivel = useRef(true)
  const [tocando, setTocando] = useState(true)
  const [fim, setFim] = useState(false)
  const [capitulo, setCapitulo] = useState(-1)
  const [tema, setTema] = useState('escuro')

  const tocar = v => { tocandoRef.current = v; setTocando(v) }

  useEffect(() => {
    const el = palco.current
    const elementoSecao = secao.current
    if (!el || !elementoSecao) return
    let encerrado = false
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches
    let temaMotor = 'escuro', temaInformado = null, temaControles = null, capInformado = null
    const motor = montarShowreel(el, {
      cta: { href: destinoRef.current, rotulo }, semMarcaNoCanto: true, semCapitulos: true,
      aoMudarTema: t => { temaMotor = t },
    })
    /* quem pediu menos movimento já vê o final, com a opção de assistir */
    if (reduz) { tempo.current = ritmo.duracao; tocar(false); setFim(true) }

    const obs = new IntersectionObserver(([e]) => { visivel.current = e.intersectionRatio > .35 }, { threshold: [0, .35, 1] })
    obs.observe(elementoSecao)

    let raf, antes = performance.now()
    const quadro = agora => {
      if (encerrado || !secao.current) return
      raf = requestAnimationFrame(quadro)
      const dt = Math.min(.1, (agora - antes) / 1000); antes = agora
      if (tocandoRef.current && visivel.current && !document.hidden) {
        tempo.current += dt
        if (tempo.current >= ritmo.duracao) { tempo.current = ritmo.duracao; tocar(false); setFim(true) }
      }
      const m = ritmo.motor(tempo.current)
      const r = elementoSecao.getBoundingClientRect()
      const temaTopo = r.bottom < 90 ? 'solido' : temaMotor
      if (temaTopo !== temaInformado) { temaInformado = temaTopo; temaRef.current?.(temaTopo) }
      if (temaMotor !== temaControles) { temaControles = temaMotor; setTema(temaMotor) }
      const cap = CAPITULOS.findIndex(c => m >= c[1] && m < c[2])
      if (cap !== capInformado) { capInformado = cap; setCapitulo(cap) }
      CAPITULOS.forEach((c, i) => { const b = barras.current[i]; if (b) b.style.width = Math.min(1, Math.max(0, (m - c[1]) / (c[2] - c[1]))) * 100 + '%' })
      if (r.bottom > 0 && r.top < innerHeight) motor.render(m)
    }
    raf = requestAnimationFrame(quadro)
    const clique = e => { if (e.target.closest('a.sr-cta')) { e.preventDefault(); navigate(destinoRef.current) } }
    el.addEventListener('click', clique)
    return () => { encerrado = true; cancelAnimationFrame(raf); obs.disconnect(); el.removeEventListener('click', clique); motor.destruir() }
  }, [rotulo, navigate])

  useEffect(() => { const a = palco.current?.querySelector('a.sr-cta'); if (a) a.setAttribute('href', destino) }, [destino])

  const irPara = i => { tempo.current = INICIO_CAPITULO[i]; setFim(false); tocar(true) }
  const alternar = () => {
    if (fim) { tempo.current = 0; setFim(false); tocar(true); return }
    tocar(!tocando)
  }

  return <section ref={secao} className="uset-showreel" aria-label="Apresentação do USET Stand Studio">
    <div ref={palco} className="uset-showreel-palco" />
    <div className="uset-showreel-controles" data-tema={tema}>
      <button className="uset-showreel-tocar" onClick={alternar}
        aria-label={fim ? 'Assistir a apresentação de novo' : tocando ? 'Pausar a apresentação' : 'Continuar a apresentação'}>
        {fim ? <>↺ <span>Assistir de novo</span></> : tocando ? '❚❚' : '▶'}
      </button>
      <div className="uset-capitulos" role="group" aria-label="Capítulos da apresentação">
        {CAPITULOS.map(([nome], i) => <button key={nome} onClick={() => irPara(i)} aria-current={i === capitulo ? 'step' : undefined}>
          <u><i ref={b => { barras.current[i] = b }} /></u><small>{nome}</small>
        </button>)}
      </div>
    </div>
  </section>
}
