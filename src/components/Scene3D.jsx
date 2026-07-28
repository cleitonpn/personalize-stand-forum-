import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, RoundedBox, Environment, Lightformer } from '@react-three/drei'
import { Suspense, useMemo, useState } from 'react'
import { useStand } from '../store/StandStore.jsx'
import { corPorId, ELETRICA } from '../data/catalogo.js'
import { logoTexture, panelTexture, testeiraTexture, lonaPadraoTexture, textureFromURL } from '../three/textures.js'

const W = 10, D = 4
const WALL_H = 2.75
const TOP = WALL_H + 1.7
// fundo em 3 blocos: esquerda / centro (napa) + direita (madeira)
const WB = [3.3, 3.3, 3.4]
const XB = [-W / 2 + WB[0] / 2, -W / 2 + WB[0] + WB[1] / 2, W / 2 - WB[2] / 2]
const px = (x) => x - W / 2
const pz = (z) => z - D / 2
const METAL = { color: '#15161a', metalness: 0.85, roughness: 0.35 }
const WARM = '#ffe1ad'

function Piece({ children, x, z, rot = 0 }) {
  return <group position={[px(x), 0, pz(z)]} rotation={[0, rot, 0]}>{children}</group>
}

function useLonaTexture(lona) {
  return useMemo(() => {
    if (!lona) return null
    if (lona.fonte === 'custom' && lona.dataUrl) return textureFromURL(lona.dataUrl)
    return lonaPadraoTexture(lona.id || 'lona-marca')
  }, [lona?.fonte, lona?.id, lona?.dataUrl])
}

/* ---------- painel de parede (cor/lona/seleção) ---------- */
function WallPanel({ id, hex, lona, w, h = WALL_H, thick = 0.08, x, y = WALL_H / 2, z, rotY = 0,
  roughness = 0.8, metalness = 0, selWall, onSel, deco, showDeco = true, overlay }) {
  const lonaTex = useLonaTexture(lona)
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]} onPointerDown={(e) => { e.stopPropagation(); onSel(id) }}>
      <RoundedBox args={[w, h, thick]} radius={0.01} castShadow receiveShadow>
        <meshStandardMaterial color={hex} roughness={roughness} metalness={metalness} />
      </RoundedBox>
      {!lona && showDeco && deco}
      {lonaTex && <mesh position={[0, 0, thick / 2 + 0.006]}><planeGeometry args={[w - 0.04, h - 0.06]} /><meshStandardMaterial map={lonaTex} roughness={0.7} /></mesh>}
      {overlay}
      {selWall === id && (
        <mesh position={[0, 0, thick / 2 + 0.02]}><boxGeometry args={[w + 0.05, h + 0.05, 0.015]} />
          <meshStandardMaterial color="#f4c20d" emissive="#f4c20d" emissiveIntensity={1.3} toneMapped={false} wireframe /></mesh>
      )}
    </group>
  )
}

