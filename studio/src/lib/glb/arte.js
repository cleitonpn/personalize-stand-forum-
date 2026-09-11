// ============================================================================
//  Arte do expositor sobre a geometria do projeto.
//
//  O arquivo do projetista não foi feito para receber imagem: a maior parte das
//  peças vem sem UV nenhuma, e as que têm vêm com a escala de repetição do
//  SketchUp. Então a UV para a arte é gerada aqui, na hora.
// ============================================================================

import * as THREE from 'three'

/**
 * Gera UV plana para a peça receber a arte inteira, uma vez só.
 *
 * Sem isso a arte não aparece — e os dois motivos estão no arquivo real do
 * projetista. As peças de logo e as paredes vêm SEM nenhuma UV, e textura em
 * geometria sem UV não desenha nada. As que têm UV vêm com a escala do
 * SketchUp, que repete o material pela superfície: o carpete vai de -12 a 12, a
 * madeira de -152 a 152. Aplicar a arte nessa UV a repetiria dezenas de vezes,
 * o que também não é "a arte na parede".
 *
 * A projeção usa os dois maiores eixos da peça, que são os que formam a face
 * impressa. Qual deles é a VERTICAL só se descobre olhando a matriz de mundo:
 * o export converte de Z-para-cima para Y-para-cima girando a raiz da cena, e
 * dentro da geometria o eixo vertical continua sendo o Z. Assumir Y punha a arte
 * de cabeça para baixo em toda peça exportada assim.
 */
export function uvPlanar(geo, matrizMundo) {
  if (geo.userData._uvPlanar) return geo.userData._uvPlanar

  if (!geo.boundingBox) geo.computeBoundingBox()
  const bb = geo.boundingBox
  const pos = geo.getAttribute('position')
  if (!pos) return null

  const min = [bb.min.x, bb.min.y, bb.min.z]
  const tam = [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z]
  const ordem = [0, 1, 2].sort((a, b) => tam[b] - tam[a]).slice(0, 2)

  // Qual eixo local aponta para cima no mundo, e em que sentido.
  const rot = new THREE.Matrix3().setFromMatrix4(matrizMundo || new THREE.Matrix4())
  const escala = [0, 1, 2].map((i) => {
    const v = new THREE.Vector3(i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0).applyMatrix3(rot)
    return { comprimento: v.length() || 1, paraCima: v.normalize().y }
  })
  let vertical = -1, sentido = 1, maior = 0.5
  for (const i of [0, 1, 2]) {
    if (Math.abs(escala[i].paraCima) > maior) {
      maior = Math.abs(escala[i].paraCima); vertical = i; sentido = Math.sign(escala[i].paraCima)
    }
  }

  let eu, ev, inverterV
  if (ordem.includes(vertical)) {
    ev = vertical
    eu = ordem.find((e) => e !== vertical)
    // V zero é o topo da imagem em glTF. Se o eixo cresce para cima, o topo da
    // peça está no valor alto e precisa virar zero; se cresce para baixo, já está.
    inverterV = sentido > 0
  } else {
    // face deitada (piso, tampo): não há "em pé", qualquer orientação é válida
    eu = ordem[0]; ev = ordem[1]; inverterV = false
  }

  const du = tam[eu] || 1, dv = tam[ev] || 1
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)]
    const u = (p[eu] - min[eu]) / du
    let v = (p[ev] - min[ev]) / dv
    if (inverterV) v = 1 - v
    uv[i * 2] = u; uv[i * 2 + 1] = v
  }

  geo.userData._uvPlanar = {
    attr: new THREE.BufferAttribute(uv, 2),
    // proporção medida em metros de mundo, não em unidades locais
    proporcao: (du * escala[eu].comprimento) / ((dv * escala[ev].comprimento) || 1),
  }
  return geo.userData._uvPlanar
}

/**
 * Encaixa a imagem na superfície sem deformá-la.
 *
 * Esticar para preencher é o que a impressão de lona faz, mas destrói um logo —
 * e logo é justamente o caso mais comum. A imagem entra inteira, centralizada, e
 * o que sobra fica com a cor escolhida.
 */
export function encaixar(tex, proporcaoSuperficie) {
  const img = tex.image
  if (!img?.width || !img?.height) return
  const daImagem = img.width / img.height
  if (daImagem > proporcaoSuperficie) {
    const f = proporcaoSuperficie / daImagem
    tex.repeat.set(1, 1 / f); tex.offset.set(0, -(1 - f) / (2 * f))
  } else {
    const f = daImagem / proporcaoSuperficie
    tex.repeat.set(1 / f, 1); tex.offset.set(-(1 - f) / (2 * f), 0)
  }
  tex.needsUpdate = true
}
