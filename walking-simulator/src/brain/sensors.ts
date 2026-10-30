import { surfaceY } from '../physics/ground'
import { FIXED_DT, type World } from '../physics/world'

// Frequências dos relógios senoidais que ajudam a gerar ritmo (passos lentos, normais e rápidos).
const CLOCKS_HZ = [0.5, 1, 2]

// Quanto à frente do corpo o cérebro "olha" o terreno (px).
const LOOK_AHEAD = 40

// Quantidade de entradas do cérebro para um mundo: ângulo de cada osso, contato de cada ponto
// com o chão, velocidade média do corpo (x, y), o relógio (seno e cosseno), a inclinação do terreno
// logo à frente e a altura do corpo acima do chão.
export function sensorCount(world: World): number {
  return world.bones.length + world.particles.length + 2 + 2 * CLOCKS_HZ.length + 2
}

// Preenche `out` com os sensores atuais, todos aproximadamente em [-1, 1].
export function readSensors(world: World, out: Float32Array): Float32Array {
  let k = 0
  for (const bone of world.bones) {
    out[k++] = Math.atan2(bone.b.pos.y - bone.a.pos.y, bone.b.pos.x - bone.a.pos.x) / Math.PI
  }
  let vx = 0
  let vy = 0
  for (const p of world.particles) {
    out[k++] = world.ground && p.pos.y >= surfaceY(world.ground, p.pos.x) - 1 ? 1 : 0
    vx += p.pos.x - p.prev.x
    vy += p.pos.y - p.prev.y
  }
  const n = Math.max(1, world.particles.length)
  // Deslocamento por passo em px; 10 px/passo (600 px/s) satura o sensor.
  out[k++] = Math.max(-1, Math.min(1, vx / n / 10))
  out[k++] = Math.max(-1, Math.min(1, vy / n / 10))
  for (const hz of CLOCKS_HZ) {
    const phase = 2 * Math.PI * hz * world.steps * FIXED_DT
    out[k++] = Math.sin(phase)
    out[k++] = Math.cos(phase)
  }
  // Terreno: subida (positivo) ou descida à frente e altura do centro do corpo acima do chão.
  let cx = 0
  let cy = 0
  for (const p of world.particles) {
    cx += p.pos.x
    cy += p.pos.y
  }
  cx /= n
  cy /= n
  const ground = world.ground
  const under = ground ? surfaceY(ground, cx) : cy
  const ahead = ground ? surfaceY(ground, cx + LOOK_AHEAD) : under
  out[k++] = Math.max(-1, Math.min(1, (under - ahead) / 20))
  out[k++] = Math.max(-1, Math.min(1, (under - cy) / 100))
  return out
}
