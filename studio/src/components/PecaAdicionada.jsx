import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/** Captura o ponteiro: arrastar a geometria funciona também fora da sua silhueta. */
export default function PecaAdicionada({ p, selecionada, aoSelecionar, aoTransformar }) {
  const { controls } = useThree()
  const gesto = useRef(null)
  const terminar = e => {
    if (!gesto.current) return
    e?.stopPropagation?.()
    try { e?.target?.releasePointerCapture(e.pointerId) } catch { /* já liberado */ }
    gesto.current = null
    if (controls) controls.enabled = true
    document.body.style.cursor = 'auto'
  }
  useEffect(() => {
    window.addEventListener('pointerup', terminar)
    window.addEventListener('pointercancel', terminar)
    return () => { window.removeEventListener('pointerup', terminar); window.removeEventListener('pointercancel', terminar); terminar() }
  }, [controls])
  const iniciar = e => {
    if (!aoTransformar || p.tipo !== 'mobiliario' || e.button !== 0) return
    e.stopPropagation()
    const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), -e.point.y)
    const ponto = e.ray.intersectPlane(plano, new THREE.Vector3())
    if (!ponto) return
    gesto.current = { plano, ponto: ponto.clone(), offset: [...(p.offset || [0, 0, 0])], id: crypto.randomUUID() }
    if (controls) controls.enabled = false
    e.target.setPointerCapture(e.pointerId)
    document.body.style.cursor = 'grabbing'
    aoSelecionar?.(`extra:${p.id}`, null)
  }
  const mover = e => {
    const g = gesto.current
    if (!g) return
    e.stopPropagation()
    const ponto = e.ray.intersectPlane(g.plano, new THREE.Vector3())
    if (ponto) aoTransformar(p.id, { offset: [g.offset[0] + ponto.x - g.ponto.x, g.offset[1], g.offset[2] + ponto.z - g.ponto.z] }, g.id)
  }
  return <group position={(p.offset || [0, 0, 0]).map((v, i) => v + (p.pivo?.[i] || 0))} rotation={[0, p.rotY || 0, 0]}>
    {p.dimensoes && selecionada && <mesh raycast={() => null}><boxGeometry args={p.dimensoes} /><meshBasicMaterial color="#50efd1" wireframe depthTest={false} /></mesh>}
    <group position={(p.pivo || [0, 0, 0]).map(v => -v)} onPointerDown={iniciar} onPointerMove={mover} onPointerUp={terminar} onPointerCancel={terminar}
      onClick={e => { if(!aoSelecionar)return; e.stopPropagation(); if (p.tipo === 'mobiliario') aoSelecionar?.(`extra:${p.id}`, null); else if (p.ancora) aoSelecionar?.(p.ancora, null) }}>
      <primitive object={p.objeto} />
    </group>
  </group>
}
