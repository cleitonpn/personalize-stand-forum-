import * as THREE from 'three'
let renderer
const cache = new Map()

/** Um único contexto WebGL para todos os cartões, sem animações em segundo plano. */
export function miniatura(objeto, chaves, chave) {
  if (cache.has(chave)) return cache.get(chave)
  if (!renderer) renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false, preserveDrawingBuffer:true })
  renderer.setSize(240,160,false)
  renderer.setPixelRatio(1)
  const cena = new THREE.Scene(); cena.background = new THREE.Color('#56647d')
  const grupo = new THREE.Group()
  const ids = chaves && new Set(chaves)
  objeto.updateWorldMatrix(true,true)
  objeto.traverse(m => {
    if (!m.isMesh || (ids && !ids.has(m.userData._chave))) return
    const clone = m.clone(false)
    clone.matrix.copy(m.matrixWorld); clone.matrix.decompose(clone.position,clone.quaternion,clone.scale)
    clone.visible = true; grupo.add(clone)
  })
  const caixa = new THREE.Box3().setFromObject(grupo)
  if (caixa.isEmpty()) return null
  const c = caixa.getCenter(new THREE.Vector3()), tamanho = caixa.getSize(new THREE.Vector3())
  grupo.position.sub(c); cena.add(grupo)
  cena.add(new THREE.HemisphereLight('#ffffff','#8894a7',2))
  const luz = new THREE.DirectionalLight('#ffffff',3); luz.position.set(3,5,4); cena.add(luz)
  const camera = new THREE.PerspectiveCamera(40,1.5,0.01,1000)
  const d = tamanho.length()*1.5 || 2
  camera.position.set(d*.55,d*.35,d*.75);camera.lookAt(0,0,0)
  renderer.render(cena,camera)
  const url = renderer.domElement.toDataURL('image/jpeg',.8)
  // Limita o cache a cartões, sem guardar cenas nem dados dos arquivos.
  if (cache.size > 180) cache.delete(cache.keys().next().value)
  cache.set(chave,url)
  return url
}