/* ---------- testeira: dois "L" finos (10cm) com contorno de LED ---------- */
function LineFrame({ w, h, color = WARM, intensity = 2.2 }) {
  const t = 0.03
  const bar = (args, pos) => <mesh position={pos}><boxGeometry args={args} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={intensity} toneMapped={false} /></mesh>
  return (
    <group>
      {bar([w, t, t], [0, h / 2, 0])}
      {bar([w, t, t], [0, -h / 2, 0])}
      {bar([t, h, t], [-w / 2, 0, 0])}
      {bar([t, h, t], [w / 2, 0, 0])}
    </group>
  )
}
function TesteiraPanel({ len, h = 1.05, t = 0.1, x, y, z, rotY = 0, tex, panel, ledOn }) {
  return (
    <group position={[x, y, z]} rotation={[0, rotY, 0]}>
      <mesh castShadow><boxGeometry args={[len, h, t]} /><meshStandardMaterial color="#0e0f13" roughness={0.5} metalness={0.2} /></mesh>
      <mesh position={[0, 0, t / 2 + 0.008]}>
        <planeGeometry args={[len - 0.04, h - 0.06]} />
        {ledOn
          ? <meshStandardMaterial map={panel} emissiveMap={panel} emissive="#c026d3" emissiveIntensity={1.3} toneMapped={false} />
          : <meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.32} toneMapped={false} />}
      </mesh>
      <group position={[0, 0, t / 2 + 0.018]}><LineFrame w={len - 0.03} h={h - 0.03} /></group>
    </group>
  )
}
function Testeira({ ledTesteira }) {
  const tex = useMemo(() => testeiraTexture(), [])
  const panel = useMemo(() => panelTexture(), [])
  const yC = WALL_H + 0.85
  const Lf = 3.6, Lr = 2.2
  const c = { h: 1.05, t: 0.1, y: yC, tex, panel, ledOn: ledTesteira }
  return (
    <group>
      <TesteiraPanel {...c} len={Lf} x={-W / 2 + Lf / 2} z={D / 2} rotY={0} />
      <TesteiraPanel {...c} len={Lr} x={-W / 2} z={D / 2 - Lr / 2} rotY={-Math.PI / 2} />
      <TesteiraPanel {...c} len={Lf} x={W / 2 - Lf / 2} z={D / 2} rotY={0} />
      <TesteiraPanel {...c} len={Lr} x={W / 2} z={D / 2 - Lr / 2} rotY={Math.PI / 2} />
    </group>
  )
}

/* ---------- estrutura metálica ---------- */
function Beam({ x, y, z, w, h, d }) {
  return <mesh position={[x, y, z]} castShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial {...METAL} /></mesh>
}
function Frame() {
  const t = 0.07, bx = W / 2, bz = D / 2
  return (
    <group>
      {[[-bx, -bz], [bx, -bz], [-bx, bz], [bx, bz]].map(([x, z], i) => <Beam key={i} x={x} y={TOP / 2} z={z} w={t} h={TOP} d={t} />)}
      <Beam x={-bx + 1.15} y={WALL_H / 2 + 0.7} z={bz} w={t} h={WALL_H + 1.4} d={t} />
      <Beam x={bx - 1.15} y={WALL_H / 2 + 0.7} z={bz} w={t} h={WALL_H + 1.4} d={t} />
      <Beam x={0} y={TOP} z={-bz} w={W} h={t} d={t} />
      <Beam x={0} y={TOP} z={bz} w={W} h={t} d={t} />
      <Beam x={-bx} y={TOP} z={0} w={t} h={t} d={D} />
      <Beam x={bx} y={TOP} z={0} w={t} h={t} d={D} />
    </group>
  )
}

