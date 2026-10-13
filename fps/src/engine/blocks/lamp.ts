import * as THREE from 'three'
import { texture } from '../textures.ts'
import type { BlockType } from './types.ts'

const DEFAULT_COLOR = 0xffc978

/**
 * Lamp post: a thin post with a glowing bulb. The glow is a sprite, not a real
 * light, so a level can have many of them without slowing the renderer down.
 * `size[1]` is the post height; `y` is its center, as for any block.
 */
export const lampBlock: BlockType = {
  id: 'lamp',
  label: 'Poste',
  kind: 'decor',
  build({ def, size, center }) {
    const color = def.color ?? DEFAULT_COLOR
    const group = new THREE.Group()
    group.position.copy(center)

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.07, size.y, 8),
      new THREE.MeshStandardMaterial({ color: 0x2b313a, roughness: 0.5, metalness: 0.6 }),
    )
    post.castShadow = true
    group.add(post)

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color }))
    bulb.position.y = size.y / 2 + 0.06
    group.add(bulb)

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: texture('glow'),
        color,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    glow.scale.setScalar(1.6)
    glow.position.y = bulb.position.y
    group.add(glow)
    return group
  },
}
