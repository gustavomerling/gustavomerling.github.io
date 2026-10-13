import * as THREE from 'three'
import { boxGeometry, texture } from '../textures.ts'
import { addEdges } from './edges.ts'
import type { BlockType } from './types.ts'

const DEFAULT_COLOR = 0xff4d4d

export const hazardBlock: BlockType = {
  id: 'hazard',
  label: 'Perigo',
  kind: 'hazard',
  build({ def, size, center }) {
    const color = def.color ?? DEFAULT_COLOR
    const mesh = new THREE.Mesh(
      boxGeometry(size, 1),
      new THREE.MeshStandardMaterial({
        color,
        map: texture('hazard'),
        emissive: 0xff2020,
        emissiveMap: texture('hazard'),
        emissiveIntensity: 0.8,
        roughness: 0.55,
      }),
    )
    mesh.position.copy(center)
    mesh.castShadow = true
    // The engine makes the glow of meshes tagged `pulse` throb.
    mesh.userData.pulse = true
    addEdges(mesh, color, 0.5, 0.9)
    return mesh
  },
}