/* ---------- colunas da frente: frente e costas independentes ---------- */
function ColunaFrente({ lado }) {
  const { state, dispatch } = useStand()
  const x = lado === 'esq' ? -W / 2 + 0.65 : W / 2 - 0.65
  const idF = `col-${lado}`, idV = `col-${lado}-verso`
  const cfgF = state.paredes[idF], cfgV = state.paredes[idV]
  const lonaF = useLonaTexture(cfgF.lona)
  const lonaV = useLonaTexture(cfgV.lona)
  const logo = useMemo(() => logoTexture(), [])
  const panel = useMemo(() => panelTexture(), [])
  const ledOn = state.led.colunas === 'colunas2' || (state.led.colunas === 'coluna1' && lado === 'dir')
  const sel = state.paredeSel
  const boxHex = corPorId(cfgF.corId)?.hex || '#111'
  const pick = (id) => (e) => { e.stopPropagation(); dispatch({ type: 'SELECT_PAREDE', parede: id }) }
  return (
    <group position={[x, 1.35, D / 2 - 0.12]}>
      <mesh castShadow><boxGeometry args={[0.95, 2.55, 0.1]} /><meshStandardMaterial color={boxHex} roughness={0.6} /></mesh>
      {/* frente (para o corredor) */}
      <mesh position={[0, 0, 0.056]} onPointerDown={pick(idF)}>
        <planeGeometry args={[0.91, 2.51]} />
        {ledOn
          ? <meshStandardMaterial map={panel} emissiveMap={panel} emissive="#a21caf" emissiveIntensity={1.35} toneMapped={false} />
          : lonaF ? <meshStandardMaterial map={lonaF} roughness={0.6} /> : <meshStandardMaterial map={logo} roughness={0.5} />}
      </mesh>
      {/* costas (para dentro do stand) — arte independente */}
      <mesh position={[0, 0, -0.056]} rotation={[0, Math.PI, 0]} onPointerDown={pick(idV)}>
        <planeGeometry args={[0.91, 2.51]} />
        {lonaV ? <meshStandardMaterial map={lonaV} roughness={0.6} /> : <meshStandardMaterial map={logo} roughness={0.5} />}
      </mesh>
      <group position={[0, 0, 0.065]}><LineFrame w={1.0} h={2.58} color="#f4c20d" intensity={ledOn ? 2 : 0.5} /></group>
      {(sel === idF || sel === idV) && (
        <mesh position={[0, 0, sel === idF ? 0.08 : -0.08]}><boxGeometry args={[1.05, 2.65, 0.01]} />
          <meshStandardMaterial color="#f4c20d" emissive="#f4c20d" emissiveIntensity={1.3} toneMapped={false} wireframe /></mesh>
      )}
    </group>
  )
}

