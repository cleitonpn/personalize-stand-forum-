import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, Environment, Lightformer } from '@react-three/drei'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js'
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import * as THREE from 'three'
import { PAPEIS } from '../lib/glb/roles.js'
import { chaveDaPeca } from '../lib/glb/analyze.js'

/**
 * Loader com os decodificadores de compressão registrados.
 *
 * Um .glb de fornecedor pode vir com malha comprimida em Draco/Meshopt ou
 * texturas em KTX2. Sem estes decodificadores o GLTFLoader recusa o arquivo,
 * e a mensagem não deixa claro que a causa é compressão. Os arquivos ficam em
 * public/decoders (copiados do three no prebuild) — nada de CDN externo.
 */
let _loader = null
function obterLoader() {
  if (_loader) return _loader

  const draco = new DRACOLoader().setDecoderPath('/decoders/draco/')
  const ktx2 = new KTX2Loader().setTranscoderPath('/decoders/basis/')

  _loader = new GLTFLoader()
    .setDRACOLoader(draco)
    .setKTX2Loader(ktx2)
    .setMeshoptDecoder(MeshoptDecoder)

  return _loader
}

/** Carrega um .glb e devolve a cena, em promessa. Usado fora do ciclo do React. */
export function carregarGLB(fonte) {
  return new Promise((resolve, reject) => {
    const local = typeof fonte !== 'string'
    const url = local ? URL.createObjectURL(fonte) : fonte
    const limpar = () => { if (local) URL.revokeObjectURL(url) }
    obterLoader().load(
      url,
      (gltf) => { limpar(); resolve(gltf.scene) },
      undefined,
      (err) => { limpar(); reject(err) },
    )
  })
}

/**
 * Descobre POR QUE o carregamento falhou.
 * O GLTFLoader entrega um ProgressEvent sem mensagem quando o XHR morre, então
 * "erro ao carregar" sozinho não ajuda ninguém. Uma segunda tentativa via fetch
 * separa os casos que têm soluções bem diferentes.
 */
async function diagnosticar(url) {
  try {
    const r = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-0' } })
    if (r.ok || r.status === 206) {
      return {
        titulo: 'O arquivo baixa, mas não é um .glb válido',
        detalhe: 'O download funcionou, então não é rede nem permissão. O arquivo pode estar corrompido ou não ser glTF binário.',
      }
    }
    if (r.status === 403) {
      return {
        titulo: 'Sem permissão para ler o arquivo',
        detalhe: 'O Storage recusou (403). Publique as regras: npx firebase deploy --only storage --project personalizacao-stand',
      }
    }
    if (r.status === 404) {
      return {
        titulo: 'Arquivo não encontrado no Storage',
        detalhe: 'O registro existe no banco, mas o .glb não está mais no bucket.',
      }
    }
    return { titulo: `O servidor respondeu ${r.status}`, detalhe: 'Resposta inesperada ao buscar o arquivo.' }
  } catch {
    // O fetch acima estourou sem status. Isso tanto pode ser CORS quanto o
    // servidor inalcançável — e a correção é completamente diferente.
    //
    // O modo 'no-cors' distingue os dois com certeza: ele devolve uma resposta
    // opaca se o servidor respondeu (só não deixa LER), e só estoura se não deu
    // nem para falar com o servidor. Então:
    //   no-cors passa + cors falha  = é CORS, sem dúvida
    //   os dois falham              = rede/servidor
    try {
      await fetch(url, { mode: 'no-cors' })
      return {
        titulo: 'Bloqueado por CORS',
        detalhe: 'O servidor entrega o arquivo, mas não autoriza este site a lê-lo por JavaScript. Baixar pelo link funciona (navegação não passa por CORS); ler pelo app, não. É uma liberação única no bucket do Storage.',
        cors: true,
      }
    } catch {
      return {
        titulo: 'Não foi possível falar com o servidor',
        detalhe: 'A requisição não chegou a receber resposta. Costuma ser queda de conexão, VPN/firewall corporativo, ou uma extensão do navegador barrando.',
        rede: true,
      }
    }
  }
}

