import * as THREE from 'three'
import { boxGeometry, texture } from '../textures.ts'
import { addEdges } from './edges.ts'
import type { BlockType } from './types.ts'

const DEFAULT_COLOR = 0x8d99ae

export const solidBlock: BlockType = {
  id: 'solid',
  label: 'Bloco',
  kind: 'solid',
  build({ def, size, center, moving }) {
    const color = def.color ?? DEFAULT_COLOR
    // Static blocks are stone; moving ones are machined metal that glows a little.
    const surface = moving ? 'metal' : 'stone'
    const mesh = new THREE.Mesh(
      boxGeometry(size),
      new THREE.MeshStandardMaterial({
        color,
        map: texture(surface),
        bumpMap: texture(surface, 'data'),
        bumpScale: 1.5,
        roughness: moving ? 0.45 : 0.9,
        metalness: moving ? 0.4 : 0.02,
        emissive: moving ? color : 0x000000,
        emissiveIntensity: moving ? 0.14 : 0,
      }),
    )
    mesh.position.copy(center)
    mesh.castShadow = true
    mesh.receiveShadow = true
    addEdges(mesh, color, moving ? 0.6 : 0.3, moving ? 0.9 : 0.35)
    return mesh
  },
}