/* ---------- mobiliário ---------- */
function Banqueta() {
  return (
    <group>
      {/* base */}
      <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.19, 0.21, 0.04, 28]} /><meshStandardMaterial color="#101012" metalness={0.75} roughness={0.25} /></mesh>
      {/* haste cromada */}
      <mesh position={[0, 0.38, 0]} castShadow><cylinderGeometry args={[0.022, 0.022, 0.68, 16]} /><meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.15} /></mesh>
      {/* apoio de pés */}
      <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.13, 0.012, 10, 28]} /><meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.2} /></mesh>
      {/* assento estofado com borda arredondada */}
      <mesh position={[0, 0.735, 0]} castShadow><cylinderGeometry args={[0.165, 0.15, 0.055, 28]} /><meshStandardMaterial color="#23252a" roughness={0.5} /></mesh>
      <mesh position={[0, 0.762, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.145, 0.028, 12, 28]} /><meshStandardMaterial color="#23252a" roughness={0.5} /></mesh>
    </group>
  )
}
function Bistro() {
  return (
    <group>
      <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.3, 0.33, 0.05, 28]} /><meshStandardMaterial color="#101012" metalness={0.7} roughness={0.3} /></mesh>
      <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 1.05, 16]} /><meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.15} /></mesh>
      <mesh position={[0, 1.08, 0]} castShadow><cylinderGeometry args={[0.4, 0.4, 0.045, 36]} /><meshStandardMaterial color="#17171a" roughness={0.3} metalness={0.1} /></mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5
        return <group key={i} position={[Math.cos(a) * 0.62, 0, Math.sin(a) * 0.62]}><Banqueta /></group>
      })}
    </group>
  )
}
function Balcao() {
  const { state } = useStand()
  const hex = corPorId(state.balcaoCfg.corId)?.hex || '#141414'
  const logoDefault = useMemo(() => logoTexture(), [])
  const logoCustom = useMemo(
    () => state.balcaoCfg.logoUrl ? textureFromURL(state.balcaoCfg.logoUrl) : null,
    [state.balcaoCfg.logoUrl],
  )
  return (
    <group>
      <RoundedBox args={[2.0, 1.1, 0.7]} radius={0.03} smoothness={4} position={[0, 0.55, 0]} castShadow receiveShadow><meshStandardMaterial color={hex} roughness={0.45} metalness={0.1} /></RoundedBox>
      <mesh position={[0, 0.58, 0.361]}><planeGeometry args={[1.6, 0.5]} /><meshStandardMaterial map={logoCustom || logoDefault} emissive="#f4c20d" emissiveIntensity={logoCustom ? 0 : 0.12} roughness={0.5} /></mesh>
      <mesh position={[0, 0.04, 0.35]}><boxGeometry args={[2.0, 0.05, 0.02]} /><meshStandardMaterial color="#f4c20d" emissive="#f4c20d" emissiveIntensity={2} toneMapped={false} /></mesh>
      <RoundedBox args={[2.04, 0.04, 0.74]} radius={0.02} position={[0, 1.11, 0]}><meshStandardMaterial color="#0c0c0c" roughness={0.3} metalness={0.3} /></RoundedBox>
    </group>
  )
}
function Cadeira() {
  return (
    <group>
      <RoundedBox args={[0.45, 0.05, 0.45]} radius={0.02} position={[0, 0.45, 0]} castShadow><meshStandardMaterial color="#2b2e35" roughness={0.7} /></RoundedBox>
      <RoundedBox args={[0.45, 0.5, 0.05]} radius={0.02} position={[0, 0.73, -0.2]} rotation={[-0.1, 0, 0]} castShadow><meshStandardMaterial color="#2b2e35" roughness={0.7} /></RoundedBox>
      {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.22, lz]} castShadow><cylinderGeometry args={[0.015, 0.015, 0.44, 10]} /><meshStandardMaterial color="#0c0c0c" metalness={0.7} roughness={0.3} /></mesh>
      ))}
    </group>
  )
}
function MesaRedonda() {
  return (
    <group>
      <mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.45, 0.45, 0.04, 36]} /><meshStandardMaterial color="#e8e6e0" roughness={0.25} /></mesh>
      <mesh position={[0, 0.38, 0]} castShadow><cylinderGeometry args={[0.035, 0.045, 0.72, 16]} /><meshStandardMaterial color="#15161a" metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.26, 0.28, 0.04, 28]} /><meshStandardMaterial color="#101012" metalness={0.7} roughness={0.3} /></mesh>
    </group>
  )
}
function Aparador() {
  return <RoundedBox args={[1.1, 0.06, 0.4]} radius={0.015} position={[0, 1.0, 0]} castShadow><meshStandardMaterial color="#caa46a" roughness={0.5} /></RoundedBox>
}
function Sofa() {
  return (
    <group>
      <RoundedBox args={[1.6, 0.4, 0.85]} radius={0.08} position={[0, 0.32, 0]} castShadow><meshStandardMaterial color="#2a2e37" roughness={0.85} /></RoundedBox>
      <RoundedBox args={[1.6, 0.55, 0.16]} radius={0.07} position={[0, 0.55, -0.34]} castShadow><meshStandardMaterial color="#2a2e37" roughness={0.85} /></RoundedBox>
      {[-0.65, 0.65].map((x, i) => <RoundedBox key={i} args={[0.16, 0.4, 0.85]} radius={0.06} position={[x, 0.42, 0]} castShadow><meshStandardMaterial color="#31353f" roughness={0.85} /></RoundedBox>)}
    </group>
  )
}
function Poltrona() {
  return (
    <group>
      <RoundedBox args={[0.8, 0.4, 0.85]} radius={0.08} position={[0, 0.32, 0]} castShadow><meshStandardMaterial color="#3a3f4a" roughness={0.85} /></RoundedBox>
      <RoundedBox args={[0.8, 0.55, 0.16]} radius={0.07} position={[0, 0.55, -0.34]} castShadow><meshStandardMaterial color="#3a3f4a" roughness={0.85} /></RoundedBox>
    </group>
  )
}
function MesaCentro() {
  return (
    <group>
      <RoundedBox args={[0.7, 0.05, 0.7]} radius={0.02} position={[0, 0.4, 0]} castShadow><meshStandardMaterial color="#e8e8e8" roughness={0.15} metalness={0.1} /></RoundedBox>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.04, 0.04, 0.4, 12]} /><meshStandardMaterial {...METAL} /></mesh>
    </group>
  )
}
function Expositor() {
  return (
    <group>
      <mesh position={[0, 0.9, 0]} castShadow raycast={() => null}><boxGeometry args={[0.6, 1.8, 0.6]} /><meshPhysicalMaterial color="#dfe7ee" transparent opacity={0.2} roughness={0.05} metalness={0.15} envMapIntensity={1.2} /></mesh>
      <RoundedBox args={[0.66, 0.08, 0.66]} radius={0.02} position={[0, 0.04, 0]}><meshStandardMaterial {...METAL} /></RoundedBox>
    </group>
  )
}
function MobiliarioMesh({ tipo }) {
  switch (tipo) {
    case 'mesa-bistro': return <Bistro />
    case 'banqueta': return <Banqueta />
    case 'cadeira': return <Cadeira />
    case 'mesa-redonda': return <MesaRedonda />
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
        <RoundedBox args={[1.0, 2.0, 0.14]} radius={0.03} position={[0, 1.0, 0]} castShadow><meshStandardMaterial color="#2c6b38" roughness={0.95} /></RoundedBox>
        {Array.from({ length: 40 }).map((_, i) => <mesh key={i} position={[(Math.random() - 0.5) * 0.9, 0.2 + Math.random() * 1.7, 0.08]} castShadow><sphereGeometry args={[0.06 + Math.random() * 0.05, 8, 8]} /><meshStandardMaterial color={`hsl(${100 + Math.random() * 30}, 45%, ${28 + Math.random() * 14}%)`} roughness={0.95} /></mesh>)}
      </group>
    )
  }
  const h = tipo === 'planta-alta' ? 1.55 : 0.9, blobs = tipo === 'planta-alta' ? 7 : 4
  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.2, 0.26, 0.4, 20]} /><meshStandardMaterial color="#2c2c2e" roughness={0.7} /></mesh>
      <mesh position={[0, 0.4 + (h - 0.4) / 2, 0]} castShadow><cylinderGeometry args={[0.035, 0.05, h - 0.4, 8]} /><meshStandardMaterial color="#5a4632" roughness={0.9} /></mesh>
      {Array.from({ length: blobs }).map((_, i) => {
        const a = (i / blobs) * Math.PI * 2, r = 0.22 + Math.random() * 0.12
        return <mesh key={i} position={[Math.cos(a) * 0.22, h - 0.1 + Math.sin(i) * 0.12, Math.sin(a) * 0.22]} castShadow><icosahedronGeometry args={[r, 1]} /><meshStandardMaterial color={`hsl(${105 + Math.random() * 25}, 42%, ${30 + Math.random() * 12}%)`} roughness={0.95} flatShading /></mesh>
      })}
    </group>
  )
}

