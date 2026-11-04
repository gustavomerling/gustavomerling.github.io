/**
 * Testes headless do zumbi (sem navegador). Rodar com:
 *   npx rolldown tests/zombie.headless.ts -p node -f esm -o .tmp/zombie.test.mjs
 *   node .tmp/zombie.test.mjs
 * Usa Rapier real + Npc/ZombieBrain reais, chão plano e um "jogador" falso.
 */
import * as THREE from 'three'
import { initPhysics, Physics, RAPIER } from '../src/game/engine/physics'
import { NPC_CONFIGS } from '../src/game/npc/types'
import { Npc } from '../src/game/npc/Npc'
import { ZombieBrain, ZOMBIE } from '../src/game/npc/ZombieBrain'
import type { PlayerInfo } from '../src/game/npc/Brain'
import type { PartName } from '../src/game/npc/skeleton'

// Stub mínimo de canvas para as texturas do manequim.
const ctx2d = new Proxy({}, { get: () => () => {}, set: () => true })
;(globalThis as any).document = { createElement: () => ({ getContext: () => ctx2d, width: 0, height: 0 }) }

const DT = 1 / 60
let failed = 0
const check = (name: string, ok: boolean, info = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? '  (' + info + ')' : ''}`)
}

async function scenario(playerPos = new THREE.Vector3(0, 0, 0), zombiePos = new THREE.Vector3(0, 0, 8)) {
  await initPhysics()
  const physics = new Physics()
  const scene = new THREE.Scene()
  physics.world.createCollider(RAPIER.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0).setFriction(0.8))
  const pbody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(playerPos.x, 0.9, playerPos.z))
  const collider = physics.world.createCollider(RAPIER.ColliderDesc.capsule(0.6, 0.3), pbody)
  const shoves: THREE.Vector3[] = []
  let slowed = 0
  const info: PlayerInfo = {
    eye: new THREE.Vector3(playerPos.x, 1.7, playerPos.z),
    aimDir: new THREE.Vector3(0, 0, -1),
    ads: 0,
    weapon: 'hands',
    swinging: false,
    collider,
    shove: (x, z) => shoves.push(new THREE.Vector3(x, 0, z)),
    slow: () => slowed++,
  }
  const npc = new Npc(physics, scene)
  npc.spawn(zombiePos, 0)
  const brain = new ZombieBrain('zombie', { npc, physics, scene, config: NPC_CONFIGS.zombie, playerCollider: info.collider })
  npc.onWound = (r) => brain.wounded(r)
  const pelvis = new THREE.Vector3()
  const states: Record<string, number> = {}
  const step = (seconds: number, each?: () => void) => {
    for (let t = 0; t < seconds; t += DT) {
      brain.update(DT, { player: info })
      npc.update(DT)
      physics.step()
      const k = npc.state + '/' + brain.state
      states[k] = (states[k] ?? 0) + 1
      each?.()
    }
  }
  const dist = () => {
    npc.position(pelvis)
    return Math.hypot(pelvis.x - info.eye.x, pelvis.z - info.eye.z)
  }
  const hit = (part: PartName, impulse: number, kind: 'shot' | 'melee') => {
    const body = npc.ragdoll.part(part).body
    const t = body.translation()
    npc.hit(body, new THREE.Vector3(0, 0, -impulse), new THREE.Vector3(t.x, t.y, t.z), kind)
  }
  return { npc, brain, info, step, dist, hit, shoves, states, slowed: () => slowed }
}

// 1. Persegue e ataca (agarra e empurra) sem dar dano no jogador.
{
  const s = await scenario()
  const d0 = s.dist()
  let maxSpeed = 0
  const speeds: number[] = []
  s.step(25, () => { if (s.brain.state === 'chase') { const v = Math.hypot(s.npc.velocity.x, s.npc.velocity.z); speeds.push(v); maxSpeed = Math.max(maxSpeed, v) } })
  check('persegue: aproximou-se do jogador', s.dist() < 2.2 && s.dist() < d0 - 5, `${d0.toFixed(1)} -> ${s.dist().toFixed(1)} m`)
  check('anda devagar (arrastado), média < 1.2 m/s na perseguição', speeds.reduce((a, b) => a + b, 0) / speeds.length < 1.2, `média ${(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(2)}, pico ${maxSpeed.toFixed(2)}`)
  check('agarrou o jogador', s.brain.zdebug.grabs > 0 && s.slowed() > 0, `grabs ${s.brain.zdebug.grabs}`)
  check('empurrou o jogador', s.brain.zdebug.shoves > 0 && s.shoves.some((v) => v.length() >= ZOMBIE.shove - 0.01), `shoves ${s.brain.zdebug.shoves}`)
  console.log('      estados:', JSON.stringify(s.states))
}

// 2. Dor não derruba nem mata: muito dano no tronco e braços, só melee na cabeça.
{
  const s = await scenario()
  s.step(2)
  for (let i = 0; i < 6; i++) {
    s.hit('chest', 60, 'shot')
    s.hit('abdomen', 150, 'melee')
    s.hit('head', 30, 'melee')
    s.step(0.4)
  }
  check('tronco/braços/melee na cabeça não matam', !s.npc.isDead, `saúde geral ${s.npc.debug.overall.toFixed(0)}, cabeça ${s.npc.debug.health.head.toFixed(0)}`)
  check('cabeça destruída por pancadas, saúde baixa, e não desmaiou (dor não derruba)', s.npc.debug.overall < 60 && s.npc.debug.health.head < 5 && s.npc.state !== 'unconscious', `${s.npc.debug.overall.toFixed(0)} ${s.npc.state}`)
  check('dor zerada', s.npc.damage.pain === 0)
  const d = s.dist()
  s.step(8)
  check('continua perseguindo', s.dist() < d - 1 || s.dist() < 2.5, `${d.toFixed(1)} -> ${s.dist().toFixed(1)} m`)
}

// 3. Tiro na cabeça: limiar próprio (um fraco não mata, o seguinte destrói).
{
  const s = await scenario()
  s.step(1)
  let killed = false
  s.npc.onDeath.add(() => (killed = true))
  s.hit('head', 8, 'shot')
  check('tiro fraco na cabeça (50 de dano) não mata', !s.npc.isDead, `cabeça ${s.npc.debug.health.head.toFixed(0)}`)
  s.step(0.5)
  s.hit('head', 8, 'shot')
  s.step(2)
  check('segundo tiro destrói a cabeça: morre', s.npc.isDead && killed && s.brain.state === 'dead')
  const p0 = s.dist()
  s.step(5)
  check('morto não vai atrás do jogador', Math.abs(s.dist() - p0) < 0.8)
}

// 4. Sem as pernas: rasteja com os braços até o jogador.
{
  const s = await scenario(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 6))
  s.step(1)
  for (let i = 0; i < 3; i++) {
    s.hit('thighL', 25, 'shot')
    s.hit('shinL', 25, 'shot')
    s.hit('thighR', 25, 'shot')
    s.hit('shinR', 25, 'shot')
  }
  s.step(3)
  check('sem pernas: não está morto nem inconsciente', !s.npc.isDead && s.npc.state !== 'unconscious', s.npc.state)
  const d1 = s.dist()
  let minD = d1
  for (let i = 0; i < 10; i++) {
    s.step(3, () => (minD = Math.min(minD, s.dist())))
    if (process.env.TRACE) { const c = s.npc.ragdoll.part('chest').body; const r = c.rotation(); const q = new THREE.Quaternion(r.x, r.y, r.z, r.w); const b = new THREE.Vector3(0, 0, -1).applyQuaternion(q); const h = new THREE.Vector3(0, 1, 0).applyQuaternion(q); const t = c.translation(); console.log('   t', i * 3, s.npc.state, 'dist', s.dist().toFixed(2), 'chest', t.x.toFixed(2), t.y.toFixed(2), t.z.toFixed(2), 'belly.y', b.y.toFixed(2), 'head', h.x.toFixed(2), h.y.toFixed(2), h.z.toFixed(2)) }
  }
  check('rasteja (estado crawling/crawl)', (s.states['crawling/crawl'] ?? 0) > 60, JSON.stringify(s.states))
  check('chega perto do jogador rastejando', minD < Math.max(2.2, d1 - 2), `${d1.toFixed(1)} -> mín ${minD.toFixed(1)} m`)
  check('agarra rastejando', s.brain.zdebug.grabs > 0, `grabs ${s.brain.zdebug.grabs}`)
}

// 5. Uma perna danificada: continua (mancando) em direção ao jogador.
{
  const s = await scenario()
  s.step(1)
  s.hit('shinR', 12, 'shot')
  s.step(20)
  check('perna ferida: segue em direção ao jogador', s.dist() < 4, `${s.dist().toFixed(1)} m, ${s.npc.state}`)
}

console.log(failed ? `\n${failed} FALHA(S)` : '\nTodos passaram')
process.exit(failed ? 1 : 0)
