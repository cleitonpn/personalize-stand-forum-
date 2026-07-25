import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, RoundedBox, Environment, Lightformer } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import { useStand } from '../store/StandStore.jsx'
import { corPorId, ELETRICA } from '../data/catalogo.js'
import { logoTexture, logoLightTexture, panelTexture } from '../three/textures.js'

const W = 10, D = 4
const WALL_H = 2.75
const px = (x) => x - W / 2
const pz = (z) => z - D / 2

function Piece({ children, x, z, rot = 0 }) {
  return <group position={[px(x), 0, pz(z)]} rotation={[0, rot, 0]}>{children}</group>
}

/* materiais reutilizáveis */
const METAL = { color: '#15161a', metalness: 0.85, roughness: 0.35 }

/* ---------------- Estrutura metálica preta (frame do stand) ---------------- */
function Beam({ x, y, z, w, h, d }) {
  return (
    <mesh position={[x, y, z]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial {...METAL} />
    </mesh>
  )
}
function Frame() {
  const H = WALL_H + 1.7   // topo da testeira
  const t = 0.07
  const bx = W / 2, bz = D / 2
  return (
    <group>
      {/* postes verticais */}
      {[[-bx, -bz], [bx, -bz], [-bx, bz], [bx, bz]].map(([x, z], i) => (
        <Beam key={i} x={x} y={H / 2} z={z} w={t} h={H} d={t} />
      ))}
      {/* poste frontal das colunas */}
      <Beam x={-bx + 1.15} y={WALL_H / 2 + 0.7} z={bz} w={t} h={WALL_H + 1.4} d={t} />
      <Beam x={bx - 1.15} y={WALL_H / 2 + 0.7} z={bz} w={t} h={WALL_H + 1.4} d={t} />
      {/* vigas topo (perímetro) */}
      <Beam x={0} y={H} z={-bz} w={W} h={t} d={t} />
      <Beam x={0} y={H} z={bz} w={W} h={t} d={t} />
      <Beam x={-bx} y={H} z={0} w={t} h={t} d={D} />
      <Beam x={bx} y={H} z={0} w={t} h={t} d={D} />
      {/* viga na base da testeira */}
      <Beam x={0} y={WALL_H + 0.05} z={-bz + 0.02} w={W} h={t} d={t} />
      <Beam x={0} y={WALL_H + 0.05} z={bz - 0.02} w={W} h={t} d={t} />
    </group>
  )
}

/* ---------------- Mobiliário ---------------- */
function Bistro() {
  const stool = (i) => {
    const a = (i / 3) * Math.PI * 2 + 0.5
    const sx = Math.cos(a) * 0.62, sz = Math.sin(a) * 0.62
    return (
      <group key={i} position={[sx, 0, sz]} rotation={[0, -a + Math.PI / 2, 0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.9, 10]} />
          <meshStandardMaterial color="#0c0c0c" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.18, 0.06, 20]} />
          <meshStandardMaterial color="#1c1c1e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.9, -0.16]} rotation={[0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.28, 0.03]} />
          <meshStandardMaterial color="#1c1c1e" roughness={0.5} />
        </mesh>
      </group>
    )
  }
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 1.08, 16]} />
        <meshStandardMaterial color="#0c0c0c" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.34, 0.04, 24]} />
        <meshStandardMaterial color="#0c0c0c" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 32]} />
        <meshStandardMaterial color="#161616" roughness={0.35} metalness={0.1} />
      </mesh>
      {[0, 1, 2].map(stool)}
    </group>
  )
}
function Balcao() {
  const logo = useMemo(() => logoTexture(), [])
  return (
    <group>
      <RoundedBox args={[2.0, 1.1, 0.7]} radius={0.03} smoothness={4} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#141414" roughness={0.4} metalness={0.15} />
      </RoundedBox>
      <mesh position={[0, 0.58, 0.361]}>
        <planeGeometry args={[1.6, 0.5]} />
        <meshStandardMaterial map={logo} emissive="#f4c20d" emissiveIntensity={0.12} roughness={0.5} />
      </mesh>
      {/* filete de LED na base */}
      <mesh position={[0, 0.04, 0.35]}>
        <boxGeometry args={[2.0, 0.05, 0.02]} />
        <meshStandardMaterial color="#f4c20d" emissive="#f4c20d" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <RoundedBox args={[2.04, 0.04, 0.74]} radius={0.02} position={[0, 1.11, 0]}>
        <meshStandardMaterial color="#0c0c0c" roughness={0.3} metalness={0.3} />
      </RoundedBox>
    </group>
  )
}
function Aparador() {
  return (
    <RoundedBox args={[1.1, 0.06, 0.4]} radius={0.015} position={[0, 1.0, 0]} castShadow>
      <meshStandardMaterial color="#caa46a" roughness={0.5} metalness={0.05} />
    </RoundedBox>
  )
}
function Sofa() {
  return (
    <group>
      <RoundedBox args={[1.6, 0.4, 0.85]} radius={0.08} position={[0, 0.32, 0]} castShadow>
        <meshStandardMaterial color="#2a2e37" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[1.6, 0.55, 0.16]} radius={0.07} position={[0, 0.55, -0.34]} castShadow>
        <meshStandardMaterial color="#2a2e37" roughness={0.85} />
      </RoundedBox>
      {[-0.65, 0.65].map((x, i) => (
        <RoundedBox key={i} args={[0.16, 0.4, 0.85]} radius={0.06} position={[x, 0.42, 0]} castShadow>
          <meshStandardMaterial color="#31353f" roughness={0.85} />
        </RoundedBox>
      ))}
    </group>
  )
}
function Poltrona() {
  return (
    <group>
      <RoundedBox args={[0.8, 0.4, 0.85]} radius={0.08} position={[0, 0.32, 0]} castShadow>
        <meshStandardMaterial color="#3a3f4a" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.8, 0.55, 0.16]} radius={0.07} position={[0, 0.55, -0.34]} castShadow>
        <meshStandardMaterial color="#3a3f4a" roughness={0.85} />
      </RoundedBox>
    </group>
  )
}
function MesaCentro() {
  return (
    <group>
      <RoundedBox args={[0.7, 0.05, 0.7]} radius={0.02} position={[0, 0.4, 0]} castShadow>
        <meshStandardMaterial color="#e8e8e8" roughness={0.15} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.4, 12]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
    </group>
  )
}
function Expositor() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.6, 1.8, 0.6]} />
        <meshPhysicalMaterial color="#dfe7ee" transparent opacity={0.18} roughness={0.05} transmission={0.7} thickness={0.3} />
      </mesh>
      <RoundedBox args={[0.66, 0.08, 0.66]} radius={0.02} position={[0, 0.04, 0]}>
        <meshStandardMaterial {...METAL} />
      </RoundedBox>
    </group>
  )
}
function MobiliarioMesh({ tipo }) {
  switch (tipo) {
    case 'mesa-bistro': return <Bistro />
    case 'balcao': return <Balcao />
    case 'aparador': return <Aparador />
    case 'sofa': return <Sofa />
    case 'poltrona': return <Poltrona />
    case 'mesa-centro': return <MesaCentro />
    case 'expositor': return <Expositor />
    default: return null
  }
}