/* ---------- depósito: bloco com 4 paredes editáveis ---------- */
function DepositoBloco({ dep, paredes, hex, selWall, onSel }) {
  const logo = useMemo(() => logoTexture(), [])
  const { w, d } = dep
  const wp = (id, extra) => ({ id, hex: hex(id), lona: paredes[id].lona, selWall, onSel, ...extra })
  return (
    <Piece x={dep.x} z={dep.z}>
      <WallPanel {...wp('dep-fundo', { w, x: 0, z: -d / 2, rotY: Math.PI })} />
      <WallPanel {...wp('dep-frente', { w, x: 0, z: d / 2, rotY: 0 })}
        showDeco={paredes['dep-frente'].logo !== false}
        deco={<mesh position={[0, -0.15, 0.05]}><planeGeometry args={[Math.min(1.9, w * 0.82), 0.6]} /><meshStandardMaterial map={logo} roughness={0.55} /></mesh>} />
      <WallPanel {...wp('dep-esq', { w: d, x: -w / 2, z: 0, rotY: -Math.PI / 2 })} />
      <WallPanel {...wp('dep-dir', { w: d, x: w / 2, z: 0, rotY: Math.PI / 2 })}
        overlay={<mesh position={[d / 2 - 0.5, -0.15, 0.05]}><planeGeometry args={[0.85, WALL_H - 0.4]} /><meshStandardMaterial color="#111" metalness={0.3} roughness={0.5} /></mesh>} />
    </Piece>
  )
}

