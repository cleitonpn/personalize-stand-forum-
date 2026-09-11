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
import GizmoObjeto from './GizmoObjeto.jsx'
import { uvPlanar, encaixar } from '../lib/glb/arte.js'

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

function IrParaVista({ vista, alvo, recorte, aoConcluir }) {
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

    // A vista de cima é a de trabalhar: precisa mostrar o estande contratado, e
    // não o arquivo inteiro. Num projeto espelhado, enquadrar a cena toda deixa
    // o estande ocupando metade da tela e a cópia ocupando a outra metade.
    if (recorte) {
      caixa.min.x = Math.min(recorte.x0, recorte.x1); caixa.max.x = Math.max(recorte.x0, recorte.x1)
      caixa.min.z = Math.min(recorte.z0, recorte.z1); caixa.max.z = Math.max(recorte.z0, recorte.z1)
    }

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
  }, [vista, alvo, camera, controls, recorte, aoConcluir])
  return null
}

/**
 * Material derivado do original, em vez de um material novo em folha.
 *
 * Construir um MeshStandardMaterial do zero jogava fora o `side` do arquivo — e
 * TODO material que vem do SketchUp é DoubleSide. Uma face de carpete cujo lado
 * visível aponta para baixo virava invisível por cima, então trocar a cor do
 * piso não mudava nada na tela. Clonar preserva lado, transparência e o que mais
 * o projetista definiu; só sobrescrevemos o que a personalização manda.
 */
function derivar(orig, props) {
  const base = Array.isArray(orig) ? orig[0] : orig
  const m = base?.isMaterial ? base.clone() : new THREE.MeshStandardMaterial()
  if (!base?.isMaterial) m.side = THREE.DoubleSide
  // mapas do projeto original não sobrevivem à personalização: eles foram feitos
  // para as UVs originais, e a arte reprojeta as UVs
  m.map = null; m.normalMap = null; m.roughnessMap = null
  m.metalnessMap = null; m.aoMap = null; m.emissiveMap = null
  m.emissive?.set('#000000')
  Object.assign(m, props)
  if (props?.color != null) m.color = new THREE.Color(props.color)
  if (props?.emissive != null) m.emissive = new THREE.Color(props.emissive)
  return m
}

/**
 * Aplica realce por material: o que está selecionado recebe a cor do papel,
 * o resto perde saturação. Guarda o material original para restaurar depois.
 */
