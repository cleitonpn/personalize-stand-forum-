import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Marca o limite do elemento sem alterar sua cor, textura ou iluminação.
export default function SelecaoElemento({ cena, indice, supFoco, objetos, objFoco, partesFoco }) {
  const helper = useMemo(() => {
    const h = new THREE.Box3Helper(new THREE.Box3(), '#51d6c1')
    h.material.depthTest = false; h.material.transparent = true; h.material.opacity = 0.8
    h.renderOrder = 20; h.raycast = () => null
    return h
  }, [])
  useEffect(() => () => { helper.geometry.dispose(); helper.material.dispose() }, [helper])
  const selecionadas = useMemo(() => {
    let grupo = null
    for (const s of indice?.values() || []) if (s.id === supFoco) { grupo = s.elementoId || s.id; break }
    const chaves = new Set((objetos || []).find(o => o.id === objFoco)?.pecas || [])
    if (partesFoco != null) { chaves.clear(); partesFoco.forEach(k => chaves.add(k)); grupo = null }
    if (grupo) for (const [k, s] of indice) if ((s.elementoId || s.id) === grupo) chaves.add(k)
    const meshes = []
    cena?.traverse(o => { if (o.isMesh && chaves.has(o.userData._chave)) meshes.push(o) })
    return meshes
  }, [cena, indice, supFoco, objetos, objFoco, partesFoco])
  const temporaria = useMemo(() => new THREE.Box3(), [])
  useFrame(() => {
    helper.box.makeEmpty()
    for (const m of selecionadas) {
      let visivel = true
      for (let p = m; p; p = p.parent) if (!p.visible) { visivel = false; break }
      if (!visivel) continue
      m.updateWorldMatrix(true, false)
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
      helper.box.union(temporaria.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld))
    }
    helper.visible = !helper.box.isEmpty()
    if (helper.visible) helper.box.expandByScalar(0.012)
  })
  return <primitive object={helper} />
}