/* ---------- sala de reunião: vidro, SEM teto, altura da parede ---------- */
// vidro leve (sem transmission — evita render pass extra por frame)
const Vidro = () => <meshPhysicalMaterial color="#cfe0ee" transparent opacity={0.16} roughness={0.05} metalness={0.15} envMapIntensity={1.2} side={THREE.DoubleSide} />
function SalaReuniao({ sala }) {
  const { x, z, w, d } = sala
  const h = WALL_H
  const posts = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]
  const pisoHex = sala.pisoCorId ? corPorId(sala.pisoCorId)?.hex : null
  const t = 0.05
  // moldura vazada no topo e na base: só as 4 barras do perímetro
  const rails = (y) => (
    <group>
      <mesh position={[0, y, -d / 2]}><boxGeometry args={[w + t, t, t]} /><meshStandardMaterial {...METAL} /></mesh>
      <mesh position={[0, y, d / 2]}><boxGeometry args={[w + t, t, t]} /><meshStandardMaterial {...METAL} /></mesh>
      <mesh position={[-w / 2, y, 0]}><boxGeometry args={[t, t, d + t]} /><meshStandardMaterial {...METAL} /></mesh>
      <mesh position={[w / 2, y, 0]}><boxGeometry args={[t, t, d + t]} /><meshStandardMaterial {...METAL} /></mesh>
    </group>
  )
  return (
    <Piece x={x} z={z}>
      {/* vidros não capturam raycast — não bloqueiam cliques no que está dentro */}
      <mesh position={[0, h / 2, -d / 2]} raycast={() => null}><planeGeometry args={[w, h]} /><Vidro /></mesh>
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}><planeGeometry args={[d, h]} /><Vidro /></mesh>
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} raycast={() => null}><planeGeometry args={[d, h]} /><Vidro /></mesh>
      <mesh position={[-w / 4 - 0.05, h / 2, d / 2]} raycast={() => null}><planeGeometry args={[w / 2 - 0.1, h]} /><Vidro /></mesh>
      <mesh position={[w / 2 - 0.25, h / 2, d / 2]} raycast={() => null}><planeGeometry args={[0.5, h]} /><Vidro /></mesh>
      {rails(h)}
      {rails(0.03)}
      {posts.map(([cx, cz], i) => <mesh key={i} position={[cx, h / 2, cz]}><boxGeometry args={[t, h, t]} /><meshStandardMaterial {...METAL} /></mesh>)}
      <mesh position={[w / 4 - 0.05, 1.05, d / 2 + 0.03]}><boxGeometry args={[0.03, 0.25, 0.03]} /><meshStandardMaterial color="#dfe7ee" metalness={0.8} roughness={0.2} /></mesh>
      {/* piso próprio da sala (quando escolhido) */}
      {pisoHex && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.052, 0]} receiveShadow>
          <planeGeometry args={[w - 0.08, d - 0.08]} />
          <meshStandardMaterial color={pisoHex} roughness={sala.pisoGrupo === 'vinilico' ? 0.25 : 0.95} metalness={sala.pisoGrupo === 'vinilico' ? 0.12 : 0} />
        </mesh>
      )}
    </Piece>
  )
}

