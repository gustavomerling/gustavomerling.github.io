import { LOT, type Lot } from './lot'

/**
 * Minimapa de cima (canvas 2D), desenhado a cada quadro. Visto de cima, com +x do mundo à direita,
 * +z fica para BAIXO (eixos destros): assim o mapa bate com a câmera aérea e não sai espelhado.
 */
export function createMinimap(container: HTMLElement) {
  const S = 4
  const canvas = document.createElement('canvas')
  canvas.width = LOT.halfX * 2 * S
  canvas.height = LOT.halfZ * 2 * S
  canvas.className = 'minimap'
  container.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const px = (x: number) => (x + LOT.halfX) * S
  const py = (z: number) => (z + LOT.halfZ) * S

  /** Retângulo de largura w (x local) e comprimento l (z local), girado por yaw do three. */
  const rect = (cx: number, cz: number, w: number, l: number, yaw: number, fill: string) => {
    ctx.save()
    ctx.translate(px(cx), py(cz))
    // Frente local (-y do canvas) deve apontar para (sin yaw, cos yaw) do mundo, com +z para baixo
    ctx.rotate(Math.PI - yaw)
    ctx.fillStyle = fill
    ctx.fillRect((-w / 2) * S, (-l / 2) * S, w * S, l * S)
    ctx.restore()
  }

  return {
    draw: (lot: Lot, car: { x: number; z: number; yaw: number }, t: number) => {
      ctx.fillStyle = 'rgba(20,22,26,0.85)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      for (const s of lot.slots) {
        const w = s.axis === 'z' ? s.w : s.l
        const l = s.axis === 'z' ? s.l : s.w
        ctx.strokeRect(px(s.cx - w / 2), py(s.cz - l / 2), w * S, l * S)
      }
      for (const p of lot.parked) rect(p.x, p.z, p.hx * 2, p.hz * 2, p.yaw, '#8b8f97')
      for (const c of lot.cones) rect(c.x, c.z, 0.6, 0.6, 0, '#ff6a1a')
      const a = 0.5 + 0.3 * Math.sin(t * 4)
      const tg = lot.target
      const tw = tg.axis === 'z' ? tg.w : tg.l
      const tl = tg.axis === 'z' ? tg.l : tg.w
      rect(tg.cx, tg.cz, tw - 0.1, tl - 0.1, 0, `rgba(61,255,122,${a})`)
      // Carro com a frente marcada em branco
      rect(car.x, car.z, 2, 4.2, car.yaw, '#e8742c')
      ctx.save()
      ctx.translate(px(car.x), py(car.z))
      ctx.rotate(Math.PI - car.yaw)
      ctx.fillStyle = '#fff'
      ctx.fillRect(-S, -2.1 * S, 2 * S, 3)
      ctx.restore()
    },
    dispose: () => canvas.remove(),
  }
}