function useRealce(cena, { materialFoco, papeis, modo, mostrarIgnorados, indice, acabamentos, supFoco, objetos, objFoco, escondidos, realceSuave }) {
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
    // geometria → UV original, para devolver o arquivo ao estado em que veio
    const geometrias = new Map()

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
        const m = derivar(orig, {
          color: PAPEIS[papel]?.hex || '#888',
          roughness: 0.65, metalness: 0.05, transparent: true, opacity: 0.95,
        })
        criados.push(m); usar = m
      } else if (modo === 'papeis' && papel === 'ignorar') {
        const m = derivar(orig, {
          color: '#8894ac', roughness: 0.9, transparent: true, opacity: 0.14, depthWrite: false,
        })
        criados.push(m); usar = m
      }

      // acabamento escolhido pelo expositor, por superfície
      const acab = sup && acabamentos?.[sup.id]
      if (acab && (acab.cor || acab.arte)) {
        const m = derivar(orig, {
          color: acab.cor || '#f2f2ee',
          roughness: acab.brilho != null ? 1 - acab.brilho : 0.75,
          metalness: 0.02,
        })
        if (acab.arte) {
          const plano = uvPlanar(o.geometry, o.matrixWorld)
          if (plano) {
            if (!geometrias.has(o.geometry)) geometrias.set(o.geometry, o.geometry.getAttribute('uv') || null)
            o.geometry.setAttribute('uv', plano.attr)
          }
          const tex = new THREE.TextureLoader().load(acab.arte, (t) => {
            if (plano) encaixar(t, plano.proporcao)
          })
          tex.colorSpace = THREE.SRGBColorSpace
          tex.flipY = false
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
          // a arte manda na cor: sem isso o tom da napa tinge a imagem
          m.map = tex
          m.transparent = true          // logo em PNG mostra a cor por baixo
          texturas.push(tex)
        }
        criados.push(m); usar = m
      }

      if (materialFoco) {
        if (nome === materialFoco) {
          const m = derivar(orig, {
            color: '#22d3ee', emissive: '#0891b2',
            emissiveIntensity: 0.7, roughness: 0.4, toneMapped: false,
          })
          criados.push(m); usar = m
        } else {
          const m = derivar(orig, {
            color: '#aab6cc', roughness: 0.95, transparent: true, opacity: 0.2, depthWrite: false,
          })
          criados.push(m); usar = m
        }
      }

      // realce do objeto selecionado — o que vai se mover
      if (pecasDoObj) {
        if (pecasDoObj.has(o.userData._chave)) {
          const m = derivar(orig, {
            color: '#f59e0b', emissive: '#b45309',
            emissiveIntensity: 0.8, roughness: 0.4, toneMapped: false,
          })
          criados.push(m); usar = m
        } else if (!realceSuave) {
          // No mapeamento, apagar o resto ajuda a conferir a detecção. Na tela do
          // expositor atrapalha: quem está posicionando uma banqueta precisa ver
          // o balcão e as paredes para saber ONDE está pondo. Lá só a peça acende.
          const m = derivar(orig, {
            color: '#aab6cc', roughness: 0.95, transparent: true, opacity: 0.22, depthWrite: false,
          })
          criados.push(m); usar = m
        }
      }

      // Realce da superfície apontada. Não pode SUBSTITUIR o acabamento: o
      // cartão fica embaixo do cursor na hora de clicar a cor, então pintar a
      // peça de verde escondia justamente o resultado da escolha — clicava-se
      // vermelho e via-se verde. Com acabamento aplicado o realce só acende por
      // cima; sem acabamento, aí sim pinta de verde para localizar a peça.
      if (supFoco) {
        if (sup?.id === supFoco) {
          const m = acab && (acab.cor || acab.arte)
            ? Object.assign(usar.clone(), {
                emissive: new THREE.Color('#0b7a5c'), emissiveIntensity: 0.45,
              })
            : derivar(orig, {
                color: '#16e0a3', emissive: '#0b7a5c',
                emissiveIntensity: 0.75, roughness: 0.4, toneMapped: false,
              })
          criados.push(m); usar = m
        } else if (!acab?.arte && !acab?.cor) {
          const m = derivar(orig, {
            color: '#aab6cc', roughness: 0.95, transparent: true, opacity: 0.22, depthWrite: false,
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
      for (const [geo, uvOrig] of geometrias) {
        if (uvOrig) geo.setAttribute('uv', uvOrig)
        else geo.deleteAttribute('uv')
      }
      criados.forEach((m) => m.dispose())
      texturas.forEach((t) => t.dispose())
    }
  }, [cena, materialFoco, papeis, modo, mostrarIgnorados, indice, acabamentos, supFoco, pecasDoObj, escondidos, realceSuave])
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

/**
 * Exposição da cena, sob controle de quem está olhando.
 *
 * Quanto de luz é "certo" depende do projeto: um estande de bagum preto e um de
 * laminado branco pedem exposições diferentes, e eu não tenho como acertar os
 * dois com um número fixo. Fica no navegador de quem usa, lembrado entre
 * sessões, em vez de virar uma sequência de tentativas minhas.
 */
function Exposicao({ valor }) {
  const { gl, invalidate } = useThree()
  useEffect(() => {
    gl.toneMappingExposure = valor
    invalidate()
  }, [gl, valor, invalidate])
  return null
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
  extras, escondidos, objSel, aoTransformarObjeto, limitesGizmo, realceSuave = false,
}) {
  useRealce(cena, { materialFoco, papeis, modo, mostrarIgnorados, indice, acabamentos, supFoco, objetos, objFoco, escondidos, realceSuave })
  useTransformes(cena, objetos)
  const pecasExtras = usePecasExtras(extras)

  const [exposicao, setExposicao] = useState(() => {
    const salvo = Number(localStorage.getItem('psf.exposicao'))
    return salvo > 0 ? salvo : 0.75
  })
  const mudarExposicao = (v) => {
    setExposicao(v)
    try { localStorage.setItem('psf.exposicao', String(v)) } catch { /* modo privado */ }
  }
  // objeto sob manipulação direta — só existe na tela do expositor
  const alvoGizmo = useMemo(
    () => (objSel ? (objetos || []).find((o) => o.id === objSel && (o.podeMover || o.podeGirar)) : null),
    [objSel, objetos],
  )
  const chave = useMemo(() => cena?.uuid, [cena])
  // reenquadra quando o descarte muda o que está visível
  const nIgnorados = useMemo(
    () => Object.values(papeis || {}).filter((p) => p === 'ignorar').length,
    [papeis],
  )

  return (
    <div style={{ position: 'relative', height: altura, width: '100%', background: 'var(--cena-fundo)' }}>
    <Canvas
      shadows={false}
      dpr={[1, 1.75]}
      camera={{ position: [8, 6, 10], fov: 45 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.95 }}
      onCreated={({ gl }) => {
        // Usado pela proposta em PDF para registrar o estande como ficou.
        // preserveDrawingBuffer acima é o que permite ler o canvas depois.
        //
        // O canvas agora é transparente (o fundo é o degradê em CSS), então a
        // imagem crua sairia com fundo vazio na proposta. Compõe sobre um tom
        // sólido antes de entregar.
        window.__psfShot = () => {
          try {
            const fonte = gl.domElement
            const alvo = document.createElement('canvas')
            alvo.width = fonte.width; alvo.height = fonte.height
            const ctx = alvo.getContext('2d')
            ctx.fillStyle = '#5d6b8b'
            ctx.fillRect(0, 0, alvo.width, alvo.height)
            ctx.drawImage(fonte, 0, 0)
            return alvo.toDataURL('image/png')
          } catch { return null }
        }
      }}
      style={{ height: '100%', width: '100%', background: 'transparent' }}
    >
      {/* Estúdio claro. O estande é quase todo preto, cinza e madeira escura —
          sobre fundo escuro ele simplesmente some, e era preciso forçar a vista
          para enxergar o que se está configurando. Sobre fundo claro a peça
          aparece, que é a única coisa que importa nesta tela. */}
      <color attach="background" args={['#e9edf4']} />
      {/* A exposição é a do arquivo original — quem estava errado era só o fundo.
          Ao clarear o fundo eu também subi a luz, e aí estourou: o branco da
          testeira e do vidro virou papel em branco. Fundo claro não pede mais
          luz, pede o mesmo modelo sobre um fundo que não o engole. */}
      <hemisphereLight args={['#ffffff', '#c2cddd', 0.9]} />
      <directionalLight position={[9, 14, 7]} intensity={1.5} />
      <directionalLight position={[-8, 7, -6]} intensity={0.5} color="#dfe9ff" />

      {/* Ambiente montado com Lightformers locais. Um preset do drei baixaria um
          HDR de CDN externo — quebra offline e em rede restrita. */}
      <Environment resolution={256} frames={1} background={false}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 8, 8]} scale={[16, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#cfe0ff" position={[-10, 4, 4]} rotation={[0, Math.PI / 3, 0]} scale={[8, 10, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#e6f0ff" position={[10, 4, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[8, 10, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 5, -10]} scale={[12, 8, 1]} />
      </Environment>

      <Grid
        args={[60, 60]} cellSize={1} cellThickness={0.55} cellColor="#7a88a6"
        sectionSize={5} sectionThickness={1} sectionColor="#98a5c0"
        infiniteGrid fadeDistance={60} fadeStrength={1.8} followCamera={false}
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
      {alvoGizmo && aoTransformarObjeto && (
        <GizmoObjeto obj={alvoGizmo} limites={limitesGizmo}
          aoTransformar={(patch) => aoTransformarObjeto(alvoGizmo.id, patch)} />
      )}

      <Enquadrar alvo={cena} deps={[chave, nIgnorados, mostrarIgnorados]} />
      <IrParaVista vista={vista} alvo={cena} recorte={recorte} aoConcluir={aoAplicarVista} />

      <Exposicao valor={exposicao} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.02} />
    </Canvas>

    {/* controle de brilho, canto inferior direito do 3D */}
    <div style={{
      position: 'absolute', right: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 9,
      padding: '7px 12px', borderRadius: 99, background: 'rgba(12,18,30,.82)',
      backdropFilter: 'blur(10px)', border: '1px solid var(--line)',
    }}>
      <span style={{ fontSize: 13, opacity: .8 }} title="Brilho da cena">☀</span>
      <input type="range" min="0.35" max="1.4" step="0.05" value={exposicao}
        onChange={(e) => mudarExposicao(Number(e.target.value))}
        title="Brilho da cena"
        style={{ width: 96, accentColor: 'var(--brand-green)', cursor: 'pointer' }} />
      <span className="dim mono" style={{ fontSize: 11, minWidth: 26, textAlign: 'right' }}>
        {Math.round(exposicao * 100)}
      </span>
    </div>
    </div>
  )
}