function PontoEletrica({ x, z, tipo }) {
  const meta = ELETRICA.find((e) => e.id === tipo)
  return (
    <Piece x={x} z={z}><mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.12, 24]} /><meshStandardMaterial color={meta?.cor || '#f4c20d'} emissive={meta?.cor || '#f4c20d'} emissiveIntensity={0.7} toneMapped={false} /></mesh></Piece>
  )
}

function StandModel() {
  const { state, dispatch } = useStand()
  const piso = corPorId(state.piso.corId)?.hex || '#2b2b2b'
  const pisoBrilho = state.piso.grupo === 'vinilico'
  const hex = (id) => corPorId(state.paredes[id].corId)?.hex || '#1e1e1e'
  const selWall = state.paredeSel
  const onSel = (id) => dispatch({ type: 'SELECT_PAREDE', parede: id })
  const panel = useMemo(() => panelTexture(), [])
  const logo = useMemo(() => logoTexture(), [])

  return (
    <group>
      {/* piso */}
      <mesh position={[0, 0.02, 0]} receiveShadow><boxGeometry args={[W, 0.04, D]} /><meshStandardMaterial color="#0b0b0b" roughness={0.6} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]} receiveShadow>
        <planeGeometry args={[W - 0.02, D - 0.02]} />
        <meshStandardMaterial color={piso} roughness={pisoBrilho ? 0.22 : 0.95} metalness={pisoBrilho ? 0.15 : 0} envMapIntensity={pisoBrilho ? 1 : 0.2} />
      </mesh>

      {/* fundo em 3 blocos */}
      <WallPanel id="fundo-esq" hex={hex('fundo-esq')} lona={state.paredes['fundo-esq'].lona} w={WB[0]} x={XB[0]} z={-D / 2} selWall={selWall} onSel={onSel}
        deco={<mesh position={[0, 0, 0.05]}><planeGeometry args={[WB[0] - 0.5, WALL_H - 0.12]} /><meshStandardMaterial map={panel} roughness={0.7} /></mesh>} />
      <WallPanel id="fundo-centro" hex={hex('fundo-centro')} lona={state.paredes['fundo-centro'].lona} w={WB[1]} x={XB[1]} z={-D / 2} selWall={selWall} onSel={onSel}
        showDeco={state.paredes['fundo-centro'].logo !== false}
        deco={<mesh position={[0, 0.15, 0.05]}><planeGeometry args={[1.7, 0.85]} /><meshStandardMaterial map={logo} roughness={0.6} /></mesh>} />
      <WallPanel id="fundo-dir" hex={hex('fundo-dir')} lona={state.paredes['fundo-dir'].lona} w={WB[2]} x={XB[2]} z={-D / 2} roughness={0.55} metalness={0.05} selWall={selWall} onSel={onSel} />

      {/* TV móvel/removível na parede do fundo */}
      {state.tv.presente && (
        <group position={[px(state.tv.x), 1.65, -D / 2 + 0.07]}>
          <mesh><boxGeometry args={[1.3, 0.75, 0.05]} /><meshStandardMaterial color="#050505" roughness={0.3} metalness={0.4} /></mesh>
          <mesh position={[0, 0, 0.03]}><planeGeometry args={[1.2, 0.66]} /><meshStandardMaterial color="#0b1e44" emissive="#1b3f80" emissiveIntensity={0.55} toneMapped={false} /></mesh>
        </group>
      )}

      <DepositoBloco dep={state.deposito} paredes={state.paredes} hex={hex} selWall={selWall} onSel={onSel} />

      <Testeira ledTesteira={state.led.testeira} />
      <ColunaFrente lado="esq" />
      <ColunaFrente lado="dir" />
      <Frame />

      {state.salaReuniao && <SalaReuniao sala={state.salaReuniao} />}
      {state.mobiliario.map((m) => <Piece key={m.uid} x={m.x} z={m.z} rot={m.rot}><MobiliarioMesh tipo={m.tipo} /></Piece>)}
      {state.paisagismo.map((p) => <Piece key={p.uid} x={p.x} z={p.z}><PlantaMesh tipo={p.tipo} /></Piece>)}
      {state.eletrica.map((e) => <PontoEletrica key={e.uid} x={e.x} z={e.z} tipo={e.tipo} />)}
    </group>
  )
}

