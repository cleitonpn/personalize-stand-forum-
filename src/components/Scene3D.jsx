import { Canvas } from '@react-three/fiber'
import { OrbitControls, ContactShadows, RoundedBox } from '@react-three/drei'
import { Suspense } from 'react'
import { useStand } from '../store/StandStore.jsx'
import { corPorId, MOBILIARIO, PAISAGISMO, ELETRICA } from '../data/catalogo.js'

const W = 10, D = 4          // dimensões do stand (m)
const WALL_H = 2.75          // altura útil de parede
const TEST_H = 1.1           // altura da testeira (a partir de 4m)
// mapeia coord. do stand (x:0..10, z:0..4) -> mundo 3D (centralizado)
const px = (x) => x - W / 2
const pz = (z) => z - D / 2

function Piece({ children, x, z, rot = 0 }) {
  return <group position={[px(x), 0, pz(z)]} rotation={[0, rot, 0]}>{children}</group>
}

/* ---------- Mobiliário paramétrico (placeholder até o GLB real) ---------- */
function Bistro() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 12]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.05, 24]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.62, 0.38, Math.sin(a) * 0.62]} castShadow>
            <cylinderGeometry args={[0.19, 0.17, 0.05, 16]} />
            <meshStandardMaterial color="#222" roughness={0.6} />
          </mesh>
        )
      })}
    </group>
  )
}
function Balcao() {
  return (
    <group>
      <RoundedBox args={[2.0, 1.1, 0.7]} radius={0.04} position={[0, 0.55, 0]} castShadow>
        <meshStandardMaterial color="#161616" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0.55, 0.36]}>
        <planeGeometry args={[1.7, 0.55]} />
        <meshStandardMaterial color="#0b0b0b" emissive="#f4c20d" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 1.11, 0]}>
        <boxGeometry args={[2.02, 0.03, 0.72]} />
        <meshStandardMaterial color="#f4c20d" emissive="#f4c20d" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}
function Aparador() {
  return (
    <group>
      <RoundedBox args={[1.1, 0.08, 0.4]} radius={0.02} position={[0, 1.0, 0]} castShadow>
        <meshStandardMaterial color="#caa46a" roughness={0.6} />
      </RoundedBox>
    </group>
  )
}
function Sofa() {
  return (
    <group>
      <RoundedBox args={[1.6, 0.4, 0.85]} radius={0.06} position={[0, 0.3, 0]} castShadow>
        <meshStandardMaterial color="#2b2f38" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[1.6, 0.5, 0.18]} radius={0.06} position={[0, 0.55, -0.33]} castShadow>
        <meshStandardMaterial color="#2b2f38" roughness={0.8} />
      </RoundedBox>
    </group>
  )
}
function Poltrona() {
  return (
    <group>
      <RoundedBox args={[0.8, 0.4, 0.85]} radius={0.06} position={[0, 0.3, 0]} castShadow>
        <meshStandardMaterial color="#3a3f4a" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.8, 0.5, 0.18]} radius={0.06} position={[0, 0.55, -0.33]} castShadow>
        <meshStandardMaterial color="#3a3f4a" roughness={0.8} />
      </RoundedBox>
    </group>
  )
}
function MesaCentro() {
  return (
    <RoundedBox args={[0.7, 0.4, 0.7]} radius={0.03} position={[0, 0.2, 0]} castShadow>
      <meshStandardMaterial color="#d8d8d8" roughness={0.3} />
    </RoundedBox>
  )
}
function Expositor() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.6, 1.8, 0.6]} />
        <meshStandardMaterial color="#e9e9e9" transparent opacity={0.25} roughness={0.1} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.62, 1.8, 0.62]} />
        <meshStandardMaterial color="#888" wireframe />
      </mesh>
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