function PlantaMesh({ tipo }) {
  if (tipo === 'jardim-vertical') {
    return (
      <group>
        <RoundedBox args={[1.0, 2.0, 0.14]} radius={0.03} position={[0, 1.0, 0]} castShadow>
          <meshStandardMaterial color="#2c6b38" roughness={0.95} />
        </RoundedBox>
        {Array.from({ length: 40 }).map((_, i) => (
          <mesh key={i} position={[(Math.random() - 0.5) * 0.9, 0.2 + Math.random() * 1.7, 0.08]} castShadow>
            <sphereGeometry args={[0.06 + Math.random() * 0.05, 8, 8]} />
            <meshStandardMaterial color={`hsl(${100 + Math.random() * 30}, 45%, ${28 + Math.random() * 14}%)`} roughness={0.95} />
          </mesh>
        ))}
      </group>
    )
  }
  const h = tipo === 'planta-alta' ? 1.55 : 0.9
  const blobs = tipo === 'planta-alta' ? 7 : 4
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.26, 0.4, 20]} />
        <meshStandardMaterial color="#2c2c2e" roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.4 + (h - 0.4) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, h - 0.4, 8]} />
        <meshStandardMaterial color="#5a4632" roughness={0.9} />
      </mesh>
      {Array.from({ length: blobs }).map((_, i) => {
        const a = (i / blobs) * Math.PI * 2
        const r = 0.22 + Math.random() * 0.12
        return (
          <mesh key={i} position={[Math.cos(a) * 0.22, h - 0.1 + Math.sin(i) * 0.12, Math.sin(a) * 0.22]} castShadow>
            <icosahedronGeometry args={[r, 1]} />
            <meshStandardMaterial color={`hsl(${105 + Math.random() * 25}, 42%, ${30 + Math.random() * 12}%)`} roughness={0.95} flatShading />
          </mesh>
        )
      })}
    </group>
  )
}

