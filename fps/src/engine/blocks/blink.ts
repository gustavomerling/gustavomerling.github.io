import * as THREE from 'three'
import { boxGeometry, texture } from '../textures.ts'
import { addEdges } from './edges.ts'
import type { BlockType } from './types.ts'

const DEFAULT_COLOR = 0x52d1ff

/** Energy platform that switches on and off on a timer (`blink`, see Gimmicks). */
export const blinkBlock: BlockType = {
  id: 'blink',
  label: 'Plataforma de energia',
  kind: 'solid',
  special: 'blink',
  build({ def, size, center }) {
    const color = def.color ?? DEFAULT_COLOR
    const mesh = new THREE.Mesh(
      boxGeometry(size, 2),
      new THREE.MeshStandardMaterial({
        color,
        map: texture('grid'),
        emissive: color,
        emissiveMap: texture('grid'),
        emissiveIntensity: 1.1,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
      }),
    )
    mesh.position.copy(center)
    mesh.receiveShadow = true
    addEdges(mesh, color, 0.6, 1)
    return mesh
  },
}
