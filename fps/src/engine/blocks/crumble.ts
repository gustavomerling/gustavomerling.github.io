import * as THREE from 'three'
import { boxGeometry, texture } from '../textures.ts'
import { addEdges } from './edges.ts'
import type { BlockType } from './types.ts'

const DEFAULT_COLOR = 0xc9a27c

/** Cracked slab: shakes when stepped on, then falls and comes back later (see Gimmicks). */
export const crumbleBlock: BlockType = {
  id: 'crumble',
  label: 'Piso frágil',
  kind: 'solid',
  special: 'crumble',
  build({ def, size, center }) {
    const color = def.color ?? DEFAULT_COLOR
    const mesh = new THREE.Mesh(
      boxGeometry(size, 1.6),
      new THREE.MeshStandardMaterial({
        color,
        map: texture('cracked'),
        bumpMap: texture('cracked', 'data'),
        bumpScale: 2,
        roughness: 0.95,
        transparent: true,
      }),
    )
    mesh.position.copy(center)
    mesh.castShadow = true
    mesh.receiveShadow = true
    addEdges(mesh, color, 0.3, 0.5)
    return mesh
  },
}
