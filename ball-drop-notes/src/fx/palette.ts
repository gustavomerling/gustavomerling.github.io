// Paleta das notas e sprites de brilho pré-renderizados (para não usar shadowBlur por objeto).

export type RGB = [number, number, number]

// Matiz de cada classe de altura (0 = dó), no espírito dos boomwhackers: dó vermelho, ré laranja,
// mi amarelo, fá verde, sol ciano, lá azul-violeta, si magenta; sustenidos no meio do caminho.
const PITCH_HUES = [0, 16, 30, 44, 56, 105, 150, 180, 202, 228, 262, 312]
const NOTE_SLOTS = 37 // dó3..dó6
export const FINISH_SLOT = NOTE_SLOTS // cor da linha de chegada
export const WHITE_SLOT = NOTE_SLOTS + 1
export const GOLD_SLOT = NOTE_SLOTS + 2
export const PINK_SLOT = NOTE_SLOTS + 3
export const SLOT_COUNT = NOTE_SLOTS + 4

function hslToRgb(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

export const SLOT_RGB: RGB[] = []
export const SLOT_CSS: string[] = [] // cor cheia
export const SLOT_LIGHT: string[] = [] // versão clara, para o miolo e destaques
export const SLOT_DARK: string[] = [] // versão escura translúcida, para o fundo das etiquetas

for (let i = 0; i < SLOT_COUNT; i++) {
  let rgb: RGB
  if (i < NOTE_SLOTS) {
    // Oitavas mais altas ficam mais claras.
    const octave = Math.floor(i / 12)
    rgb = hslToRgb(PITCH_HUES[i % 12], 0.85, 0.56 + octave * 0.07)
  } else if (i === FINISH_SLOT) rgb = [248, 72, 96]
  else if (i === WHITE_SLOT) rgb = [235, 240, 255]
  else if (i === GOLD_SLOT) rgb = [255, 206, 84]
  else rgb = [244, 114, 182]
  const [r, g, b] = rgb
  SLOT_RGB.push(rgb)
  SLOT_CSS.push(`rgb(${r}, ${g}, ${b})`)
  SLOT_LIGHT.push(`rgb(${Math.round(r + (255 - r) * 0.55)}, ${Math.round(g + (255 - g) * 0.55)}, ${Math.round(b + (255 - b) * 0.55)})`)
  SLOT_DARK.push(`rgba(${Math.round(r * 0.28)}, ${Math.round(g * 0.28)}, ${Math.round(b * 0.28 + 12)}, 0.82)`)
}

// Índice de cor de um bloco.
export function slotOf(note: number, finish: boolean) {
  if (finish) return FINISH_SLOT
  return Math.max(0, Math.min(NOTE_SLOTS - 1, note | 0))
}

// Sprite de brilho radial (64 px) por cor, criado sob demanda e guardado.
const SPRITE_SIZE = 64
const sprites: (HTMLCanvasElement | null)[] = new Array(SLOT_COUNT).fill(null)

export function glowSprite(slot: number): HTMLCanvasElement {
  const cached = sprites[slot]
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const g = canvas.getContext('2d')
  if (g) {
    const [r, gr, b] = SLOT_RGB[slot]
    const c = SPRITE_SIZE / 2
    const grad = g.createRadialGradient(c, c, 0, c, c, c)
    grad.addColorStop(0, `rgba(255, 255, 255, 1)`)
    grad.addColorStop(0.12, `rgba(${r}, ${gr}, ${b}, 0.95)`)
    grad.addColorStop(0.4, `rgba(${r}, ${gr}, ${b}, 0.35)`)
    grad.addColorStop(1, `rgba(${r}, ${gr}, ${b}, 0)`)
    g.fillStyle = grad
    g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
  }
  sprites[slot] = canvas
  return canvas
}

// Sprite de bokeh: disco suave de borda macia, branco (tingido por globalAlpha e cor de fundo).
let bokeh: HTMLCanvasElement | null = null
export function bokehSprite(): HTMLCanvasElement {
  if (bokeh) return bokeh
  const canvas = document.createElement('canvas')
  canvas.width = SPRITE_SIZE
  canvas.height = SPRITE_SIZE
  const g = canvas.getContext('2d')
  if (g) {
    const c = SPRITE_SIZE / 2
    const grad = g.createRadialGradient(c, c, 0, c, c, c)
    grad.addColorStop(0, 'rgba(180, 200, 255, 0.55)')
    grad.addColorStop(0.7, 'rgba(160, 170, 255, 0.35)')
    grad.addColorStop(0.85, 'rgba(150, 160, 255, 0.12)')
    grad.addColorStop(1, 'rgba(150, 160, 255, 0)')
    g.fillStyle = grad
    g.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
  }
  bokeh = canvas
  return canvas
}
