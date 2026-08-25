import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const SNAP = Math.PI / 12          // 15° — o suficiente para encostar reto na parede
const ALTURA_MARCA = 0.015         // marca acima do piso, senão briga com o carpete

/**
 * Alça de manipulação direta de um objeto, para o expositor.
 *
 * Arrastar a peça é bem melhor que apertar seta: um metro vira um gesto em vez
 * de quatro cliques, e o expositor pensa em "quero a banqueta ali" em vez de
 * "quantas vezes eu clico". Visto de cima o gesto é sem ambiguidade — o chão
 * está de frente para a tela, então o que o mouse anda é exatamente o que a peça
 * anda, sem a dúvida de profundidade que qualquer ângulo inclinado traria.
 *
 * Girar sai num anel próprio, e não na roda do mouse. A roda já é o zoom da
 * cena: tomá-la para girar tiraria do expositor justamente a aproximação que ele
 * precisa para encaixar a peça, e no trackpad o rolar de dois dedos dispara sem
 * querer no meio do arrasto — a peça giraria sozinha. O anel também mostra que a
 * peça gira, coisa que a roda não anuncia.
 */
export default function GizmoObjeto({ obj, limites, aoTransformar }) {
  const { controls } = useThree()
  const [modo, setModo] = useState(null)      // 'mover' | 'girar'
  const inicio = useRef(null)

  const t = obj.transform || { dx: 0, dz: 0, rotY: 0 }
  const x = obj.apoio[0] + (t.dx || 0)
  const y = obj.apoio[1]
  const z = obj.apoio[2] + (t.dz || 0)
  const raio = Math.max(obj.largura, obj.profundidade) / 2 + 0.3

  // Solta o arrasto mesmo se o botão for liberado fora do canvas — sem isto a
  // peça continuaria grudada no ponteiro depois que o mouse sai da janela.
  useEffect(() => {
    if (!modo) return
    const soltar = () => { setModo(null); if (controls) controls.enabled = true }
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', soltar)
    return () => {
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', soltar)
    }
  }, [modo, controls])

  const comecar = (m) => (e) => {
    e.stopPropagation()
    // desliga a órbita: senão arrastar a peça gira a câmera junto
    if (controls) controls.enabled = false
    inicio.current = {
      ponto: e.point.clone(),
      angulo: Math.atan2(e.point.x - x, e.point.z - z),
      t: { dx: t.dx || 0, dz: t.dz || 0, rotY: t.rotY || 0 },
    }
    setModo(m)
  }

  const arrastar = (e) => {
    if (!modo || !inicio.current) return
    e.stopPropagation()
    const p = e.point
    const i = inicio.current

    if (modo === 'mover') {
      let cx = obj.apoio[0] + i.t.dx + (p.x - i.ponto.x)
      let cz = obj.apoio[2] + i.t.dz + (p.z - i.ponto.z)

      // A peça não sai do estande. Sem isto o expositor arrasta a banqueta para
      // o corredor sem perceber, e a proposta sai com um móvel fora da área
      // que ele contratou.
      if (limites) {
        const meiaL = obj.largura / 2, meiaP = obj.profundidade / 2
        const px = [limites.x0 + meiaL, limites.x1 - meiaL]
        const pz = [limites.z0 + meiaP, limites.z1 - meiaP]
        // objeto maior que a área: prende no centro em vez de inverter os limites
        cx = px[0] > px[1] ? (limites.x0 + limites.x1) / 2 : Math.min(Math.max(cx, px[0]), px[1])
        cz = pz[0] > pz[1] ? (limites.z0 + limites.z1) / 2 : Math.min(Math.max(cz, pz[0]), pz[1])
      }
      aoTransformar({ dx: cx - obj.apoio[0], dz: cz - obj.apoio[2] })
    } else {
      // rotation.y = θ leva o ponto local (0,0,r) para (r·sinθ, r·cosθ),
      // então atan2(x, z) devolve o próprio ângulo do mundo
      const ang = Math.atan2(p.x - x, p.z - z)
      const bruto = i.t.rotY + (ang - i.angulo)
      aoTransformar({ rotY: Math.round(bruto / SNAP) * SNAP })
    }
  }

  const soltar = (e) => {
    e?.stopPropagation?.()
    setModo(null)
    if (controls) controls.enabled = true
  }

  const cursor = (c) => (e) => { e.stopPropagation(); document.body.style.cursor = c }
  const semCursor = () => { if (!modo) document.body.style.cursor = 'auto' }

  return (
    <>
      {/* Plano de arrasto: enquanto o gesto dura, é ele que recebe o movimento.
          Precisa cobrir tudo porque o ponteiro sai de cima da peça no primeiro
          instante do arrasto. Invisível pela opacidade, não por visible=false —
          o que está invisível não é atingido pelo raio. */}
      {modo && (
        <mesh position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={arrastar} onPointerUp={soltar}>
          <planeGeometry args={[600, 600]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
        </mesh>
      )}

      {/* anel de giro */}
      <mesh position={[x, y + ALTURA_MARCA, z]} rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={comecar('girar')}
        onPointerOver={cursor('grab')} onPointerOut={semCursor}>
        <ringGeometry args={[raio, raio + 0.07, 56]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={modo === 'girar' ? 0.95 : 0.6}
          side={THREE.DoubleSide} depthTest={false} toneMapped={false} />
      </mesh>

      <group position={[x, y, z]} rotation={[0, t.rotY || 0, 0]}>
        {/* pegada: a área que se arrasta para mover */}
        <mesh position={[0, ALTURA_MARCA, 0]} rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={comecar('mover')}
          onPointerOver={cursor('move')} onPointerOut={semCursor}>
          <planeGeometry args={[Math.max(obj.largura, 0.2), Math.max(obj.profundidade, 0.2)]} />
          <meshBasicMaterial color="#16e0a3" transparent opacity={modo === 'mover' ? 0.4 : 0.24}
            depthTest={false} toneMapped={false} />
        </mesh>

        {/* punho do anel: mostra para onde a frente da peça está virada */}
        <mesh position={[0, ALTURA_MARCA + 0.005, raio + 0.035]} rotation={[-Math.PI / 2, 0, 0]}
          onPointerDown={comecar('girar')}
          onPointerOver={cursor('grab')} onPointerOut={semCursor}>
          <circleGeometry args={[0.12, 24]} />
          <meshBasicMaterial color="#22d3ee" depthTest={false} toneMapped={false} />
        </mesh>
      </group>
    </>
  )
}
