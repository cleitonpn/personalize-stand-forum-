import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Lightformer } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as THREE from 'three'
import { PAPEIS } from '../lib/glb/roles.js'

/** Carrega um .glb a partir de uma URL (Storage) ou de um File local. */
export function useGLB(fonte) {
  const [estado, setEstado] = useState({ cena: null, erro: null, progresso: 0, carregando: false })

  useEffect(() => {
    if (!fonte) { setEstado({ cena: null, erro: null, progresso: 0, carregando: false }); return }

    let vivo = true
    let objectUrl = null
    const url = typeof fonte === 'string' ? fonte : (objectUrl = URL.createObjectURL(fonte))

    setEstado({ cena: null, erro: null, progresso: 0, carregando: true })

    new GLTFLoader().load(
      url,
      (gltf) => {
        if (!vivo) return
        setEstado({ cena: gltf.scene, erro: null, progresso: 1, carregando: false })
      },
      (ev) => {
        if (!vivo || !ev.total) return
        setEstado((s) => ({ ...s, progresso: ev.loaded / ev.total }))
      },
      (err) => {
        if (!vivo) return
        setEstado({ cena: null, erro: err?.message || 'Falha ao ler o arquivo .glb', progresso: 0, carregando: false })
      },
    )

    return () => {
      vivo = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fonte])

  return estado
}

/** Enquadra a câmera no conteúdo assim que ele entra na cena. */
function Enquadrar({ alvo, deps }) {
  const { camera, controls } = useThree()
  useEffect(() => {
    if (!alvo) return
    const caixa = new THREE.Box3().setFromObject(alvo)
    if (caixa.isEmpty()) return
    const centro = caixa.getCenter(new THREE.Vector3())
    const tam = caixa.getSize(new THREE.Vector3())
    const raio = Math.max(tam.x, tam.y, tam.z) * 0.6 || 5
    const dist = raio / Math.tan((camera.fov * Math.PI) / 360) * 1.5

    camera.position.set(centro.x + dist * 0.7, centro.y + dist * 0.55, centro.z + dist * 0.8)
    camera.near = Math.max(0.05, dist / 500); camera.far = dist * 12
    camera.updateProjectionMatrix()
    if (controls) { controls.target.copy(centro); controls.update() }
  }, [alvo, camera, controls, ...(deps || [])])
  return null
}

/**
 * Aplica realce por material: o que está selecionado recebe a cor do papel,
 * o resto perde saturação. Guarda o material original para restaurar depois.
 */
function useRealce(cena, { materialFoco, papeis, modo }) {
  useEffect(() => {
    if (!cena) return
    const criados = []

    cena.traverse((o) => {
      if (!o.isMesh) return
      if (!o.userData._matOrig) o.userData._matOrig = o.material

      const orig = o.userData._matOrig
      const nome = (Array.isArray(orig) ? orig[0] : orig)?.name || '(sem material)'
      const papel = papeis?.[nome]

      let usar = orig
      if (modo === 'papeis' && papel && papel !== 'ignorar') {
        const m = new THREE.MeshStandardMaterial({
          color: new THREE.Color(PAPEIS[papel]?.hex || '#888'),
          roughness: 0.65, metalness: 0.05,
          transparent: true, opacity: 0.95,
        })
        criados.push(m); usar = m
      } else if (modo === 'papeis' && papel === 'ignorar') {
        const m = new THREE.MeshStandardMaterial({
          color: '#151a26', roughness: 0.9, transparent: true, opacity: 0.12, depthWrite: false,
        })
        criados.push(m); usar = m
      }

      if (materialFoco) {
        if (nome === materialFoco) {
          const m = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#22d3ee'), emissive: new THREE.Color('#0891b2'),
            emissiveIntensity: 0.7, roughness: 0.4, toneMapped: false,
          })
          criados.push(m); usar = m
        } else {
          const m = new THREE.MeshStandardMaterial({
            color: '#1a2130', roughness: 0.95, transparent: true, opacity: 0.16, depthWrite: false,
          })
          criados.push(m); usar = m
        }
      }

      o.material = usar
    })

    return () => {
      cena.traverse((o) => { if (o.isMesh && o.userData._matOrig) o.material = o.userData._matOrig })
      criados.forEach((m) => m.dispose())
    }
  }, [cena, materialFoco, papeis, modo])
}

/** Caixa que mostra a área do estande escolhida no recorte. */
function CaixaRecorte({ recorte, alturaMax = 5 }) {
  if (!recorte) return null
  const w = recorte.x1 - recorte.x0
  const d = recorte.z1 - recorte.z0
  const cx = (recorte.x0 + recorte.x1) / 2
  const cz = (recorte.z0 + recorte.z1) / 2
  return (
    <group position={[cx, alturaMax / 2, cz]}>
      <mesh>
        <boxGeometry args={[w, alturaMax, d]} />
        <meshBasicMaterial color="#16e0a3" wireframe transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, -alturaMax / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#16e0a3" transparent opacity={0.07} />
      </mesh>
    </group>
  )
}

export default function Viewer({ cena, materialFoco, papeis, modo = 'original', recorte, altura = '100%' }) {
  useRealce(cena, { materialFoco, papeis, modo })
  const chave = useMemo(() => cena?.uuid, [cena])

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.75]}
      camera={{ position: [8, 6, 10], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      style={{ height: altura, width: '100%', background: 'transparent' }}
    >
      <color attach="background" args={['#070a14']} />
      <hemisphereLight args={['#dce6ff', '#0a0e18', 0.85]} />
      <directionalLight position={[9, 14, 7]} intensity={1.5} />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} color="#bcd4ff" />

      {/* Ambiente montado com Lightformers locais. Um preset do drei baixaria um
          HDR de CDN externo — quebra offline e em rede restrita. */}
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 8, 8]} scale={[16, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#cfe0ff" position={[-10, 4, 4]} rotation={[0, Math.PI / 3, 0]} scale={[8, 10, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#e6f0ff" position={[10, 4, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[8, 10, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 5, -10]} scale={[12, 8, 1]} />
      </Environment>

      <Grid
        args={[60, 60]} cellSize={1} cellThickness={0.5} cellColor="#1b2440"
        sectionSize={5} sectionThickness={1} sectionColor="#2b3a5c"
        infiniteGrid fadeDistance={70} fadeStrength={1.6} followCamera={false}
      />

      {cena && <primitive object={cena} />}
      <CaixaRecorte recorte={recorte} />
      <Enquadrar alvo={cena} deps={[chave]} />

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.02} />
    </Canvas>
  )
}