/* ---------------- Estrutura (pisos, paredes, testeira) ---------------- */
function Estrutura({ pisoHex, pisoBrilho, paredeHex, madeiraHex, led }) {
  const logo = useMemo(() => logoTexture(), [])
  const logoLight = useMemo(() => logoLightTexture(), [])
  const panel = useMemo(() => panelTexture(), [])
  return (
    <group>
      {/* piso do stand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={pisoHex} roughness={pisoBrilho ? 0.25 : 0.92}
          metalness={pisoBrilho ? 0.15 : 0} envMapIntensity={pisoBrilho ? 1 : 0.25} />
      </mesh>
      {/* borda elevada do piso */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[W + 0.05, 0.04, D + 0.05]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.6} />
      </mesh>

      {/* parede de fundo — napa */}
      <RoundedBox args={[W, WALL_H, 0.08]} radius={0.01} position={[0, WALL_H / 2, -D / 2]} receiveShadow>
        <meshStandardMaterial color={paredeHex} roughness={0.8} />
      </RoundedBox>
      {/* painel gráfico impresso (lado esquerdo do fundo) */}
      <mesh position={[-W / 2 + 1.7, WALL_H / 2, -D / 2 + 0.05]}>
        <planeGeometry args={[2.4, WALL_H - 0.1]} />
        <meshStandardMaterial map={panel} roughness={0.7} />
      </mesh>

      {/* parede lateral esquerda — napa + logo */}
      <RoundedBox args={[0.08, WALL_H, D]} radius={0.01} position={[-W / 2, WALL_H / 2, 0]} receiveShadow>
        <meshStandardMaterial color={paredeHex} roughness={0.8} />
      </RoundedBox>
      <mesh position={[-W / 2 + 0.05, 1.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.8, 0.9]} />
        <meshStandardMaterial map={logo} roughness={0.6} />
      </mesh>

      {/* parede de madeira (aparador / TV) — trecho direito do fundo */}
      <RoundedBox args={[3.4, WALL_H, 0.06]} radius={0.01} position={[W / 2 - 1.7, WALL_H / 2, -D / 2 + 0.06]}>
        <meshStandardMaterial color={madeiraHex} roughness={0.55} metalness={0.05} />
      </RoundedBox>
      {/* TV 55" */}
      <mesh position={[W / 2 - 1.7, 1.65, -D / 2 + 0.11]}>
        <boxGeometry args={[1.3, 0.75, 0.05]} />
        <meshStandardMaterial color="#050505" roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[W / 2 - 1.7, 1.65, -D / 2 + 0.14]}>
        <planeGeometry args={[1.2, 0.66]} />
        <meshStandardMaterial color="#0b1e44" emissive="#1b3f80" emissiveIntensity={0.55} toneMapped={false} />
      </mesh>

      {/* testeira (caixa preta iluminada) */}
      <RoundedBox args={[W + 0.1, 1.1, 0.95]} radius={0.02} position={[0, WALL_H + 0.6, -D / 2 + 0.45]} castShadow>
        <meshStandardMaterial color="#121216" roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {/* face frontal iluminada com logo */}
      <mesh position={[0, WALL_H + 0.6, -D / 2 + 0.93]}>
        <planeGeometry args={[7.5, 0.95]} />
        <meshStandardMaterial map={logoLight} emissive="#ffffff" emissiveIntensity={0.35}
          emissiveMap={logoLight} toneMapped={false} />
      </mesh>
      {/* underglow amarelo na testeira */}
      <mesh position={[0, WALL_H + 0.04, -D / 2 + 0.9]}>
        <boxGeometry args={[W, 0.03, 0.03]} />
        <meshStandardMaterial color="#f4c20d" emissive="#f4c20d" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>

      {/* colunas frontais: LED (A/B) ou impressa (C) */}
      {[-W / 2 + 0.65, W / 2 - 0.65].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 1.35, D / 2 - 0.12]}>
            <boxGeometry args={[0.95, 2.55, 0.1]} />
            {led
              ? <meshStandardMaterial map={panel} emissive="#a21caf" emissiveMap={panel} emissiveIntensity={1.3} toneMapped={false} />
              : <meshStandardMaterial map={logo} roughness={0.5} />}
          </mesh>
          {/* moldura amarela da coluna */}
          <mesh position={[x, 1.35, D / 2 - 0.06]}>
            <boxGeometry args={[1.02, 2.62, 0.03]} />
            <meshStandardMaterial color="#f4c20d" emissive="#f4c20d" emissiveIntensity={led ? 1.4 : 0.15} toneMapped={!led} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Deposito({ x, z, w, d, madeiraHex }) {
  const logo = useMemo(() => logoTexture(), [])
  return (
    <Piece x={x} z={z}>
      <RoundedBox args={[w, WALL_H, d]} radius={0.02} position={[0, WALL_H / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={madeiraHex} roughness={0.6} metalness={0.05} />
      </RoundedBox>
      <mesh position={[0, 1.35, d / 2 + 0.005]}>
        <planeGeometry args={[Math.min(2, w * 0.8), 0.62]} />
        <meshStandardMaterial map={logo} roughness={0.55} />
      </mesh>
    </Piece>
  )
}

function SalaReuniao({ x, z, w, d }) {
  const h = 2.5
  return (
    <Piece x={x} z={z}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial color="#cfe0ee" transparent opacity={0.12} roughness={0.02}
          metalness={0} transmission={0.85} thickness={0.5} ior={1.2} />
      </mesh>
      {[[0, h, 0], [0, 0.02, 0]].map((p, i) => (
        <RoundedBox key={i} args={[w + 0.05, 0.06, d + 0.05]} radius={0.02} position={p}>
          <meshStandardMaterial {...METAL} />
        </RoundedBox>
      ))}
      {/* montantes de canto */}
      {[[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, h / 2, cz]}>
          <boxGeometry args={[0.05, h, 0.05]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      {/* porta */}
      <mesh position={[w / 2 - 0.55, h / 2, d / 2 + 0.01]}>
        <planeGeometry args={[0.9, h - 0.08]} />
        <meshStandardMaterial color="#aecbe0" transparent opacity={0.22} roughness={0.05} metalness={0.1} />
      </mesh>
      <mesh position={[w / 2 - 0.12, 1.05, d / 2 + 0.03]}>
        <boxGeometry args={[0.03, 0.25, 0.03]} />
        <meshStandardMaterial color="#dfe7ee" metalness={0.8} roughness={0.2} />
      </mesh>
    </Piece>
  )
}

function PontoEletrica({ x, z, tipo }) {
  const meta = ELETRICA.find((e) => e.id === tipo)
  return (
    <Piece x={x} z={z}>
      <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial color={meta?.cor || '#f4c20d'} emissive={meta?.cor || '#f4c20d'} emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
    </Piece>
  )
}

function StandModel() {
  const { state } = useStand()
  const piso = corPorId(state.piso.corId)?.hex || '#2b2b2b'
  const parede = corPorId(state.parede.corId)?.hex || '#1e1e1e'
  const madeira = corPorId(state.napaMadeira.corId)?.hex || '#DCC9A6'
  const pisoBrilho = state.piso.grupo === 'vinilico'

  return (
    <group>
      <Estrutura pisoHex={piso} pisoBrilho={pisoBrilho} paredeHex={parede} madeiraHex={madeira} led={state.ledTesteira} />
      <Frame />
      <Deposito {...state.deposito} madeiraHex={madeira} />
      {state.salaReuniao && <SalaReuniao {...state.salaReuniao} />}
      {state.mobiliario.map((m) => (
        <Piece key={m.uid} x={m.x} z={m.z} rot={m.rot}><MobiliarioMesh tipo={m.tipo} /></Piece>
      ))}
      {state.paisagismo.map((p) => (
        <Piece key={p.uid} x={p.x} z={p.z}><PlantaMesh tipo={p.tipo} /></Piece>
      ))}
      {state.eletrica.map((e) => <PontoEletrica key={e.uid} x={e.x} z={e.z} tipo={e.tipo} />)}
    </group>
  )
}

export default function Scene3D() {
  return (
    <Canvas shadows dpr={[1, 1.8]} camera={{ position: [8, 5.2, 9.5], fov: 40 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}>
      {/* fundo em gradiente suave */}
      <color attach="background" args={['#0d0e12']} />
      <fog attach="fog" args={['#0d0e12', 22, 40]} />

      <hemisphereLight args={['#eef2ff', '#181a20', 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[7, 11, 6]} intensity={1.25} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002}
        shadow-camera-far={45} shadow-camera-left={-11} shadow-camera-right={11}
        shadow-camera-top={11} shadow-camera-bottom={-11} />
      <directionalLight position={[-7, 8, -5]} intensity={0.4} color="#cfe0ff" />
      <pointLight position={[0, 3.0, 1.2]} intensity={0.6} color="#ffdd9e" distance={12} />

      <Suspense fallback={null}>
        <StandModel />
        {/* reflexos via lightformers (offline, sem HDR de CDN) */}
        <Environment resolution={256} frames={1} background={false}>
          <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 6, 4]} scale={[14, 5, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#cfe0ff" position={[-8, 3, 4]} rotation={[0, Math.PI / 3, 0]} scale={[6, 8, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#ffe6c2" position={[8, 3, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[6, 8, 1]} />
          <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 4, -8]} scale={[10, 6, 1]} />
        </Environment>
      </Suspense>

      {/* piso "infinito" sob o stand */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#0f1013" roughness={0.6} metalness={0.1} envMapIntensity={0.4} />
      </mesh>
      <ContactShadows position={[0, 0.03, 0]} opacity={0.55} scale={22} blur={2.6} far={7} resolution={1024} />

      <OrbitControls target={[0, 1.25, -0.3]} minDistance={5} maxDistance={22}
        maxPolarAngle={Math.PI / 2.08} enablePan={false} enableDamping dampingFactor={0.08} />
    </Canvas>
  )
}
