import type { Body, Skin } from '../editor/model'
import type { Particle } from '../physics/particle'
import { createRng } from '../utils/rng'
import { bestRotation, type Vec2 } from '../utils/vec2'

// Modo "pele": desenha a criatura como um animal (corpo preenchido, membros em cápsula, olho e padrão)
// por cima da mesma física do modo esqueleto. Também desenha o cenário (céu, morros, grama).

const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`

type Palette = {
  base: string
  outline: string
  back: string
  backOutline: string
  pattern: string
  foot: string
  backFoot: string
  // Faixa de luz ao longo dos membros (frente e trás).
  highlight: string
  backHighlight: string
  // Interior da orelha e crista.
  inner: string
  crest: string
  iris: string
}

function palette(hue: number): Palette {
  return {
    base: hsl(hue, 50, 58),
    outline: hsl(hue, 40, 26),
    back: hsl(hue, 34, 40),
    backOutline: hsl(hue, 34, 20),
    pattern: hsl((hue + 25) % 360, 45, 30, 0.5),
    foot: hsl(hue, 30, 30),
    backFoot: hsl(hue, 30, 22),
    highlight: hsl(hue, 58, 68),
    backHighlight: hsl(hue, 34, 47),
    inner: hsl((hue + 330) % 360, 55, 72),
    crest: hsl((hue + 25) % 360, 50, 42),
    iris: hsl((hue + 190) % 360, 45, 32),
  }
}

// Meia espessura do corpo em volta dos ossos do torso (arredonda o contorno).
const BODY_RADIUS = 7
// Espessura dos membros na junta do torso e na ponta; a coxa ganha um volume extra no primeiro segmento.
const LIMB_WIDTH_START = 12
const LIMB_WIDTH_END = 6
const THIGH_BULGE = 4

// Fecho convexo (cadeia monotônica): contorno do torso quando não há triângulos (ex.: a lagarta).
function hull(points: Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (pts.length < 3) return pts
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
  const lower: Vec2[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Vec2[] = []
  for (const p of pts.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

// Junta da cabeça: a mais à frente (maior x) na pose inicial, já que as criaturas andam para a direita.
function headIndex(body: Body): number {
  let head = 0
  for (let i = 1; i < body.initial.length; i++) if (body.initial[i].x > body.initial[head].x) head = i
  return head
}

const HEAD_RADIUS = 11
// Raio visível da cabeça: o círculo mais o traço largo do corpo.
const HEAD_OUTER = HEAD_RADIUS + BODY_RADIUS

function torsoPath(body: Body): Path2D {
  const path = new Path2D()
  const pos = body.torso.map((p) => p.pos)
  if (pos.length > 0) {
    const h = pos[headIndex(body)]
    path.moveTo(h.x + HEAD_RADIUS, h.y)
    path.arc(h.x, h.y, HEAD_RADIUS, 0, Math.PI * 2)
  }
  const polys = body.faces.length > 0 ? body.faces.map((f) => f.map((i) => pos[i])) : [hull(pos)]
  for (const poly of polys) {
    if (poly.length < 3) continue
    path.moveTo(poly[0].x, poly[0].y)
    for (let i = 1; i < poly.length; i++) path.lineTo(poly[i].x, poly[i].y)
    path.closePath()
  }
  for (const [a, b] of body.torsoBones) {
    path.moveTo(pos[a].x, pos[a].y)
    path.lineTo(pos[b].x, pos[b].y)
  }
  return path
}

type LimbNode = { x: number; y: number; r: number }

// Pontos do membro com o raio em cada um: afina em curva suave até a ponta, com uma "coxa" logo depois do torso.
function limbNodes(chain: Particle[]): LimbNode[] {
  const last = chain.length - 1
  const radius = (t: number) => (LIMB_WIDTH_END + (LIMB_WIDTH_START - LIMB_WIDTH_END) * (1 - t) ** 1.4) / 2
  const nodes: LimbNode[] = []
  for (let i = 0; i <= last; i++) {
    const p = chain[i].pos
    nodes.push({ x: p.x, y: p.y, r: radius(last > 0 ? i / last : 0) })
    if (i === 0 && last > 0) {
      const q = chain[1].pos
      nodes.push({ x: p.x + (q.x - p.x) * 0.38, y: p.y + (q.y - p.y) * 0.38, r: radius(0.38 / last) + THIGH_BULGE / 2 })
    }
  }
  return nodes
}

// Silhueta do membro: círculos nas juntas unidos por trapézios tangentes (afina sem degraus).
// Tudo no mesmo sentido de giro, para a união não abrir buracos com a regra nonzero.
function limbPath(nodes: LimbNode[], extra: number): Path2D {
  const path = new Path2D()
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    const ra = a.r + extra
    path.moveTo(a.x + ra, a.y)
    path.arc(a.x, a.y, ra, 0, Math.PI * 2)
    if (i === nodes.length - 1) break
    const b = nodes[i + 1]
    const rb = b.r + extra
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = -(b.y - a.y) / len
    const ny = (b.x - a.x) / len
    path.moveTo(a.x - nx * ra, a.y - ny * ra)
    path.lineTo(b.x - nx * rb, b.y - ny * rb)
    path.lineTo(b.x + nx * rb, b.y + ny * rb)
    path.lineTo(a.x + nx * ra, a.y + ny * ra)
    path.closePath()
  }
  return path
}

// Faixa de luz dentro do membro, deslocada para cima e para a esquerda (luz vem do céu).
function strokeHighlight(ctx: CanvasRenderingContext2D, nodes: LimbNode[], color: string) {
  ctx.strokeStyle = color
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i]
    const b = nodes[i + 1]
    // O último segmento para antes da ponta, para não brigar com o pé.
    const end = i === nodes.length - 2 ? 0.6 : 1
    ctx.lineWidth = a.r * 0.55
    ctx.beginPath()
    ctx.moveTo(a.x - a.r * 0.22, a.y - a.r * 0.38)
    ctx.lineTo(a.x + (b.x - a.x) * end - b.r * 0.22, a.y + (b.y - a.y) * end - b.r * 0.38)
    ctx.stroke()
  }
}

// Pata na ponta do membro: oval deitada, apontando para a frente, com dedos marcados.
// Achata um pouco quando está apoiada no chão (`contact`).
function drawFoot(ctx: CanvasRenderingContext2D, chain: Particle[], fill: string, outline: string, light: string) {
  if (chain.length < 2) return
  const tipParticle = chain[chain.length - 1]
  const tip = tipParticle.pos
  const prev = chain[chain.length - 2].pos
  const angle = Math.atan2(tip.y - prev.y, tip.x - prev.x)
  const planted = tipParticle.contact > 0
  const rx = planted ? 8 : 7
  const ry = planted ? 3.6 : 4.2
  ctx.save()
  ctx.translate(tip.x, tip.y)
  // O pé fica deitado: meio caminho entre a direção do segmento e a horizontal, apontando para a frente.
  ctx.rotate((angle + (Math.abs(angle) > Math.PI / 2 ? Math.PI : 0)) * 0.3)
  ctx.beginPath()
  ctx.ellipse(2, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = outline
  ctx.stroke()
  // Brilho no peito do pé e duas fendas entre os dedos, na frente.
  ctx.strokeStyle = light
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.ellipse(1, -ry * 0.25, rx * 0.55, ry * 0.45, 0, Math.PI * 1.1, Math.PI * 1.75)
  ctx.stroke()
  ctx.strokeStyle = outline
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(2 + rx * 0.45, ry * 0.85)
  ctx.lineTo(2 + rx * 0.38, ry * 0.05)
  ctx.moveTo(2 + rx * 0.8, ry * 0.5)
  ctx.lineTo(2 + rx * 0.68, -ry * 0.15)
  ctx.stroke()
  ctx.restore()
}

function drawLimbs(ctx: CanvasRenderingContext2D, body: Body, side: 'back' | 'front', pal: Palette) {
  const back = side === 'back'
  const fill = back ? pal.back : pal.base
  const outline = back ? pal.backOutline : pal.outline
  const light = back ? pal.backHighlight : pal.highlight
  for (const l of body.limbs) {
    if (l.side !== side || l.chain.length < 2) continue
    const nodes = limbNodes(l.chain)
    ctx.fillStyle = outline
    ctx.fill(limbPath(nodes, 1.5))
    ctx.fillStyle = fill
    ctx.fill(limbPath(nodes, 0))
    strokeHighlight(ctx, nodes, light)
    drawFoot(ctx, l.chain, back ? pal.backFoot : pal.foot, outline, light)
  }
}

// Padrão da pele em coordenadas locais do torso (centrado na pose inicial), para girar e andar com o corpo.
function drawPattern(ctx: CanvasRenderingContext2D, skin: Skin, box: { x0: number; y0: number; x1: number; y1: number }, color: string) {
  ctx.fillStyle = color
  ctx.strokeStyle = color
  if (skin.pattern === 'spots') {
    const rng = createRng(Math.round(skin.hue) * 31 + 7)
    const area = (box.x1 - box.x0) * (box.y1 - box.y0)
    const count = Math.max(4, Math.round(area / 260))
    for (let i = 0; i < count; i++) {
      ctx.beginPath()
      ctx.ellipse(
        box.x0 + rng.next() * (box.x1 - box.x0),
        box.y0 + rng.next() * (box.y1 - box.y0),
        3 + rng.next() * 5,
        2.5 + rng.next() * 3.5,
        rng.next() * Math.PI,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }
  } else if (skin.pattern === 'stripes') {
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    for (let x = box.x0 + 8; x < box.x1; x += 17) {
      ctx.beginPath()
      ctx.moveTo(x - 4, box.y0)
      ctx.lineTo(x + 4, box.y1)
      ctx.stroke()
    }
  } else if (skin.pattern === 'scales') {
    ctx.lineWidth = 1.5
    for (let row = 0, y = box.y0; y < box.y1 + 6; y += 7, row++) {
      for (let x = box.x0 + (row % 2) * 5; x < box.x1 + 10; x += 10) {
        ctx.beginPath()
        ctx.arc(x, y, 5, 0.15 * Math.PI, 0.85 * Math.PI)
        ctx.stroke()
      }
    }
  }
}

// Última altura do chão vista sob cada corpo (pela ponta que tocou o chão), para a sombra não pular no ar.
const groundMemory = new WeakMap<Body, number>()

// Sombra suave no chão, sob o meio da criatura: menor e mais clara quanto mais alto ela estiver.
// drawBody não recebe o chão; ele é estimado pelos pontos em contato (ou pelo ponto mais baixo).
function drawShadow(ctx: CanvasRenderingContext2D, body: Body) {
  let lowest = -Infinity
  let contactY = -Infinity
  let minX = Infinity
  let maxX = -Infinity
  const visit = (p: Particle) => {
    if (p.pos.y > lowest) lowest = p.pos.y
    if (p.contact > 0 && p.pos.y > contactY) contactY = p.pos.y
    if (p.pos.x < minX) minX = p.pos.x
    if (p.pos.x > maxX) maxX = p.pos.x
  }
  for (const p of body.torso) visit(p)
  for (const l of body.limbs) for (const p of l.chain) visit(p)
  if (!Number.isFinite(lowest)) return
  if (Number.isFinite(contactY)) groundMemory.set(body, contactY)
  const groundY = Math.max(groundMemory.get(body) ?? lowest, lowest)
  const lift = Math.max(0, groundY - lowest)
  const fade = Math.max(0.2, 1 - lift / 140)
  const rx = ((maxX - minX) / 2 + 12) * (0.85 + 0.15 * fade)
  const ry = 4 + 2 * fade
  ctx.save()
  ctx.translate((minX + maxX) / 2, groundY + 2)
  ctx.scale(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, `rgba(40, 30, 15, ${0.32 * fade})`)
  g.addColorStop(0.6, `rgba(40, 30, 15, ${0.18 * fade})`)
  g.addColorStop(1, 'rgba(40, 30, 15, 0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Orelha (ou crista, na pele de escamas) no alto da cabeça, desenhada antes do corpo para a base ficar escondida.
// Coordenadas locais do torso; `h` é o centro da cabeça.
function drawHeadgear(ctx: CanvasRenderingContext2D, skin: Skin, h: Vec2, pal: Palette) {
  ctx.lineWidth = 1.5
  ctx.strokeStyle = pal.outline
  if (skin.pattern === 'scales') {
    // Três espinhos em leque sobre a nuca.
    ctx.fillStyle = pal.crest
    for (let k = 0; k < 3; k++) {
      const a = -2.35 + k * 0.42
      const spread = 0.2
      const tipR = HEAD_OUTER + 7 - k * 1.5
      ctx.beginPath()
      ctx.moveTo(h.x + Math.cos(a - spread) * (HEAD_OUTER - 4), h.y + Math.sin(a - spread) * (HEAD_OUTER - 4))
      ctx.lineTo(h.x + Math.cos(a - 0.12) * tipR, h.y + Math.sin(a - 0.12) * tipR)
      ctx.lineTo(h.x + Math.cos(a + spread) * (HEAD_OUTER - 4), h.y + Math.sin(a + spread) * (HEAD_OUTER - 4))
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    return
  }
  // Duas orelhas: a de trás mais escura, a da frente com o interior rosado.
  const ears = [
    { dx: -12, dy: -16, rot: -0.6, fill: pal.back, outline: pal.backOutline, inner: false },
    { dx: -5, dy: -19, rot: -0.3, fill: pal.base, outline: pal.outline, inner: true },
  ]
  for (const e of ears) {
    ctx.save()
    ctx.translate(h.x + e.dx, h.y + e.dy)
    ctx.rotate(e.rot)
    ctx.beginPath()
    ctx.ellipse(0, 0, 4.5, 8, 0, 0, Math.PI * 2)
    ctx.fillStyle = e.fill
    ctx.fill()
    ctx.strokeStyle = e.outline
    ctx.stroke()
    if (e.inner) {
      ctx.beginPath()
      ctx.ellipse(0, -0.5, 2.2, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = pal.inner
      ctx.fill()
    }
    ctx.restore()
  }
}

// Desenha a criatura. `time` (s) anima detalhes como piscar.
export function drawBody(ctx: CanvasRenderingContext2D, body: Body, time: number) {
  const pal = palette(body.skin.hue)
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Referencial local: centro atual do torso, girado como o corpo girou desde a pose inicial.
  const pos = body.torso.map((p) => p.pos)
  const n = Math.max(1, pos.length)
  const cx = pos.reduce((s, p) => s + p.x, 0) / n
  const cy = pos.reduce((s, p) => s + p.y, 0) / n
  const icx = body.initial.reduce((s, p) => s + p.x, 0) / n
  const icy = body.initial.reduce((s, p) => s + p.y, 0) / n
  const local = body.initial.map((p) => ({ x: p.x - icx, y: p.y - icy }))
  const rot = bestRotation(body.initial, pos)
  const head = local.length > 0 ? local[headIndex(body)] : null

  drawShadow(ctx, body)

  if (head) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    drawHeadgear(ctx, body.skin, head, pal)
    ctx.restore()
  }

  drawLimbs(ctx, body, 'back', pal)

  // Torso: contorno (traço largo escuro), corpo (traço e preenchimento na cor base), padrão e sombreado.
  const path = torsoPath(body)
  ctx.strokeStyle = pal.outline
  ctx.lineWidth = BODY_RADIUS * 2 + 3
  ctx.stroke(path)
  ctx.fillStyle = pal.base
  ctx.strokeStyle = pal.base
  ctx.lineWidth = BODY_RADIUS * 2
  ctx.stroke(path)
  ctx.fill(path)

  const box = {
    x0: Math.min(...local.map((p) => p.x)) - BODY_RADIUS,
    y0: Math.min(...local.map((p) => p.y)) - BODY_RADIUS,
    x1: Math.max(...local.map((p) => p.x)) + BODY_RADIUS,
    y1: Math.max(...local.map((p) => p.y)) + BODY_RADIUS,
  }
  ctx.save()
  ctx.clip(path)
  ctx.translate(cx, cy)
  ctx.rotate(rot)
  drawPattern(ctx, body.skin, box, pal.pattern)
  // Luz de cima e barriga mais escura.
  const shade = ctx.createLinearGradient(0, box.y0, 0, box.y1)
  shade.addColorStop(0, 'rgba(255, 255, 255, 0.28)')
  shade.addColorStop(0.45, 'rgba(255, 255, 255, 0)')
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.22)')
  ctx.fillStyle = shade
  ctx.fillRect(box.x0 - 20, box.y0 - 20, box.x1 - box.x0 + 40, box.y1 - box.y0 + 40)
  ctx.restore()

  drawLimbs(ctx, body, 'front', pal)

  if (head) {
    // Velocidade média do torso (px por passo), levada ao referencial local: o olho acompanha o movimento.
    let vx = 0
    let vy = 0
    for (const p of body.torso) {
      vx += p.pos.x - p.prev.x
      vy += p.pos.y - p.prev.y
    }
    vx /= n
    vy /= n
    const cos = Math.cos(-rot)
    const sin = Math.sin(-rot)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    drawFace(ctx, head, { x: vx * cos - vy * sin, y: vx * sin + vy * cos }, pal, time)
    ctx.restore()
  }
  ctx.restore()
}

// Rosto em coordenadas locais do torso: olho na junta mais à frente (um pouco para dentro e para cima),
// focinho com narina, boca e bochecha. Pisca a cada ~4 s; a pupila olha para onde o corpo vai.
function drawFace(ctx: CanvasRenderingContext2D, h: Vec2, velocity: Vec2, pal: Palette, time: number) {
  const len = Math.hypot(h.x, h.y) || 1
  const eye = { x: h.x - (h.x / len) * 6, y: h.y - (h.y / len) * 6 - 4 }

  // Bochecha, narina e boca, na frente da cabeça (a criatura olha para a direita).
  ctx.fillStyle = 'rgba(255, 120, 120, 0.28)'
  ctx.beginPath()
  ctx.ellipse(h.x + 5, h.y + 6, 3.6, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pal.outline
  ctx.beginPath()
  ctx.ellipse(h.x + HEAD_OUTER - 3, h.y - 1, 1.6, 1.1, -0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = pal.outline
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(h.x + HEAD_OUTER - 3.5, h.y + 5)
  ctx.quadraticCurveTo(h.x + HEAD_OUTER - 6, h.y + 8.5, h.x + HEAD_OUTER - 10, h.y + 7.5)
  ctx.stroke()

  const blinking = time % 4.3 < 0.14
  if (blinking) {
    ctx.strokeStyle = '#1d1d1b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(eye.x - 4, eye.y)
    ctx.lineTo(eye.x + 4, eye.y)
    ctx.stroke()
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(eye.x, eye.y, 4.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 1
    ctx.stroke()
    // Olhar: para a frente por padrão, puxado pela velocidade e limitado à borda do olho.
    let lx = 1.2 + velocity.x * 0.6
    let ly = 0.3 + velocity.y * 0.6
    const ll = Math.hypot(lx, ly)
    if (ll > 1.8) {
      lx = (lx / ll) * 1.8
      ly = (ly / ll) * 1.8
    }
    ctx.fillStyle = pal.iris
    ctx.beginPath()
    ctx.arc(eye.x + lx, eye.y + ly, 2.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111110'
    ctx.beginPath()
    ctx.arc(eye.x + lx * 1.1, eye.y + ly * 1.1, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(eye.x + lx + 0.9, eye.y + ly - 1, 0.85, 0, Math.PI * 2)
    ctx.fill()
  }
  // Sobrancelha inclinada para a frente: cara de quem está determinado a andar.
  ctx.strokeStyle = pal.outline
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(eye.x - 4, eye.y - 7)
  ctx.lineTo(eye.x + 3.5, eye.y - 5.6)
  ctx.stroke()
}

// Hash simples e determinístico de um inteiro para [0, 1): posição fixa de tufos e pedrinhas no mundo.
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// Contorno do chão na tela, de x = 0 a w, para preencher terra e desenhar a grama.
export function groundPath(w: number, h: number, surface: (screenX: number) => number): Path2D {
  const path = new Path2D()
  path.moveTo(0, h)
  for (let x = 0; x <= w; x += 2) path.lineTo(x, surface(x))
  path.lineTo(w, h)
  path.closePath()
  return path
}

// Nuvem fofa: alguns círculos sobre uma base achatada, com a sombra azulada um pouco abaixo.
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  const puffs = [
    [-15, -3, 11],
    [0, -9, 15],
    [16, -4, 10],
    [7, -1, 11],
  ]
  for (const [color, dy] of [
    ['rgba(196, 220, 236, 0.9)', 2.5],
    ['rgba(255, 255, 255, 0.95)', 0],
  ] as const) {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y + dy * s, 30 * s, 8 * s, 0, 0, Math.PI * 2)
    for (const [px, py, r] of puffs) {
      ctx.moveTo(x + (px + r) * s, y + (py + dy) * s)
      ctx.arc(x + px * s, y + (py + dy) * s, r * s, 0, Math.PI * 2)
    }
    ctx.fill()
  }
}

// Cores das flores espalhadas na grama.
const FLOWER_COLORS = ['#fbf6ea', '#f4c542', '#ef8fb1', '#b9a3e8']

// Cenário em camadas. `offset` é o deslocamento horizontal da câmera (tela = mundo + offset);
// `groundY` é a altura do chão plano na tela e `surface` dá a altura do chão (com relevo) em cada x da tela.
export function drawScenery(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  offset: number,
  surface: (screenX: number) => number = () => groundY,
) {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const sky = ctx.createLinearGradient(0, 0, 0, groundY)
  sky.addColorStop(0, '#9fd3f0')
  sky.addColorStop(1, '#e6f3f7')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, groundY)

  // Sol com brilho suave, fixo na tela (está longe demais para ter paralaxe).
  const sunX = w * 0.82
  const sunY = Math.max(40, groundY * 0.2)
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 120)
  sun.addColorStop(0, 'rgba(255, 252, 232, 1)')
  sun.addColorStop(0.17, 'rgba(255, 250, 225, 0.95)')
  sun.addColorStop(0.22, 'rgba(255, 246, 210, 0.45)')
  sun.addColorStop(1, 'rgba(255, 246, 210, 0)')
  ctx.fillStyle = sun
  ctx.fillRect(sunX - 120, sunY - 120, 240, 240)

  // Nuvens presas a uma camada bem distante (paralaxe lenta): uma por célula de 260 px, quando o sorteio deixa.
  const cloudShift = offset * 0.06
  const CLOUD_CELL = 260
  for (let i = Math.floor((-cloudShift - 80) / CLOUD_CELL); i <= Math.ceil((w - cloudShift + 80) / CLOUD_CELL); i++) {
    if (hash(i * 3 + 1) < 0.3) continue
    const s = 0.65 + hash(i + 31) * 0.6
    drawCloud(ctx, i * CLOUD_CELL + hash(i + 11) * 140 + cloudShift, groundY * (0.1 + hash(i + 21) * 0.32), s)
  }

  // Morros ao fundo, com paralaxe (os mais distantes andam menos). O primeiro é uma serra azulada, enevoada.
  const hills = [
    { factor: 0.06, height: 105, base: 28, color: '#c4dde2', wave: 0.0042, sharp: 0.18 },
    { factor: 0.15, height: 70, base: 18, color: '#b5d6c3', wave: 0.006, sharp: 0 },
    { factor: 0.4, height: 40, base: 6, color: '#93c4a2', wave: 0.011, sharp: 0 },
  ]
  const hillY = (hill: (typeof hills)[number], wx: number) =>
    groundY -
    hill.base -
    hill.height *
      (0.5 + 0.3 * Math.sin(wx * hill.wave) + 0.2 * Math.sin(wx * hill.wave * 2.7 + 1) + hill.sharp * Math.sin(wx * hill.wave * 6.3 + 2))
  for (const hill of hills) {
    const shift = offset * hill.factor
    ctx.fillStyle = hill.color
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    for (let x = 0; x <= w + 8; x += 8) ctx.lineTo(x, hillY(hill, x - shift))
    ctx.lineTo(w, groundY)
    ctx.closePath()
    ctx.fill()
    // Árvores redondas no morro mais próximo.
    if (hill.factor === 0.4) {
      const TREE_CELL = 70
      for (let i = Math.floor((-shift - 30) / TREE_CELL); i <= Math.ceil((w - shift + 30) / TREE_CELL); i++) {
        if (hash(i + 501) < 0.55) continue
        const wx = i * TREE_CELL + hash(i + 502) * 40
        const x = wx + shift
        const y = hillY(hill, wx) + 3
        const r = 6 + hash(i + 503) * 6
        ctx.fillStyle = '#6f9f7c'
        ctx.fillRect(x - 1, y - r, 2, r)
        ctx.fillStyle = '#7fb38e'
        ctx.beginPath()
        ctx.arc(x, y - r * 1.4, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
        ctx.beginPath()
        ctx.arc(x - r * 0.3, y - r * 1.65, r * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // Alturas do chão em cada 2 px da tela, calculadas uma vez para as várias passadas abaixo.
  const ys: number[] = []
  for (let x = 0; x <= w; x += 2) ys.push(surface(x))
  const line = (dy: (x: number) => number) => {
    ctx.beginPath()
    for (let i = 0; i < ys.length; i++) ctx.lineTo(i * 2, ys[i] + dy(i * 2))
    ctx.stroke()
  }

  // Terra (escurecendo com a profundidade) e faixa de grama acompanhando o relevo.
  const ground = groundPath(w, h, surface)
  ctx.fillStyle = '#9b7b55'
  ctx.fill(ground)
  ctx.save()
  ctx.clip(ground)
  const depth = ctx.createLinearGradient(0, groundY, 0, h)
  depth.addColorStop(0, 'rgba(60, 40, 20, 0)')
  depth.addColorStop(1, 'rgba(60, 40, 20, 0.28)')
  ctx.fillStyle = depth
  ctx.fillRect(0, groundY - 60, w, h - groundY + 60)
  // Borda de baixo da grama, ondulada e mais escura (presa ao mundo, anda com a câmera).
  ctx.strokeStyle = '#4f8a3a'
  ctx.lineWidth = 18
  line((x) => 1.2 * Math.sin((x - offset) * 0.21) + 0.8 * Math.sin((x - offset) * 0.53))
  ctx.strokeStyle = '#6aa84f'
  ctx.lineWidth = 14
  line(() => 0)
  // Faixa de luz no topo da grama.
  ctx.strokeStyle = '#88c165'
  ctx.lineWidth = 4
  line(() => 0)
  ctx.restore()

  // Tufos de grama, flores, pedras e pedrinhas presos ao mundo (andam com a câmera).
  const first = Math.floor(-offset / 24) - 1
  const last = Math.ceil((w - offset) / 24) + 1
  for (let i = first; i <= last; i++) {
    const x = i * 24 + hash(i) * 16 + offset
    const gy = surface(x)
    if (hash(i + 61) > 0.9) {
      // Pedra assentada na grama, com um brilho em cima.
      const rx = 5 + hash(i + 62) * 4
      const ry = 3.5 + hash(i + 63) * 2
      ctx.fillStyle = '#958d80'
      ctx.beginPath()
      ctx.ellipse(x + 14, gy + 1, rx, ry, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#b9b2a5'
      ctx.beginPath()
      ctx.ellipse(x + 13 - rx * 0.2, gy - ry * 0.45, rx * 0.5, ry * 0.3, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = '#4f8a3a'
    ctx.lineWidth = 2
    const tall = 4 + hash(i + 99) * 5
    ctx.beginPath()
    ctx.moveTo(x, gy + 1)
    ctx.lineTo(x - 2, gy - tall)
    ctx.moveTo(x + 3, gy + 1)
    ctx.lineTo(x + 4, gy - tall * 0.7)
    ctx.stroke()
    if (hash(i + 41) > 0.8) {
      // Florzinha: caule curvo e quatro pétalas em volta do miolo amarelo.
      const fx = x + 7
      const stem = 8 + hash(i + 42) * 5
      const top = { x: fx + 1.5, y: gy - stem }
      ctx.strokeStyle = '#4f8a3a'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(fx, gy + 1)
      ctx.quadraticCurveTo(fx - 1.5, gy - stem * 0.5, top.x, top.y)
      ctx.stroke()
      ctx.fillStyle = FLOWER_COLORS[Math.floor(hash(i + 43) * FLOWER_COLORS.length)]
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2 + 0.4
        ctx.beginPath()
        ctx.arc(top.x + Math.cos(a) * 2.2, top.y + Math.sin(a) * 2.2, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#e8a33a'
      ctx.beginPath()
      ctx.arc(top.x, top.y, 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
    if (hash(i + 7) > 0.55) {
      ctx.fillStyle = '#7d6346'
      ctx.beginPath()
      ctx.ellipse(x + 9, gy + 16 + hash(i + 3) * 30, 3 + hash(i + 5) * 3, 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}
