// Tipos compartilhados entre motor, render, áudio, composição e gerador.

// Nota extra tocada junto com a nota do bloco (acorde), com duração própria em segundos.
export type ChordNote = { note: number; sustain: number }

// sustain: duração do som em segundos; sem ele, vem da largura do bloco.
// chord: notas que soam junto com a nota do bloco.
export type Segment = {
  x1: number
  y1: number
  x2: number
  y2: number
  note: number
  finish: boolean
  sustain?: number
  chord?: ChordNote[]
}
export type Point = { x: number; y: number }
export type Ball = { x: number; y: number; vx: number; vy: number }
export type MovingBall = Ball & { touching: number[] }
export type StartMode = 'suggest' | 'repeat'
export type View = { x: number; y: number; zoom: number }

// Estado completo da simulação em um instante, para rebobinar e para o loop.
export type Snapshot = {
  t: number
  ball: Ball
  touching: number[]
  trailLength: number
  beatLength: number
  nextBeat: number
}

export type Selection = { index: number; width: number; note: number; finish: boolean }

// Gesto em andamento: 'pan' move a câmera, 'create' desenha um bloco, 'place' move a bolinha,
// 'record' grava um caminho em blocos, 'paint' pinta blocos com a nota do pincel.
export type Gesture =
  | { kind: 'pan'; last: Point }
  | { kind: 'create'; start: Point; end: Point }
  | { kind: 'handle'; index: number; end: 1 | 2 }
  | { kind: 'place' }
  | { kind: 'record'; points: Point[] }
  | { kind: 'paint' }
  | null

// Melodia planejada: notas (índices de nota, 0 = dó3) e o tempo até a próxima nota, em batidas.
// Opcionais: holds, quanto cada nota soa (em batidas, pode passar da próxima nota), e extras,
// notas que soam junto com cada uma, com a própria duração.
export type Melody = {
  notes: number[]
  beats: number[]
  holds?: number[]
  extras?: { note: number; hold: number }[][]
}

// Configurações que a interface muda e o motor lê a cada quadro.
export type Settings = {
  running: boolean
  showTrail: boolean
  timbre: string
  metronome: boolean
  bpm: number
  snap: boolean
}

// Avisos do motor para a interface.
export type SimCallbacks = {
  onSelection: (selection: Selection | null) => void
  onPause: () => void
  // Uma nota tocou na simulação real (não na previsão).
  onNote?: (note: number, impact: number) => void
  // A bolinha tocou a linha de chegada.
  onFinish?: () => void
  // Quantidade de blocos mudou.
  onBlocksChange?: (count: number) => void
}

// API do motor usada pela interface.
export type Sim = {
  reset: () => void
  step: () => void
  setNote: (note: number) => void
  setFinish: (finish: boolean) => void
  deleteSelected: () => void
  deselect: () => void
  setPaint: (note: number | null) => void
  setStartMode: (mode: StartMode) => void
  setScaleIndex: (index: number) => void
  setSequence: (midi: number[] | null) => boolean
  setLoop: (on: boolean) => void
  markLoopStart: () => void
  rewind: (seconds: number) => void
  transpose: (semitones: number) => boolean
  addPattern: (beats: number[]) => boolean
  previewNote: (note: number) => void
  exportDrawing: () => string
  importDrawing: (text: string) => boolean
  // Troca todos os blocos por estes (com Ctrl+Z), volta a bolinha à origem e põe a câmera nela (zoom 1).
  loadBlocks: (blocks: Segment[]) => boolean
  // Apaga todos os blocos (com Ctrl+Z).
  clearBlocks: () => boolean
  getBlocks: () => Segment[]
  undo: () => void
  // Enquadra todos os blocos na tela.
  fitView: () => void
  zoomBy: (factor: number) => void
}