/* ---------- câmeras prontas ---------- */
const CAM_PRESETS = {
  padrao: { pos: [8.5, 5.2, 9.5], tgt: [0, 1.25, -0.2], nome: 'Perspectiva' },
  frente: { pos: [0, 1.9, 11.5], tgt: [0, 1.5, 0], nome: 'Frente' },
  interior: { pos: [0.6, 1.7, 3.3], tgt: [0.3, 1.3, -2], nome: 'Interior' },
  topo: { pos: [0, 13, 0.6], tgt: [0, 0, 0], nome: 'Topo' },
}
function CameraRig({ goal, onDone }) {
  const { camera, controls } = useThree()
  useFrame(() => {
    if (!goal || !controls) return
    camera.position.lerp(goal.pos, 0.09)
    controls.target.lerp(goal.tgt, 0.09)
    controls.update()
    if (camera.position.distanceTo(goal.pos) < 0.08) onDone()
  })
  return null
}

export default function Scene3D() {
  const [goal, setGoal] = useState(null)
  const irPara = (k) => {
    const p = CAM_PRESETS[k]
    setGoal({ pos: new THREE.Vector3(...p.pos), tgt: new THREE.Vector3(...p.tgt) })
  }
  return (
    <>
      <div className="cam-btns">
        {Object.entries(CAM_PRESETS).map(([k, p]) => (
          <button key={k} className="tab" onClick={() => irPara(k)}>{p.nome}</button>
        ))}
      </div>
      <Canvas shadows dpr={[1, 1.8]} camera={{ position: [8.5, 5.2, 9.5], fov: 40 }}
        gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        onCreated={({ gl }) => { window.__psfShot = () => gl.domElement.toDataURL('image/png') }}>
        <color attach="background" args={['#0d0e12']} />
        <fog attach="fog" args={['#0d0e12', 22, 42]} />
        <hemisphereLight args={['#eef2ff', '#181a20', 0.55]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[7, 11, 6]} intensity={1.25} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002}
          shadow-camera-far={45} shadow-camera-left={-11} shadow-camera-right={11} shadow-camera-top={11} shadow-camera-bottom={-11} />
        <directionalLight position={[-7, 8, -5]} intensity={0.4} color="#cfe0ff" />
        <pointLight position={[0, 3, 1.5]} intensity={0.6} color="#ffdd9e" distance={12} />
        <Suspense fallback={null}>
          <StandModel />
          <Environment resolution={256} frames={1} background={false}>
            <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 6, 6]} scale={[14, 5, 1]} />
            <Lightformer form="rect" intensity={1.4} color="#cfe0ff" position={[-8, 3, 4]} rotation={[0, Math.PI / 3, 0]} scale={[6, 8, 1]} />
            <Lightformer form="rect" intensity={1.4} color="#ffe6c2" position={[8, 3, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[6, 8, 1]} />
            <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 4, -8]} scale={[10, 6, 1]} />
          </Environment>
        </Suspense>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} /><meshStandardMaterial color="#0f1013" roughness={0.6} metalness={0.1} envMapIntensity={0.4} />
        </mesh>
        <ContactShadows position={[0, 0.05, 0]} opacity={0.5} scale={22} blur={2.6} far={7} resolution={1024} />
        <OrbitControls makeDefault target={[0, 1.25, -0.2]} minDistance={5} maxDistance={22} maxPolarAngle={Math.PI / 2.08} enableDamping dampingFactor={0.08} enablePan={false} />
        <CameraRig goal={goal} onDone={() => setGoal(null)} />
      </Canvas>
    </>
  )
}
