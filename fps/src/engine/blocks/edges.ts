import * as THREE from 'three'

const WHITE = new THREE.Color(0xffffff)

/**
 * Thin outline along a block's edges, a lighter shade of its color. Blocks of
 * similar colors stay readable against each other, which matters when judging jumps.
 */
export function addEdges(mesh: THREE.Mesh, color: number, strength = 0.35, opacity = 0.5) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({
      color: new THREE.Color(color).lerp(WHITE, strength),
      transparent: true,
      opacity,
    }),
  )
  mesh.add(edges)
}
