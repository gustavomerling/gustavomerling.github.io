// Partículas e textos flutuantes. Simulação simples em JS puro (não usa a física do jogo):
// atualizada a cada frame e desenhada pelo <EffectsLayer>.

import type { DustPoint } from '../../game/physics/Simulation'
import { MATERIALS } from '../../game/terrain/materials'

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  r: number
  color: string
  kind: 'dust' | 'spark' | 'ring'
  gravity: number
}

export interface Popup {
  x: number
  y: number
  text: string
  color: string
  life: number
  max: number
}

const MAX_PARTICLES = 260

export class Effects {
  particles: Particle[] = []
  popups: Popup[] = []

  private add(p: Particle) {
    if (this.particles.length < MAX_PARTICLES) this.particles.push(p)
  }

  /** Estrela coletada: anel que expande + faíscas douradas + "+50". */
  starBurst(x: number, y: number, points: number) {
    this.add({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, r: 0.2, color: '#ffe066', kind: 'ring', gravity: 0 })
    this.add({ x, y, vx: 0, vy: 0, life: 0.35, max: 0.35, r: 0.1, color: '#ffffff', kind: 'ring', gravity: 0 })
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3
      const s = 3 + Math.random() * 4
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.6 + Math.random() * 0.4,
        max: 1,
        r: 0.05 + Math.random() * 0.06,
        color: i % 3 ? '#ffd400' : '#fff6b0',
        kind: 'spark',
        gravity: 6,
      })
    }
    this.popup(x, y - 0.4, `+${points}`, '#ffd400')
  }

  pickupBurst(x: number, y: number, color: string, text: string) {
    this.add({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, r: 0.2, color, kind: 'ring', gravity: 0 })
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2
      this.add({ x, y, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3 - 2, life: 0.6, max: 0.6, r: 0.06, color, kind: 'spark', gravity: 8 })
    }
    this.popup(x, y - 0.4, text, color)
  }

  crash(x: number, y: number) {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 2 + Math.random() * 5
      this.add({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3, life: 0.9, max: 0.9, r: 0.07, color: i % 2 ? '#ff7043' : '#fff', kind: 'spark', gravity: 10 })
    }
  }

  /** Poeira/lama saindo do pneu, na cor do terreno, jogada para trás. */
  dust(d: DustPoint, speed: number) {
    if (Math.random() > d.intensity * 0.9) return
    const color = MATERIALS[d.material].fill
    const back = speed >= 0 ? -1 : 1
    this.add({
      x: d.x + (Math.random() - 0.5) * 0.2,
      y: d.y - 0.05,
      vx: back * (1 + Math.random() * 3 * d.intensity) + speed * 0.3,
      vy: -1 - Math.random() * 2.5 * d.intensity,
      life: 0.5 + Math.random() * 0.5,
      max: 1,
      r: 0.05 + Math.random() * 0.1 * (0.5 + d.intensity),
      color,
      kind: 'dust',
      gravity: d.material === 'mud' ? 9 : 4,
    })
  }

  popup(x: number, y: number, text: string, color: string) {
    this.popups.push({ x, y, text, color, life: 1.1, max: 1.1 })
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.life -= dt
      p.vy += p.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.kind === 'dust') {
        p.vx *= 1 - dt * 1.5
        p.r += dt * 0.12
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const p of this.popups) {
      p.life -= dt
      p.y -= dt * 1.2
    }
    this.popups = this.popups.filter((p) => p.life > 0)
  }

  clear() {
    this.particles = []
    this.popups = []
  }
}