/** Carrega um .glb a partir de uma URL (Storage) ou de um File local. */
export function useGLB(fonte) {
  const [estado, setEstado] = useState({ cena: null, erro: null, progresso: 0, carregando: false })

  useEffect(() => {
    if (!fonte) {
      setEstado({
        cena: null, progresso: 0, carregando: false,
        erro: fonte === undefined ? null : {
          titulo: 'Modelo sem arquivo', detalhe: 'Este registro não tem um .glb associado. Envie o arquivo de novo.',
        },
      })
      return
    }

    let vivo = true
    let objectUrl = null
    const url = typeof fonte === 'string' ? fonte : (objectUrl = URL.createObjectURL(fonte))

    setEstado({ cena: null, erro: null, progresso: 0, carregando: true })

    obterLoader().load(
      url,
      (gltf) => {
        if (!vivo) return
        setEstado({ cena: gltf.scene, erro: null, progresso: 1, carregando: false })
      },
      (ev) => {
        if (!vivo || !ev.total) return
        setEstado((s) => ({ ...s, progresso: ev.loaded / ev.total }))
      },
      async (err) => {
        if (!vivo) return
        // mensagem própria do loader (ex.: glTF malformado) vence o diagnóstico
        const doLoader = typeof err?.message === 'string' && err.message ? err.message : null
        const diag = typeof fonte === 'string'
          ? await diagnosticar(url)
          : { titulo: 'Não foi possível ler o arquivo', detalhe: doLoader || 'Arquivo inválido.' }
        if (!vivo) return
        const base = doLoader && !diag.rede ? { ...diag, detalhe: doLoader } : diag
        setEstado({
          cena: null, progresso: 0, carregando: false,
          // guarda a URL para o botão "abrir direto" — testa o arquivo fora do app
          erro: typeof fonte === 'string' ? { ...base, url } : base,
        })
      },
    )

    return () => {
      vivo = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [fonte])

  return estado
}

/**
 * Peças opcionais escolhidas (painel de LED, depósito em outra posição).
 *
 * O cache é por URL e guarda a promessa, não o resultado: dois grupos que
 * apontem para o mesmo arquivo — ou uma troca de ida e volta entre duas opções —
 * não baixam nada duas vezes. Cada uso recebe um clone, porque o mesmo
 * Object3D não pode estar em dois pontos da cena ao mesmo tempo; o clone do
 * three compartilha geometria e material, então o custo é só a hierarquia.
 */
const _cachePecas = new Map()

function pecaDoCache(url) {
  if (!_cachePecas.has(url)) {
    _cachePecas.set(url, carregarGLB(url).catch((e) => { _cachePecas.delete(url); throw e }))
  }
  return _cachePecas.get(url)
}

function usePecasExtras(extras) {
  const [prontas, setProntas] = useState([])

  // A assinatura evita recarregar quando o pai recria a lista com o mesmo
  // conteúdo — o que acontece a cada render, já que ela sai de um map().
  const chave = useMemo(
    () => (extras || []).map((e) => `${e.id}@${e.url}@${(e.offset || []).join(',')}`).join('|'),
    [extras],
  )

  useEffect(() => {
    if (!extras?.length) { setProntas([]); return }
    let vivo = true
    Promise.all((extras).map(async (e) => {
      try { return { ...e, objeto: (await pecaDoCache(e.url)).clone(true) } }
      catch { return null }   // peça que não carrega não pode derrubar a cena
    })).then((r) => { if (vivo) setProntas(r.filter(Boolean)) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])

  return prontas
}

/**
 * Enquadra a câmera no conteúdo assim que ele entra na cena.
 * Ignora o que estiver invisível: senão a cúpula de céu de 88 m que vem no
 * export do Enscape domina o enquadramento e o estande vira um ponto.
 */
function Enquadrar({ alvo, deps }) {
  const { camera, controls } = useThree()
  useEffect(() => {
    if (!alvo) return

    const caixa = new THREE.Box3()
    alvo.updateWorldMatrix(true, true)
    alvo.traverse((o) => {
      if (!o.isMesh || !o.visible) return
      // um pai invisível esconde a subárvore inteira
      for (let p = o.parent; p; p = p.parent) if (!p.visible) return
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
      caixa.union(new THREE.Box3().copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld))
    })
    if (caixa.isEmpty()) caixa.setFromObject(alvo)
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
 * Vistas prontas.
 *
 * Orbitar com o mouse é natural para quem usa 3D e nada óbvio para quem não
 * usa — e o expositor é justamente esse público. Estes botões levam a câmera a
 * enquadramentos que qualquer pessoa reconhece, calculados a partir da caixa do
 * próprio estande em vez de coordenadas fixas (que só valeriam para um arquivo).
 */
export const VISTAS = [
  { id: 'perspectiva', rotulo: 'Visão geral' },
  { id: 'frente', rotulo: 'De frente' },
  { id: 'dentro', rotulo: 'Por dentro' },
  { id: 'cima', rotulo: 'De cima' },
]

function IrParaVista({ vista, alvo, aoConcluir }) {
  const { camera, controls } = useThree()
  useEffect(() => {
    if (!vista || !alvo) return
    const caixa = new THREE.Box3()
    alvo.updateWorldMatrix(true, true)
    alvo.traverse((o) => {
      if (!o.isMesh || !o.visible) return
      for (let p = o.parent; p; p = p.parent) if (!p.visible) return
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
      caixa.union(new THREE.Box3().copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld))
    })
    if (caixa.isEmpty()) return

    const c = caixa.getCenter(new THREE.Vector3())
    const t = caixa.getSize(new THREE.Vector3())
    const raio = Math.max(t.x, t.y, t.z)
    const d = raio / Math.tan((camera.fov * Math.PI) / 360) * 0.95

    const pos = {
      perspectiva: [c.x + d * 0.62, c.y + d * 0.5, c.z + d * 0.72],
      frente:      [c.x, c.y + t.y * 0.12, c.z + d * 1.05],
      dentro:      [c.x, caixa.min.y + Math.min(1.6, t.y * 0.62), c.z + t.z * 0.28],
      cima:        [c.x + 0.001, c.y + d * 1.15, c.z + 0.001],
    }[vista] || null
    if (!pos) return

    const olhar = vista === 'dentro'
      ? new THREE.Vector3(c.x, caixa.min.y + t.y * 0.45, caixa.min.z)
      : c

    camera.position.set(...pos)
    camera.near = Math.max(0.05, d / 500); camera.far = d * 12
    camera.updateProjectionMatrix()
    if (controls) { controls.target.copy(olhar); controls.update() }
    aoConcluir?.()
  }, [vista, alvo, camera, controls, aoConcluir])
  return null
}

/**
 * Aplica realce por material: o que está selecionado recebe a cor do papel,
 * o resto perde saturação. Guarda o material original para restaurar depois.
 */
function useRealce(cena, { materialFoco, papeis, modo, mostrarIgnorados, indice, acabamentos, supFoco, objetos, objFoco, escondidos }) {
  // peças do objeto em foco, para acender só ele
  const pecasDoObj = useMemo(() => {
    if (!objFoco || !objetos) return null
    const o = objetos.find((x) => x.id === objFoco)
    return o ? new Set(o.pecas) : null
  }, [objFoco, objetos])

  useEffect(() => {
    if (!cena) return
    const criados = []
    const texturas = []

    cena.traverse((o) => {
      if (!o.isMesh) return
      if (!o.userData._matOrig) o.userData._matOrig = o.material
      if (o.userData._visOrig === undefined) o.userData._visOrig = o.visible

      const orig = o.userData._matOrig
      const nome = (Array.isArray(orig) ? orig[0] : orig)?.name || '(sem material)'
      const papel = papeis?.[nome]

      // chave estável da peça, calculada uma vez e guardada no próprio objeto
      if (!o.userData._chave) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
        const c = new THREE.Box3().copy(o.geometry.boundingBox)
          .applyMatrix4(o.matrixWorld).getCenter(new THREE.Vector3())
        o.userData._chave = chaveDaPeca(nome, c.toArray())
      }
      const sup = indice?.get(o.userData._chave)

      // O que foi marcado para descarte sai de cena de vez. Deixar semi-
      // transparente não resolve: a cúpula do Enscape envolve o estande inteiro
      // e continuaria por cima de tudo, inclusive no modo Original.
      //
      // Peça substituída por um complemento some pelo mesmo caminho: escolher o
      // depósito na ponta esquerda tem que tirar o do centro, senão ficam dois.
      const trocada = escondidos?.has(o.userData._chave)
      o.visible = (trocada || (papel === 'ignorar' && !mostrarIgnorados)) ? false : o.userData._visOrig

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

      // acabamento escolhido pelo expositor, por superfície
      const acab = sup && acabamentos?.[sup.id]
      if (acab && (acab.cor || acab.arte)) {
        const m = new THREE.MeshStandardMaterial({
          color: new THREE.Color(acab.cor || '#ffffff'),
          roughness: acab.brilho != null ? 1 - acab.brilho : 0.7,
          metalness: 0.02,
        })
        if (acab.arte) {
          const tex = new THREE.TextureLoader().load(acab.arte)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.flipY = false
          // a arte manda na cor: sem isso o tom da napa tinge a imagem
          m.map = tex; m.color.set('#ffffff')
          texturas.push(tex)
        }
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

      // realce do objeto selecionado — o que vai se mover
      if (pecasDoObj) {
        if (pecasDoObj.has(o.userData._chave)) {
          const m = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#f59e0b'), emissive: new THREE.Color('#b45309'),
            emissiveIntensity: 0.8, roughness: 0.4, toneMapped: false,
          })
          criados.push(m); usar = m
        } else {
          const m = new THREE.MeshStandardMaterial({
            color: '#1a2130', roughness: 0.95, transparent: true, opacity: 0.2, depthWrite: false,
          })
          criados.push(m); usar = m
        }
      }

      // realce da superfície selecionada, por cima de tudo
      if (supFoco) {
        if (sup?.id === supFoco) {
          const m = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#16e0a3'), emissive: new THREE.Color('#0b7a5c'),
            emissiveIntensity: 0.75, roughness: 0.4, toneMapped: false,
          })
          criados.push(m); usar = m
        } else if (!acab?.arte) {
          const m = new THREE.MeshStandardMaterial({
            color: '#1a2130', roughness: 0.95, transparent: true, opacity: 0.18, depthWrite: false,
          })
          criados.push(m); usar = m
        }
      }

      o.material = usar
    })

    return () => {
      cena.traverse((o) => {
        if (!o.isMesh) return
        if (o.userData._matOrig) o.material = o.userData._matOrig
        if (o.userData._visOrig !== undefined) o.visible = o.userData._visOrig
      })
      criados.forEach((m) => m.dispose())
      texturas.forEach((t) => t.dispose())
    }
  }, [cena, materialFoco, papeis, modo, mostrarIgnorados, indice, acabamentos, supFoco, pecasDoObj, escondidos])
}

/**
 * Aplica mover/girar por objeto.
 *
 * As peças de um objeto estão espalhadas pela hierarquia do arquivo, com pais
 * arbitrários. Em vez de recalcular matriz peça a peça, cada objeto ganha um
 * Group posicionado no seu ponto de apoio e as peças são levadas para ele com
 * attach(), que preserva a transformação em mundo. A partir daí mover e girar o
 * grupo move o objeto inteiro, e a rotação acontece em torno do próprio apoio —
 * não da origem da cena.
 */
function useTransformes(cena, objetos) {
  const grupos = useRef(new Map())

  // Assinatura só da ESTRUTURA. Sem isso os grupos seriam desmontados e
  // remontados a cada clique de mover, o que é caro e desnecessário: mudar a
  // posição não muda quais peças formam o objeto.
  const estrutura = useMemo(
    () => (objetos || []).map((o) => `${o.id}:${o.pecas.length}`).join('|'),
    [objetos],
  )

  useEffect(() => {
    if (!cena || !objetos?.length) return
    const criados = new Map()
    const porChave = new Map()
    for (const o of objetos) for (const c of o.pecas) porChave.set(c, o.id)

    const alvos = new Map()
    cena.updateWorldMatrix(true, true)
    cena.traverse((o) => {
      if (!o.isMesh) return
      // a chave normalmente já foi calculada pelo realce; recalcula se não
      if (!o.userData._chave) {
        const nome = (Array.isArray(o.material) ? o.material[0] : o.material)?.name || '(sem material)'
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox()
        const c = new THREE.Box3().copy(o.geometry.boundingBox)
          .applyMatrix4(o.matrixWorld).getCenter(new THREE.Vector3())
        o.userData._chave = chaveDaPeca(nome, c.toArray())
      }
      const id = porChave.get(o.userData._chave)
      if (!id) return
      if (!alvos.has(id)) alvos.set(id, [])
      alvos.get(id).push(o)
    })

    for (const obj of objetos) {
      const malhas = alvos.get(obj.id)
      if (!malhas?.length) continue
      const g = new THREE.Group()
      g.name = `obj:${obj.id}`
      g.position.set(...obj.apoio)
      cena.add(g)
      // attach preserva a posição em mundo de cada peça
      for (const m of malhas) {
        if (!m.userData._paiOrig) m.userData._paiOrig = m.parent
        g.attach(m)
      }
      criados.set(obj.id, g)
    }
    grupos.current = criados

    return () => {
      for (const g of criados.values()) {
        for (const m of [...g.children]) {
          const pai = m.userData._paiOrig
          if (pai) pai.attach(m)
        }
        g.removeFromParent()
      }
      grupos.current = new Map()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cena, estrutura])

  // aplica as transformações — barato, roda a cada ajuste
  useEffect(() => {
    if (!objetos) return
    for (const obj of objetos) {
      const g = grupos.current.get(obj.id)
      if (!g) continue
      const t = obj.transform || { dx: 0, dz: 0, rotY: 0 }
      g.position.set(obj.apoio[0] + (t.dx || 0), obj.apoio[1], obj.apoio[2] + (t.dz || 0))
      g.rotation.y = t.rotY || 0
    }
  }, [objetos])
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

export default function Viewer({
  cena, materialFoco, papeis, modo = 'original', recorte, altura = '100%', mostrarIgnorados = false,
  indice, acabamentos, supFoco, objetos, objFoco, vista, aoAplicarVista, mostrarRecorte = false,
  extras, escondidos,
}) {
  useRealce(cena, { materialFoco, papeis, modo, mostrarIgnorados, indice, acabamentos, supFoco, objetos, objFoco, escondidos })
  useTransformes(cena, objetos)
  const pecasExtras = usePecasExtras(extras)
  const chave = useMemo(() => cena?.uuid, [cena])
  // reenquadra quando o descarte muda o que está visível
  const nIgnorados = useMemo(
    () => Object.values(papeis || {}).filter((p) => p === 'ignorar').length,
    [papeis],
  )

  return (
    <Canvas
      shadows={false}
      dpr={[1, 1.75]}
      camera={{ position: [8, 6, 10], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      onCreated={({ gl }) => {
        // usado pela proposta em PDF para registrar o estande como ficou.
        // preserveDrawingBuffer acima é o que permite ler o canvas depois.
        window.__psfShot = () => { try { return gl.domElement.toDataURL('image/png') } catch { return null } }
      }}
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

      {/* Peças opcionais escolhidas. Ficam fora do realce e das transformações
          de propósito: são o objeto real que a montadora vai montar, com o
          acabamento que o projetista deu — não uma superfície a colorir. */}
      {pecasExtras.map((p) => (
        <primitive key={p.id} object={p.objeto} position={p.offset || [0, 0, 0]} />
      ))}

      {/* a caixa do recorte é ferramenta de mapeamento — o expositor não vê */}
      {mostrarRecorte && <CaixaRecorte recorte={recorte} />}
      <Enquadrar alvo={cena} deps={[chave, nIgnorados, mostrarIgnorados]} />
      <IrParaVista vista={vista} alvo={cena} aoConcluir={aoAplicarVista} />

      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.02} />
    </Canvas>
  )
}
