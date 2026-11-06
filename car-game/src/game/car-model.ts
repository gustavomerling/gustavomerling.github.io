import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/**
 * Carroceria de carro (só visual): caixa arredondada, cabine de vidro com teto pintado,
 * para-choques, faróis na frente (+z) e lanternas atrás. Geometrias unitárias compartilhadas
 * num "kit" e escaladas por carro, para dezenas de carros parados custarem pouco.
 */
export type CarKit = {
  body: THREE.BufferGeometry
  box: THREE.BufferGeometry
  glass: THREE.Material
  trim: THREE.Material
  headOff: THREE.Material
  tailOff: THREE.Material
  dispose: () => void
}

export function createCarKit(): CarKit {
  const body = new RoundedBoxGeometry(1, 1, 1, 2, 0.08)
  const box = new THREE.BoxGeometry(1, 1, 1)
  // Vidro escuro, com pouco reflexo do ambiente: antes refletia as luzes do estúdio e estourava no bloom
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0d151c,
    roughness: 0.18,
    metalness: 0,
    clearcoat: 0.6,
    envMapIntensity: 0.35,
  })
  const trim = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.7 })
  const headOff = new THREE.MeshStandardMaterial({ color: 0x8d9198, roughness: 0.45, metalness: 0 })
  const tailOff = new THREE.MeshStandardMaterial({ color: 0x5a0d0d, emissive: 0x3a0000, roughness: 0.4 })
  return {
    body,
    box,
    glass,
    trim,
    headOff,
    tailOff,
    dispose: () => {
      body.dispose()
      box.dispose()
      glass.dispose()
      trim.dispose()
      headOff.dispose()
      tailOff.dispose()
    },
  }
}

export type CarLights = {
  head: THREE.Material
  tail: THREE.Material
  reverse: THREE.Material
}

/**
 * Monta a carroceria centrada na origem: corpo de -hy a +hy em y, frente em +z.
 * `lights` troca os materiais de farol/lanterna (o carro do jogador acende e apaga os seus).
 */
export function buildCarBody(
  kit: CarKit,
  paint: THREE.Material,
  hx: number,
  hy: number,
  hz: number,
  lights?: CarLights,
): THREE.Group {
  const g = new THREE.Group()
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat)
    m.scale.set(sx, sy, sz)
    m.position.set(x, y, z)
    m.castShadow = true
    m.receiveShadow = true
    g.add(m)
    return m
  }

  // Corpo e cabine (vidro) com teto pintado, um pouco recuada como num sedã/hatch
  part(kit.body, paint, hx * 2, hy * 2, hz * 2, 0, 0, 0)
  const cabW = hx * 1.7
  const cabL = hz * 1.05
  const cabZ = -hz * 0.12
  part(kit.body, kit.glass, cabW, 0.5, cabL, 0, hy + 0.2, cabZ)
  part(kit.body, paint, cabW * 0.96, 0.08, cabL * 0.82, 0, hy + 0.47, cabZ - 0.04)

  // Para-choques escuros na frente e atrás
  part(kit.box, kit.trim, hx * 2 + 0.04, 0.18, 0.16, 0, -hy + 0.16, hz - 0.04)
  part(kit.box, kit.trim, hx * 2 + 0.04, 0.18, 0.16, 0, -hy + 0.16, -hz + 0.04)

  // Faróis e lanternas: a frente e a traseira ficam evidentes de qualquer ângulo
  const head = lights?.head ?? kit.headOff
  const tail = lights?.tail ?? kit.tailOff
  const lampY = hy * 0.35
  for (const sx of [-1, 1]) {
    part(kit.box, head, 0.38, 0.14, 0.06, sx * (hx - 0.38), lampY, hz)
    part(kit.box, tail, 0.38, 0.14, 0.06, sx * (hx - 0.36), lampY, -hz)
  }
  if (lights) part(kit.box, lights.reverse, 0.22, 0.1, 0.05, 0, lampY, -hz - 0.005)
  return g
}
