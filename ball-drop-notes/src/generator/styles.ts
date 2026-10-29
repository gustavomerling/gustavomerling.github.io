// Estilos de pista: cada um diz para que lado a bolinha deve seguir depois de cada nota.
// O gerador escolhe o ângulo do bloco que leva a bolinha mais perto desse alvo,
// dentro do que a física permite. A bolinha anda sempre rápida na horizontal: assim a física
// usa subpassos curtos o voo todo e o tempo das notas fica igual em qualquer monitor.

export type TrackStyle = 'zigzag' | 'cascade' | 'spiral' | 'stairs' | 'waves'

export const TRACK_STYLES: { value: TrackStyle; label: string }[] = [
  { value: 'zigzag', label: 'Zigue-zague' },
  { value: 'cascade', label: 'Cascata' },
  { value: 'spiral', label: 'Espiral' },
  { value: 'stairs', label: 'Escada' },
  { value: 'waves', label: 'Ondas' },
]

// Parâmetros sorteados uma vez por pista (pela semente).
export type StyleParams = { dir: 1 | -1; speed: number; period: number }

export function styleParams(rand: () => number): StyleParams {
  return {
    dir: rand() < 0.5 ? -1 : 1,
    speed: 0.9 + rand() * 0.2,
    period: 12 + Math.floor(rand() * 8),
  }
}

// Contexto do toque atual: índice da nota, posição, tempo até o próximo toque e
// batida (desde a primeira nota) em que o próximo toque acontece.
export type StyleContext = { i: number; x: number; y: number; gap: number; beat: number }

// Alvo do próximo toque: x absoluto, queda desejada em y e tolerâncias (desvios aceitáveis).
export type StyleTarget = { x: number; dy: number; sx: number; sy: number }

const BASE_SPEED = 1000 // px/s na horizontal
const LANE = 1600 // px; até onde a cascata vai antes de voltar

// Todos os estilos trocam de lado a cada nota: o quique que inverte a bolinha é forte
// (bate de frente), e isso deixa o tempo firme. O estilo muda o centro e a largura do vaivém.
function center(style: TrackStyle, beat: number, p: StyleParams): number {
  switch (style) {
    case 'zigzag':
    case 'spiral':
      return 0
    case 'waves':
      // O centro balança como uma onda.
      return p.dir * 900 * Math.sin((2 * Math.PI * beat) / p.period)
    case 'cascade':
    case 'stairs': {
      // O centro anda para um lado e volta (onda triangular), como uma descida de esqui.
      const rate = style === 'cascade' ? 160 : 110 // px por batida
      const span = (2 * LANE) / rate // batidas para ir de uma borda à outra
      const phase = (beat / span) % 2
      const tri = phase < 1 ? phase : 2 - phase
      return p.dir * (tri * 2 - 1) * LANE
    }
  }
}

function halfWidth(style: TrackStyle, beat: number, gap: number, p: StyleParams): number {
  const natural = 0.5 * BASE_SPEED * p.speed * gap
  switch (style) {
    case 'spiral': {
      // A largura cresce e encolhe: um redemoinho.
      const k = 0.5 + 0.5 * Math.sin((2 * Math.PI * beat) / p.period)
      return natural * (0.6 + 1.2 * k)
    }
    case 'stairs':
      return natural * 0.8
    default:
      return natural
  }
}

export function styleTarget(style: TrackStyle, c: StyleContext, p: StyleParams): StyleTarget {
  const g = Math.min(c.gap, 1.4)
  const side = c.i % 2 === 0 ? p.dir : -p.dir
  const x = center(style, c.beat, p) + side * halfWidth(style, c.beat, c.gap, p)
  // Queda natural: a bolinha sobe um pouco e desce mais do que subiu.
  const fall = 0.5 * 1500 * c.gap * c.gap
  const dy = style === 'stairs' ? 60 + 0.3 * fall : 40 + 0.4 * fall
  return { x, dy, sx: 150 + 250 * g, sy: 80 + 200 * g }
}