/* ---------- Paisagismo ---------- */
function PlantaMesh({ tipo }) {
  if (tipo === 'jardim-vertical') {
    return (
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[1.0, 2.0, 0.2]} />
        <meshStandardMaterial color="#2f6b3a" roughness={0.9} />
      </mesh>
    )
  }
  const h = tipo === 'planta-alta' ? 1.6 : 0.9
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 0.4, 16]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.4 + (h - 0.4) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, h - 0.4, 8]} />
        <meshStandardMaterial color="#5a4632" />
      </mesh>
      <mesh position={[0, h, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#2f7d43" roughness={0.9} />
      </mesh>
      <mesh position={[0.18, h - 0.15, 0.1]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color="#377d49" roughness={0.9} />
      </mesh>
    </group>
  )
}

/* ---------- Estrutura do stand ---------- */
function Estrutura({ pisoHex, paredeHex, madeiraHex, led }) {
  return (
    <group>
      {/* piso */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshStandardMaterial color={pisoHex} roughness={0.85} />
      </mesh>
      {/* parede de fundo (napa) */}
      <mesh position={[0, WALL_H / 2, -D / 2]} receiveShadow>
        <boxGeometry args={[W, WALL_H, 0.08]} />
        <meshStandardMaterial color={paredeHex} roughness={0.75} />
      </mesh>
      {/* parede lateral esquerda (napa) */}
      <mesh position={[-W / 2, WALL_H / 2, 0]} receiveShadow>
        <boxGeometry args={[0.08, WALL_H, D]} />
        <meshStandardMaterial color={paredeHex} roughness={0.75} />
      </mesh>
      {/* parede de madeira (aparador/TV) — trecho à direita do fundo */}
      <mesh position={[W / 2 - 1.7, WALL_H / 2, -D / 2 + 0.05]}>
        <boxGeometry args={[3.4, WALL_H, 0.06]} />
        <meshStandardMaterial color={madeiraHex} roughness={0.6} />
      </mesh>
      {/* TV 55" */}
      <mesh position={[W / 2 - 1.7, 1.6, -D / 2 + 0.1]}>
        <boxGeometry args={[1.25, 0.72, 0.04]} />
        <meshStandardMaterial color="#0a0a0a" emissive="#1b3a6b" emissiveIntensity={0.5} />
      </mesh>

      {/* testeira (valance) frontal — caixa preta elevada */}
      <mesh position={[0, WALL_H + 0.55, -D / 2 + 0.4]}>
        <boxGeometry args={[W, TEST_H, 0.9]} />
        <meshStandardMaterial color="#141414" roughness={0.5} />
      </mesh>
      <mesh position={[0, WALL_H + 0.55, -D / 2 + 0.86]}>
        <planeGeometry args={[6.4, 0.85]} />
        <meshStandardMaterial color="#0b0b0b" emissive="#f4c20d" emissiveIntensity={0.28} />
      </mesh>

      {/* colunas frontais: impressa (Opção C) OU painel de LED */}
      {[-W / 2 + 0.6, W / 2 - 0.6].map((x, i) => (
        <mesh key={i} position={[x, 1.3, D / 2 - 0.15]}>
          <boxGeometry args={[1.0, 2.6, 0.12]} />
          {led
            ? <meshStandardMaterial color="#111" emissive="#c026d3" emissiveIntensity={0.8} toneMapped={false} />
            : <meshStandardMaterial color="#f4c20d" roughness={0.5} />}
        </mesh>
      ))}
    </group>
  )
}

function Deposito({ x, z, w, d, madeiraHex }) {
  return (
    <Piece x={x} z={z}>
      <mesh position={[0, WALL_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, WALL_H, d]} />
        <meshStandardMaterial color={madeiraHex} roughness={0.65} />
      </mesh>
      {/* faixa/logo */}
      <mesh position={[0, 1.3, d / 2 + 0.005]}>
        <planeGeometry args={[Math.min(2, w * 0.85), 0.7]} />
        <meshStandardMaterial color="#0b0b0b" emissive="#f4c20d" emissiveIntensity={0.2} />
      </mesh>
    </Piece>
  )
}

function SalaReuniao({ x, z, w, d }) {
  const h = 2.4
  return (
    <Piece x={x} z={z}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshPhysicalMaterial color="#bcd3e6" transparent opacity={0.16} roughness={0.05}
          metalness={0} transmission={0.6} thickness={0.2} />
      </mesh>
      {/* moldura */}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[w + 0.04, 0.06, d + 0.04]} />
        <meshStandardMaterial color="#1c1c1c" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[w + 0.04, 0.06, d + 0.04]} />
        <meshStandardMaterial color="#1c1c1c" metalness={0.4} roughness={0.4} />
      </mesh>
      {/* porta (recorte visual) */}
      <mesh position={[w / 2 - 0.5, h / 2, d / 2 + 0.01]}>
        <planeGeometry args={[0.9, h - 0.1]} />
        <meshStandardMaterial color="#8fb3cc" transparent opacity={0.28} />
      </mesh>
    </Piece>
  )
}

function PontoEletrica({ x, z, tipo }) {
  const meta = ELETRICA.find((e) => e.id === tipo)
  return (
    <Piece x={x} z={z}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 20]} />
        <meshStandardMaterial color={meta?.cor || '#f4c20d'} emissive={meta?.cor || '#f4c20d'} emissiveIntensity={0.5} />
      </mesh>
    </Piece>
  )
}

function StandModel() {
  const { state } = useStand()
  const piso = corPorId(state.piso.corId)?.hex || '#2b2b2b'
  const parede = corPorId(state.parede.corId)?.hex || '#1e1e1e'
  const madeira = corPorId(state.napaMadeira.corId)?.hex || '#8E6B5E'

  return (
    <group>
      <Estrutura pisoHex={piso} paredeHex={parede} madeiraHex={madeira} led={state.ledTesteira} />
      <Deposito {...state.deposito} madeiraHex={madeira} />
      {state.salaReuniao && <SalaReuniao {...state.salaReuniao} />}
      {state.mobiliario.map((m) => (
        <Piece key={m.uid} x={m.x} z={m.z} rot={m.rot}>
          <MobiliarioMesh tipo={m.tipo} />
        </Piece>
      ))}
      {state.paisagismo.map((p) => (
        <Piece key={p.uid} x={p.x} z={p.z}>
          <PlantaMesh tipo={p.tipo} />
        </Piece>
      ))}
      {state.eletrica.map((e) => (
        <PontoEletrica key={e.uid} x={e.x} z={e.z} tipo={e.tipo} />
      ))}
    </group>
  )
}

export default function Scene3D() {
  return (
    <Canvas shadows camera={{ position: [7.5, 6, 9], fov: 42 }} dpr={[1, 1.8]}>
      <color attach="background" args={['#0a0b0e']} />
      {/* iluminação 100% local — sem HDR de CDN, funciona offline */}
      <hemisphereLight args={['#eaf0ff', '#20242e', 0.7]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 6]} intensity={1.15} castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-far={40}
        shadow-camera-left={-10} shadow-camera-right={10}
        shadow-camera-top={10} shadow-camera-bottom={-10} />
      <directionalLight position={[-6, 8, -4]} intensity={0.45} />
      <pointLight position={[0, 3.2, 1]} intensity={0.5} color="#ffd873" />
      <Suspense fallback={null}>
        <StandModel />
      </Suspense>
      <ContactShadows position={[0, 0.021, 0]} opacity={0.5} scale={16} blur={2.2} far={6} />
      <OrbitControls target={[0, 1.2, 0]} minDistance={5} maxDistance={20}
        maxPolarAngle={Math.PI / 2.05} enablePan={false} />
    </Canvas>
  )
}
