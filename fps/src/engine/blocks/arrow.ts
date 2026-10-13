import * as THREE from 'three'
import { texture } from '../textures.ts'
import type { BlockType } from './types.ts'

const DEFAULT_COLOR = 0x52d1ff

/** Glowing chevrons painted on a surface, pointing the way (`rotation` 0 = +x). */
export const arrowBlock: BlockType = {
  id: 'arrow',
  label: 'Seta',
  kind: 'decor',
  build({ def, size, center }) {
    const group = new THREE.Group()
    group.position.copy(center)
    group.rotation.y = def.rotation ?? 0

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x, size.z),
      new THREE.MeshBasicMaterial({
        map: texture('chevron'),
        color: def.color ?? DEFAULT_COLOR,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    )
    plane.rotation.x = -Math.PI / 2
    // The engine fades meshes tagged `glow` in and out.
    plane.userData.glow = true
    group.add(plane)
    return group
  },
}
