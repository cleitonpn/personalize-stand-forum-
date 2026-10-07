import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { montarShowreel, DURACAO } from '../lib/showreel/motor.js'
import '../lib/showreel/showreel.css'

/* A abertura (logo se montando) toca sozinha; a partir daí quem anda é a rolagem. */
const INICIO = 2.8

export default function ShowreelScroll({ destino, rotulo, aoMudarTema }) {
  const secao = useRef(null), palco = useRef(null)
  const navigate = useNavigate()
  const destinoRef = useRef(destino); destinoRef.current = destino
  const temaRef = useRef(aoMudarTema); temaRef.current = aoMudarTema

  useEffect(() => {
    const el = palco.current
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches
    let temaMotor = 'escuro', temaInformado = null
    const motor = montarShowreel(el, {
      cta: { href: destinoRef.current, rotulo }, semMarcaNoCanto: true, dica: true,
      aoMudarTema: t => { temaMotor = t },
    })
    const t0 = performance.now()
    let atual = reduz ? INICIO : 0, raf, antes = t0
    const quadro = agora => {
      raf = requestAnimationFrame(quadro)
      const dt = Math.min(.25, ((agora ?? performance.now()) - antes) / 1000); antes = agora ?? performance.now()
      const r = secao.current.getBoundingClientRect()
      const tema = r.bottom < 90 ? 'solido' : temaMotor
      if (tema !== temaInformado) { temaInformado = tema; temaRef.current?.(tema) }
      if (r.bottom < 0 || r.top > innerHeight) return
      const curso = r.height - innerHeight
      const p = curso > 0 ? Math.min(1, Math.max(0, -r.top / curso)) : 0
      const intro = reduz ? INICIO : Math.min(INICIO, (performance.now() - t0) / 1000)
      const alvo = Math.max(intro, INICIO + p * (DURACAO - INICIO))
      /* amortecimento por tempo, não por quadro: igual em 60 Hz, 120 Hz ou celular lento */
      atual = reduz ? alvo : atual + (alvo - atual) * (1 - Math.exp(-dt * 9))
      if (Math.abs(alvo - atual) < .002) atual = alvo
      motor.render(atual)
    }
    raf = requestAnimationFrame(quadro)
    const clique = e => { if (e.target.closest('a.sr-cta')) { e.preventDefault(); navigate(destinoRef.current) } }
    el.addEventListener('click', clique)
    return () => { cancelAnimationFrame(raf); el.removeEventListener('click', clique); motor.destruir() }
  }, [rotulo, navigate])

  useEffect(() => { const a = palco.current?.querySelector('a.sr-cta'); if (a) a.setAttribute('href', destino) }, [destino])

  return <section ref={secao} className="uset-showreel" aria-label="Conheça o USET Stand Studio">
    <div className="uset-showreel-fixo"><div ref={palco} className="uset-showreel-palco" aria-hidden="true" /></div>
    <p className="sr-only">O USET Stand Studio lê o projeto 3D do estande, deixa a montadora definir o que o expositor pode personalizar e preço por m² e por peça, e entrega ao expositor uma personalização simples — cores, arte e móveis — que vira uma proposta pronta para produção.</p>
  </section>
}
