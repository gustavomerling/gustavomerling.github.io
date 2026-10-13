import * as THREE from 'three'
import { texture } from '../textures.ts'
import { addEdges } from './edges.ts'
import type { BlockType } from './types.ts'

const DEFAULT_COLOR = 0x4dffb0

/** Trampoline: landing on it throws the player up by `power` (see Gimmicks). */
export const bounceBlock: BlockType = {
  id: 'bounce',
  label: 'Trampolim',
  kind: 'solid',
  special: 'bounce',
  build({ def, size, center }) {
    const color = def.color ?? DEFAULT_COLOR
    const side = new THREE.MeshStandardMaterial({ color: 0x2c333d, roughness: 0.6, metalness: 0.4 })
    const top = new THREE.MeshStandardMaterial({
      color,
      map: texture('pad'),
      emissive: color,
      emissiveMap: texture('pad'),
      emissiveIntensity: 0.8,
      roughness: 0.4,
    })
    // Faces: +x, -x, +y (top), -y, +z, -z.
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), [side, side, top, side, side, side])
    mesh.position.copy(center)
    mesh.castShadow = true
    mesh.receiveShadow = true
    addEdges(mesh, color, 0.4, 0.9)
    return mesh
  },
}
