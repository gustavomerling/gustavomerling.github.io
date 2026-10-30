import { useEffect, useRef } from 'react'
import type { Particle } from '../physics/particle'
import type { Body } from '../editor/model'
import { FIXED_DT, type World } from '../physics/world'
import { surfaceY } from '../physics/ground'
import { drawBody, drawScenery, groundPath } from './skin'
import type { Vec2 } from '../utils/vec2'

// Músculo como um fuso: engrossa e fica vermelho ao contrair (activation > 0), afina e fica azul ao esticar.
export function drawMuscle(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, strength: number, activation: number) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return
  const nx = -dy / len
  const ny = dx / len
  const act = Math.max(-1, Math.min(1, activation))
  const half = ((2 + strength * 8) / 2) * (1 + 0.9 * act)
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  // Pontos de controle em 2x a meia largura: a curva quadrática chega a `half` no meio.
  const cx = nx * half * 2
  const cy = ny * half * 2
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.quadraticCurveTo(mx + cx, my + cy, b.x, b.y)
  ctx.quadraticCurveTo(mx - cx, my - cy, a.x, a.y)
  const t = (act + 1) / 2
  ctx.fillStyle = `rgb(${Math.round(47 + t * 180)}, ${Math.round(133 - t * 60)}, ${Math.round(190 - t * 140)})`
  ctx.fill()
}

// Camada de uma peça ligando dois pontos: atrás se toca o exemplar de trás, na frente se toca o da frente.
const layerOf = (a: Particle, b: Particle) => (a.depth < 0 || b.depth < 0 ? -1 : a.depth > 0 || b.depth > 0 ? 1 : 0)

// Distância entre as marcas do chão, em px (cada marca mostra quantos px a partir do início).
const MARK_EVERY = 100

// Modo esqueleto: ossos, músculos e juntas em três camadas (trás apagado, torso, frente).
function drawSkeleton(ctx: CanvasRenderingContext2D, world: World) {
  for (const layer of [-1, 0, 1]) {
    ctx.globalAlpha = layer < 0 ? 0.4 : 1
    ctx.lineWidth = 3
    for (const b of world.bones) {
      if (layerOf(b.a, b.b) !== layer) continue
      ctx.strokeStyle = layer === 0 ? '#2b6cb0' : '#6b46c1'
      ctx.beginPath()
      ctx.moveTo(b.a.pos.x, b.a.pos.y)
      ctx.lineTo(b.b.pos.x, b.b.pos.y)
      ctx.stroke()
    }
    for (const m of world.muscles) {
      if (layerOf(m.a, m.b) === layer) drawMuscle(ctx, m.a.pos, m.b.pos, m.strength, m.activation)
    }
    ctx.fillStyle = '#c53030'
    for (const p of world.particles) {
      if (p.depth !== layer) continue
      ctx.beginPath()
      ctx.arc(p.pos.x, p.pos.y, 5, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

export type Look = 'skin' | 'skeleton'

type Props = {
  world: World
  // Corpo para o modo "pele"; sem ele, sempre desenha o esqueleto.
  body?: Body
  look?: Look
  // A câmera acompanha a criatura na horizontal.
  follow?: boolean
  // Multiplicador de tempo: quantos frames de física por frame de tela.
  speed?: number
  // Chamado depois de cada frame, com o mundo já avançado.
  onFrame?: (world: World) => void
}

// Desenha o mundo no canvas e avança a física a cada frame, no modo pele (animal e cenário) ou esqueleto.
export function Canvas({ world, body, look = 'skin', follow = false, speed = 1, onFrame }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  // Em refs para mudar velocidade e callback sem recriar o loop.
  const speedRef = useRef(speed)
  const onFrameRef = useRef(onFrame)
  const lookRef = useRef(look)
  lookRef.current = look
  speedRef.current = speed
  onFrameRef.current = onFrame

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    let last = performance.now()
    let frame = 0
    const originX = world.particles.reduce((s, p) => s + p.pos.x, 0) / Math.max(1, world.particles.length)
    // Câmera com atraso: segue o centro da criatura sem tremer a cada passada.
    let cameraX = originX

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const draw = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)
      const groundY = world.ground?.y ?? h
      // Câmera: na vertical, o chão fica a 72% da altura; na horizontal, segue a criatura (se `follow`).
      const offsetY = Math.round(h * 0.72 - groundY)
      let offsetX = 0
      if (follow) {
        const target = world.particles.reduce((s, p) => s + p.pos.x, 0) / world.particles.length
        cameraX += (target - cameraX) * Math.min(1, 0.06 * speedRef.current)
        offsetX = w / 3 - cameraX
      }
      const skin = lookRef.current === 'skin' && body
      const ground = world.ground
      // Altura do chão (com relevo) em cada x da tela.
      const surface = (sx: number) => (ground ? surfaceY(ground, sx - offsetX) : groundY) + offsetY
      if (skin) drawScenery(ctx, w, h, groundY + offsetY, offsetX, surface)
      else if (ground) {
        ctx.fillStyle = '#8a7f6a'
        ctx.fill(groundPath(w, h, surface))
      }
      ctx.save()
      ctx.translate(offsetX, offsetY)
      // Marcas no chão para dar noção de movimento, numeradas a partir da posição inicial.
      if (follow && world.ground) {
        ctx.fillStyle = skin ? 'rgba(60, 40, 20, 0.55)' : '#6f6552'
        ctx.font = '11px system-ui, sans-serif'
        ctx.textAlign = 'center'
        const first = originX + Math.floor((cameraX - w - originX) / MARK_EVERY) * MARK_EVERY
        for (let mx = first; mx < cameraX + w; mx += MARK_EVERY) {
          const gy = surfaceY(world.ground, mx)
          ctx.fillRect(mx, gy + 8, 2, 8)
          ctx.fillText(String(Math.round(mx - originX)), mx + 1, gy + 28)
        }
      }
      if (skin) drawBody(ctx, body, world.steps * FIXED_DT)
      else drawSkeleton(ctx, world)
      ctx.restore()
    }

    const loop = (now: number) => {
      const dt = (now - last) / 1000
      for (let i = 0; i < speedRef.current; i++) world.update(dt)
      last = now
      // Desenha entre o passo anterior e o atual, conforme o tempo que sobrou: movimento liso em telas de 120/144 Hz.
      const alpha = world.alpha
      const saved = world.particles.map((p) => p.pos)
      for (const p of world.particles) p.pos = { x: p.prev.x + (p.pos.x - p.prev.x) * alpha, y: p.prev.y + (p.pos.y - p.prev.y) * alpha }
      draw()
      world.particles.forEach((p, i) => (p.pos = saved[i]))
      onFrameRef.current?.(world)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [world, body, follow])

  return <canvas ref={ref} className="stage" />
}
