import * as THREE from 'three'
import { palette } from '../palette'

/**
 * Textura de grade (1 tile = 1 metro) desenhada em canvas. É o que dá
 * leitura de escala e profundidade ao cenário minimalista.
 */
function gridTexture(base: string, line: string, renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = line
  // Linha principal na borda do tile.
  ctx.lineWidth = 6
  ctx.strokeRect(0, 0, size, size)
  // Marca discreta no meio (meio metro).
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(size / 2, 0)
  ctx.lineTo(size / 2, size)
  ctx.moveTo(0, size / 2)
  ctx.lineTo(size, size / 2)
  ctx.stroke()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
  return tex
}

export interface Materials {
  floor: THREE.MeshStandardMaterial
  wall: THREE.MeshStandardMaterial
  structure: THREE.MeshStandardMaterial
  prop: THREE.MeshStandardMaterial
  dispose: () => void
}

export function createMaterials(renderer: THREE.WebGLRenderer): Materials {
  const floorTex = gridTexture(palette.floor, palette.floorLine, renderer)
  const wallTex = gridTexture(palette.wall, palette.wallLine, renderer)
  const floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 })
  const wall = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 })
  const structure = new THREE.MeshStandardMaterial({ color: palette.structure, roughness: 0.8 })
  const prop = new THREE.MeshStandardMaterial({ color: palette.accent, roughness: 0.6 })
  return {
    floor,
    wall,
    structure,
    prop,
    dispose() {
      for (const m of [floor, wall, structure, prop]) {
        m.map?.dispose()
        m.dispose()
      }
    },
  }
}

/**
 * BoxGeometry com UVs em metros (cada face usa as próprias dimensões),
 * para a grade não esticar em caixas de tamanhos diferentes.
 */
export function worldUvBox(w: number, h: number, d: number): THREE.BoxGeometry {
  const geo = new THREE.BoxGeometry(w, h, d)
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute
  // Ordem das faces no BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada).
  const faceDims: [number, number][] = [
    [d, h],
    [d, h],
    [w, d],
    [w, d],
    [w, h],
    [w, h],
  ]
  for (let face = 0; face < 6; face++) {
    const [su, sv] = faceDims[face]
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv)
    }
  }
  uv.needsUpdate = true
  return geo
}
