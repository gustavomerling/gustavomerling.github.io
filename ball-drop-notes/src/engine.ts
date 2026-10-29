import {
  ensureAudio,
  IMPACT_MAX_SPEED,
  playClick,
  playFinish,
  playNote,
  playReward,
  playUi,
  previewNote as audioPreviewNote,
} from './audio'
import {
  NOTE_COUNT,
  NOTE_DEFAULT,
  NOTE_MIN_MIDI,
  NOTE_SUSTAIN_PER_PX,
  SCALES,
  SOFT_INTERVALS,
} from './music'
import { BALL_RADIUS, distance, distanceToSegment, integrate, predict, PREDICT_DT, segmentLength } from './physics'
import { draw, followCamera, fxClear, fxFinish, fxHit, fxReward } from './render'
import type {
  Gesture,
  MovingBall,
  Point,
  Segment,
  Settings,
  Sim,
  SimCallbacks,
  Snapshot,
  StartMode,
} from './types'

const MAX_DT = 1 / 30
const STEP_DT = 1 / 60 // duração de um passo manual
const ZOOM_MIN = 0.1
const ZOOM_MAX = 5
const MIN_BLOCK_LENGTH = 10 // comprimento mínimo, em mundo, para criar um bloco
const DELETE_TOLERANCE = 10 // distância em pixels de tela para clicar e acertar um bloco
const HANDLE_TOLERANCE = 12 // distância em pixels de tela para pegar uma alça ou a bolinha
const HISTORY_LIMIT = 100 // quantas ações o Ctrl+Z consegue desfazer
const SNAPSHOT_EVERY = 0.25 // segundos de simulação entre dois instantes guardados
const SNAPSHOT_LIMIT = 120 // 120 × 0.25 s = 30 s de histórico para rebobinar
const LOOP_SECONDS = 8 // duração do trecho em loop
const RECORD_SEGMENT = 40 // px de mundo entre os blocos criados pelo modo gravar
const PREDICT_REFRESH = 1 // segundos de simulação entre previsões refeitas, com a bolinha rodando
const FIT_MARGIN = 80 // px de tela em volta dos blocos ao enquadrar

// Cria a simulação sobre o canvas. getSettings é lido a cada quadro; callbacks avisam a interface.
// Quando a interface recebe onPause, deve marcar running = false nas configurações na hora.
export function createSim(
  canvas: HTMLCanvasElement,
  getSettings: () => Settings,
  callbacks: SimCallbacks,
): { sim: Sim; destroy: () => void } {
  const ctx = canvas.getContext('2d')!

  // touching: índices dos blocos que a bolinha está encostando agora.
  const ball: MovingBall = { x: 0, y: 0, vx: 0, vy: 0, touching: [] }
  const trail: Point[] = []
  // Pontos da trilha em que uma batida do metrônomo caiu.
  const beatMarks: Point[] = []
  const segments: Segment[] = []
  // Sequência de notas da música escolhida, em índices de nota (null = sem música).
  let sequence: number[] | null = null
  // Intervalos da escala escolhida, para sugerir notas e para a previsão de harmonia.
  let scaleIntervals = SCALES[0].intervals
  let startMode: StartMode = 'suggest'
  // Nota do pincel; null quando o pincel está desligado.
  let paintNote: number | null = null
  // Cópias dos blocos antes de cada criação ou remoção, para o Ctrl+Z.
  const history: Segment[][] = []
  // Câmera: x/y é o ponto do mundo no centro da tela.
  const view = { x: 0, y: 0, zoom: 1 }
  let selectedIndex: number | null = null
  let hoverIndex: number | null = null
  // Último instante em que cada bloco foi tocado, para o brilho.
  const flashes = new Map<Segment, { t: number; strength: number }>()
  // Notas das últimas batidas, para a recompensa sonora.
  const recentNotes: number[] = []
  // Relógio da simulação e do metrônomo, em segundos de simulação.
  let simTime = 0
  let nextBeat = 0
  let beatCount = 0
  // Instantes guardados para rebobinar, e o trecho do loop.
  const snapshots: Snapshot[] = []
  let lastSnapshot = 0
  let loopOn = false
  let loopStart: Snapshot | null = null
  let gesture: Gesture = null
  // Dedos na tela (toque), em coordenadas de tela; dois dedos movem e dão zoom na câmera.
  const touches = new Map<number, Point>()
  let pinch: { center: Point; spread: number } | null = null
  let lastTime = performance.now()
  let frameId = 0
  // Previsão guardada: só é refeita quando os blocos ou a bolinha mudam.
  let blocksVersion = 0
  let predictionKey = ''
  let prediction: ReturnType<typeof predict> | null = null

  const running = () => getSettings().running

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    canvas.style.width = `${window.innerWidth}px`
    canvas.style.height = `${window.innerHeight}px`
  }

  // Coordenadas de tela (CSS px) para o mundo.
  const screenToWorld = (sx: number, sy: number): Point => ({
    x: (sx - window.innerWidth / 2) / view.zoom + view.x,
    y: (sy - window.innerHeight / 2) / view.zoom + view.y,
  })

  // Duração de uma batida do metrônomo, pelo BPM atual.
  const beatSeconds = () => 60 / getSettings().bpm

  const changed = () => {
    blocksVersion++
    callbacks.onBlocksChange?.(segments.length)
  }

  // Avisa a interface qual bloco está selecionado.
  const notifySelection = () => {
    const seg = selectedIndex === null ? undefined : segments[selectedIndex]
    callbacks.onSelection(
      selectedIndex === null || !seg
        ? null
        : { index: selectedIndex, width: segmentLength(seg), note: seg.note, finish: seg.finish },
    )
  }

  const nearestSegment = (p: Point): number | null => {
    const tolerance = DELETE_TOLERANCE / view.zoom
    let nearest: number | null = null
    let best = tolerance
    segments.forEach((seg, i) => {
      const d = distanceToSegment(p, seg)
      if (d <= best) {
        best = d
        nearest = i
      }
    })
    return nearest
  }

  // Qual ponta do bloco está sob o ponto, se alguma.
  const endpointAt = (index: number, p: Point): 1 | 2 | null => {
    const seg = segments[index]
    const tolerance = HANDLE_TOLERANCE / view.zoom
    if (Math.hypot(p.x - seg.x1, p.y - seg.y1) <= tolerance) return 1
    if (Math.hypot(p.x - seg.x2, p.y - seg.y2) <= tolerance) return 2
    return null
  }

  // Próxima nota da escala, a partir de note, na direção dada (1 sobe, -1 desce).
  const scaleStep = (note: number, direction: 1 | -1): number => {
    let n = note + direction
    while (n >= 0 && n < NOTE_COUNT && !scaleIntervals.includes(n % 12)) n += direction
    return n
  }

  // Nota de um bloco novo: sobe um grau da escala, ou repete a nota anterior, conforme o modo.
  const suggestedNote = (): number => {
    const last = segments[segments.length - 1]
    if (!last) return NOTE_DEFAULT
    if (startMode === 'repeat') return last.note
    const up = scaleStep(last.note, 1)
    if (up < NOTE_COUNT) return up
    return Math.max(0, scaleStep(last.note, -1))
  }

  // Nota para o próximo bloco criado: a música manda, senão a sugestão.
  const nextNote = (): number =>
    sequence ? sequence[segments.length % sequence.length] : suggestedNote()

  // Com o encaixe ligado, o comprimento vai a múltiplos de 1/4 de batida, na mesma direção.
  const snapPoint = (anchor: Point, p: Point): Point => {
    if (!getSettings().snap) return p
    const dx = p.x - anchor.x
    const dy = p.y - anchor.y
    const len = Math.hypot(dx, dy)
    if (len === 0) return p
    const quantum = beatSeconds() / 4 / NOTE_SUSTAIN_PER_PX
    const target = Math.max(quantum, Math.round(len / quantum) * quantum)
    return { x: anchor.x + (dx / len) * target, y: anchor.y + (dy / len) * target }
  }

  const saveHistory = () => {
    history.push(segments.map((seg) => ({ ...seg })))
    if (history.length > HISTORY_LIMIT) history.shift()
  }

  const makeSnapshot = (): Snapshot => ({
    t: simTime,
    ball: { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy },
    touching: [...ball.touching],
    trailLength: trail.length,
    beatLength: beatMarks.length,
    nextBeat,
  })

  const pause = () => {
    callbacks.onPause()
  }

  // Volta a bolinha para (x, y) parada e zera o relógio, a trilha e o histórico.
  const restartAt = (x: number, y: number) => {
    ball.x = x
    ball.y = y
    ball.vx = 0
    ball.vy = 0
    ball.touching = []
    trail.length = 0
    beatMarks.length = 0
    flashes.clear()
    recentNotes.length = 0
    simTime = 0
    nextBeat = 0
    beatCount = 0
    lastSnapshot = 0
    loopStart = null
    snapshots.length = 0
    snapshots.push(makeSnapshot())
    fxClear()
  }

  // Resumo de harmonia: quantas notas estão na escala e quantos intervalos soam suaves.
  const harmonySummary = (): string => {
    const notes = segments.filter((seg) => !seg.finish).map((seg) => seg.note)
    if (notes.length < 2) return ''
    const inScale = notes.filter((n) => scaleIntervals.includes(n % 12)).length
    let soft = 0
    for (let i = 1; i < notes.length; i++) {
      if (SOFT_INTERVALS.includes(Math.abs(notes[i] - notes[i - 1]) % 12)) soft++
    }
    return `Notas na escala: ${inScale}/${notes.length} · intervalos suaves: ${soft}/${notes.length - 1}`
  }

  // Com a simulação rodando, a previsão feita há pouco continua valendo (a física é determinística):
  // basta pular os pontos que já passaram. Ela é refeita a cada PREDICT_REFRESH s ou quando os blocos mudam.
  let predictionBase = 0
  let predictionVersion = -1
  const currentPrediction = () => {
    const settings = getSettings()
    // A previsão aparece sempre que a simulação está pausada, para acompanhar a edição.
    if (!settings.showTrail && settings.running) return null
    const elapsed = simTime - predictionBase
    const key = `${ball.x}|${ball.y}|${ball.vx}|${ball.vy}`
    const reusable =
      prediction !== null &&
      predictionVersion === blocksVersion &&
      (settings.running ? elapsed >= 0 && elapsed < PREDICT_REFRESH : key === predictionKey)
    if (!reusable) {
      prediction = predict(ball, segments)
      predictionBase = simTime
      predictionVersion = blocksVersion
      predictionKey = key
      return prediction
    }
    const full = prediction!
    const offset = Math.round((simTime - predictionBase) / PREDICT_DT)
    if (offset <= 0) return full
    if (offset >= full.points.length - 1) return null
    const bounces: number[] = []
    const hits: number[] = []
    full.bounces.forEach((index, k) => {
      if (index < offset) return
      bounces.push(index - offset)
      hits.push(full.hits[k])
    })
    return { points: full.points.slice(offset), bounces, hits }
  }

  // Resumo de harmonia guardado: só muda quando os blocos ou a escala mudam.
  let harmonyKey = ''
  let harmony = ''
  const currentHarmony = () => {
    const key = `${blocksVersion}|${scaleIntervals.join(',')}`
    if (key !== harmonyKey) {
      harmony = harmonySummary()
      harmonyKey = key
    }
    return harmony
  }

  const render = (dt: number) => {
    const settings = getSettings()
    followCamera(view, ball, settings.running, dt)
    const dpr = canvas.width / window.innerWidth
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    draw(
      ctx,
      {
        width: window.innerWidth,
        height: window.innerHeight,
        view,
        ball,
        segments,
        trail,
        beatMarks,
        selectedIndex,
        hoverIndex,
        gesture,
        showTrail: settings.showTrail,
        running: settings.running,
        prediction: currentPrediction(),
        beatSeconds: beatSeconds(),
        simTime,
        flashes,
        harmony: currentHarmony(),
        scaleIntervals,
      },
      dt,
    )
  }

  // Um acorde curto quando as últimas quatro notas formam um movimento suave dentro da escala.
  const isRun = (notes: number[]) =>
    notes.length === 4 &&
    notes.every((n) => scaleIntervals.includes(n % 12)) &&
    notes.slice(1).every((n, i) => {
      const d = Math.abs(n - notes[i])
      return d >= 1 && d <= 4
    })

  // Toca a nota de um bloco com o impacto dado, acende o bloco e checa a recompensa.
  const onNoteHit = (i: number, impact: number) => {
    const seg = segments[i]
    const { timbre } = getSettings()
    const strength = Math.min(1, impact / IMPACT_MAX_SPEED)
    // Panorâmica pela posição da bolinha na tela: esquerda soa à esquerda.
    const pan = Math.max(-1, Math.min(1, ((ball.x - view.x) * view.zoom) / (window.innerWidth / 2)))
    playNote(seg.note, impact, segmentLength(seg), timbre, pan)
    flashes.set(seg, { t: simTime, strength })
    fxHit({ x: ball.x, y: ball.y }, seg, strength)
    callbacks.onNote?.(seg.note, impact)
    recentNotes.push(seg.note)
    if (recentNotes.length > 4) recentNotes.shift()
    if (isRun(recentNotes)) {
      playReward(recentNotes[recentNotes.length - 1], timbre)
      fxReward({ x: ball.x, y: ball.y })
      recentNotes.length = 0
    }
  }

  // Tira o relógio do ponto guardado: a bolinha, a trilha, as batidas e o metrônomo voltam a ele.
  const restore = (snap: Snapshot) => {
    ball.x = snap.ball.x
    ball.y = snap.ball.y
    ball.vx = snap.ball.vx
    ball.vy = snap.ball.vy
    ball.touching = [...snap.touching]
    trail.length = snap.trailLength
    beatMarks.length = snap.beatLength
    simTime = snap.t
    nextBeat = snap.nextBeat
    lastSnapshot = snap.t
    // Descarta os instantes depois do ponto restaurado.
    while (snapshots.length > 0 && snapshots[snapshots.length - 1].t > snap.t) snapshots.pop()
  }

  // Só a simulação real toca som; a previsão não passa o callback.
  const update = (dt: number) => {
    const reachedFinish = integrate(ball, dt, segments, onNoteHit)
    trail.push({ x: ball.x, y: ball.y })
    simTime += dt
    if (simTime >= nextBeat) {
      beatMarks.push({ x: ball.x, y: ball.y })
      if (getSettings().metronome) playClick(beatCount % 4 === 0)
      beatCount++
      nextBeat = Math.max(nextBeat + beatSeconds(), simTime)
    }
    if (simTime - lastSnapshot >= SNAPSHOT_EVERY) {
      snapshots.push(makeSnapshot())
      lastSnapshot = simTime
      if (snapshots.length > SNAPSHOT_LIMIT) snapshots.shift()
    }
    if (reachedFinish) {
      playFinish(getSettings().timbre)
      fxFinish({ x: ball.x, y: ball.y })
      callbacks.onFinish?.()
      pause()
    }
  }

  // Formato do arquivo salvo: lista de blocos, sem o estado da bolinha.
  const exportDrawing = () =>
    JSON.stringify(
      {
        version: 1,
        blocks: segments.map(({ x1, y1, x2, y2, note, finish }) => ({ x1, y1, x2, y2, note, finish })),
      },
      null,
      2,
    )

  const replaceBlocks = (blocks: Segment[]) => {
    saveHistory()
    segments.length = 0
    segments.push(...blocks.map((b) => ({ ...b })))
    selectedIndex = null
    hoverIndex = null
    flashes.clear()
    changed()
    notifySelection()
  }

  const importDrawing = (text: string): boolean => {
    if (running()) return false
    let blocks: Segment[]
    try {
      blocks = (JSON.parse(text) as { blocks: Segment[] }).blocks
    } catch {
      return false
    }
    const valid =
      Array.isArray(blocks) &&
      blocks.every(
        (b) =>
          b &&
          [b.x1, b.y1, b.x2, b.y2, b.note].every((n) => typeof n === 'number') &&
          typeof b.finish === 'boolean',
      )
    if (!valid) return false
    replaceBlocks(blocks)
    return true
  }

  // Enquadra todos os blocos e a bolinha na tela.
  const fitView = () => {
    const xs = [ball.x, ...segments.flatMap((s) => [s.x1, s.x2])]
    const ys = [ball.y, ...segments.flatMap((s) => [s.y1, s.y2])]
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    view.x = (minX + maxX) / 2
    view.y = (minY + maxY) / 2
    const zx = (window.innerWidth - FIT_MARGIN * 2) / Math.max(1, maxX - minX)
    const zy = (window.innerHeight - FIT_MARGIN * 2) / Math.max(1, maxY - minY)
    view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.min(zx, zy, 1.5)))
  }

  const loadBlocks = (blocks: Segment[]): boolean => {
    if (running()) return false
    replaceBlocks(blocks)
    restartAt(0, 0)
    // Pistas geradas são grandes: começa perto da bolinha, que a câmera vai seguir.
    view.x = ball.x
    view.y = ball.y
    view.zoom = 1
    return true
  }

  const clearBlocks = (): boolean => {
    if (running() || segments.length === 0) return false
    replaceBlocks([])
    return true
  }

  // Aplica a ordem de notas da música aos blocos, em ordem de criação.
  const setSequence = (midi: number[] | null): boolean => {
    if (running()) return false
    sequence = midi?.map((m) => m - NOTE_MIN_MIDI) ?? null
    if (sequence && segments.length > 0) {
      const notes = sequence
      saveHistory()
      segments.forEach((seg, i) => {
        seg.note = notes[i % notes.length]
      })
      changed()
      notifySelection()
    }
    return true
  }

  const setFinish = (finish: boolean) => {
    if (selectedIndex === null || running()) return
    saveHistory()
    segments[selectedIndex].finish = finish
    changed()
    notifySelection()
  }

  // Vale também com a simulação rodando, para ouvir o efeito na hora.
  const setNote = (note: number) => {
    if (selectedIndex === null) return
    saveHistory()
    segments[selectedIndex].note = note
    changed()
    notifySelection()
  }

  const deleteAt = (index: number) => {
    saveHistory()
    segments.splice(index, 1)
    selectedIndex = null
    hoverIndex = null
    changed()
    notifySelection()
    playUi('delete')
  }

  const deleteSelected = () => {
    if (selectedIndex === null || running()) return
    deleteAt(selectedIndex)
  }

  const rewind = (seconds: number) => {
    const target = simTime - seconds
    let found: Snapshot | undefined
    for (const s of snapshots) if (s.t <= target) found = s
    found ??= snapshots[0]
    if (!found) return
    restore(found)
    pause()
  }

  // Desloca o desenho inteiro em semitons.
  const transpose = (semitones: number): boolean => {
    if (running() || segments.length === 0) return false
    const notes = segments.map((seg) => seg.note + semitones)
    if (notes.some((n) => n < 0 || n >= NOTE_COUNT)) return false
    saveHistory()
    segments.forEach((seg, i) => {
      seg.note = notes[i]
    })
    changed()
    notifySelection()
    return true
  }

  // Acrescenta blocos com a duração de cada batida do padrão, depois do último bloco.
  const addPattern = (beats: number[]): boolean => {
    if (running()) return false
    saveHistory()
    const last = segments[segments.length - 1]
    let x = last ? last.x2 : 0
    const y = last ? last.y2 : 0
    for (const b of beats) {
      const len = (b * beatSeconds()) / NOTE_SUSTAIN_PER_PX
      segments.push({ x1: x, y1: y, x2: x + len, y2: y, note: nextNote(), finish: false })
      x += len
    }
    changed()
    notifySelection()
    return true
  }

  const reset = () => {
    restartAt(0, 0)
    // Recentraliza a câmera na bolinha, mesmo com a simulação pausada.
    view.x = ball.x
    view.y = ball.y
  }

  const step = () => {
    update(STEP_DT)
  }

  const loop = (now: number) => {
    const realDt = Math.min((now - lastTime) / 1000, 0.1)
    const dt = Math.min(realDt, MAX_DT)
    lastTime = now
    if (running()) {
      update(dt)
      // Com o loop ligado, volta ao trecho marcado quando ele termina.
      if (loopOn && loopStart && simTime - loopStart.t >= LOOP_SECONDS) restore(loopStart)
    }
    render(realDt)
    frameId = requestAnimationFrame(loop)
  }

  const undo = () => {
    if (running()) return
    const previous = history.pop()
    if (!previous) return
    segments.length = 0
    segments.push(...previous)
    selectedIndex = null
    hoverIndex = null
    changed()
    notifySelection()
  }

  const zoomAt = (sx: number, sy: number, factor: number) => {
    // Mantém o ponto do mundo sob o cursor fixo durante o zoom.
    const before = screenToWorld(sx, sy)
    view.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, view.zoom * factor))
    const after = screenToWorld(sx, sy)
    view.x += before.x - after.x
    view.y += before.y - after.y
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).closest('input, select, textarea')) return
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      undo()
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelected()
      return
    }
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1)
  }

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    // Apaga o bloco mais próximo do cursor, só com a simulação pausada.
    if (running()) return
    const index = nearestSegment(screenToWorld(e.clientX, e.clientY))
    if (index === null) return
    deleteAt(index)
  }

  const touchCenter = (): { center: Point; spread: number } => {
    const [a, b] = [...touches.values()]
    return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, spread: Math.max(1, distance(a, b)) }
  }

  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId)
    ensureAudio()

    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (touches.size === 2) {
        // O segundo dedo cancela o gesto do primeiro e vira pinça.
        if (gesture?.kind === 'handle') undo()
        gesture = null
        pinch = touchCenter()
        return
      }
      if (touches.size > 2 || pinch) return
    }

    // Botão do meio move a câmera, em qualquer momento.
    if (e.button === 1) {
      gesture = { kind: 'pan', last: { x: e.clientX, y: e.clientY } }
      canvas.style.cursor = 'grabbing'
      return
    }
    if (e.button !== 0) return

    const p = screenToWorld(e.clientX, e.clientY)

    // Com o pincel ligado, o clique pinta o bloco sob o cursor e o arrasto pinta os seguintes.
    if (paintNote !== null) {
      const index = nearestSegment(p)
      if (index !== null) {
        saveHistory()
        segments[index].note = paintNote
        audioPreviewNote(paintNote, getSettings().timbre)
        gesture = { kind: 'paint' }
        changed()
        notifySelection()
      }
      return
    }

    // Com a simulação pausada, arrastar a bolinha muda o ponto de partida.
    // Com Shift, o arrasto grava um caminho em blocos.
    if (!running() && distance(p, ball) <= BALL_RADIUS + HANDLE_TOLERANCE / view.zoom) {
      gesture = e.shiftKey ? { kind: 'record', points: [{ x: ball.x, y: ball.y }] } : { kind: 'place' }
      return
    }

    // Alças e criação de bloco funcionam também com a simulação rodando.
    const end = selectedIndex !== null ? endpointAt(selectedIndex, p) : null
    if (selectedIndex !== null && end !== null) {
      saveHistory()
      gesture = { kind: 'handle', index: selectedIndex, end }
    } else {
      gesture = { kind: 'create', start: p, end: p }
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch) {
      if (touches.size < 2) return
      const now = touchCenter()
      view.x -= (now.center.x - pinch.center.x) / view.zoom
      view.y -= (now.center.y - pinch.center.y) / view.zoom
      zoomAt(now.center.x, now.center.y, now.spread / pinch.spread)
      pinch = now
      return
    }
    const p = screenToWorld(e.clientX, e.clientY)
    if (!gesture) {
      hoverIndex = nearestSegment(p)
      canvas.style.cursor = hoverIndex !== null ? 'pointer' : ''
      return
    }
    if (gesture.kind === 'pan') {
      view.x -= (e.clientX - gesture.last.x) / view.zoom
      view.y -= (e.clientY - gesture.last.y) / view.zoom
      gesture.last = { x: e.clientX, y: e.clientY }
    } else if (gesture.kind === 'create') {
      gesture.end = snapPoint(gesture.start, p)
    } else if (gesture.kind === 'handle') {
      const seg = segments[gesture.index]
      const anchor = gesture.end === 1 ? { x: seg.x2, y: seg.y2 } : { x: seg.x1, y: seg.y1 }
      const q = snapPoint(anchor, p)
      if (gesture.end === 1) {
        seg.x1 = q.x
        seg.y1 = q.y
      } else {
        seg.x2 = q.x
        seg.y2 = q.y
      }
      changed()
      notifySelection()
    } else if (gesture.kind === 'place') {
      restartAt(p.x, p.y)
    } else if (gesture.kind === 'record') {
      gesture.points.push(p)
    } else if (gesture.kind === 'paint' && paintNote !== null) {
      const index = nearestSegment(p)
      if (index !== null && segments[index].note !== paintNote) {
        segments[index].note = paintNote
        audioPreviewNote(paintNote, getSettings().timbre)
        changed()
      }
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    if (touches.delete(e.pointerId) && pinch) {
      if (touches.size === 0) pinch = null
      return
    }
    if (gesture?.kind === 'create') {
      // O tamanho mínimo vale para o arrasto real, antes do encaixe, para um clique não criar bloco.
      const raw = screenToWorld(e.clientX, e.clientY)
      const length = Math.hypot(raw.x - gesture.start.x, raw.y - gesture.start.y)
      if (length >= MIN_BLOCK_LENGTH) {
        const end = snapPoint(gesture.start, raw)
        saveHistory()
        const note = nextNote()
        segments.push({ x1: gesture.start.x, y1: gesture.start.y, x2: end.x, y2: end.y, note, finish: false })
        audioPreviewNote(note, getSettings().timbre)
        playUi('create')
        changed()
      } else {
        // Sem arrasto: é um clique, então seleciona o bloco sob o cursor (ou remove a seleção).
        selectedIndex = nearestSegment(gesture.start)
        if (selectedIndex !== null) audioPreviewNote(segments[selectedIndex].note, getSettings().timbre)
        notifySelection()
      }
    } else if (gesture?.kind === 'record') {
      // Os blocos ligam pontos espaçados em RECORD_SEGMENT, ao longo do caminho gravado.
      const anchors = [gesture.points[0]]
      for (const p of gesture.points) {
        if (distance(p, anchors[anchors.length - 1]) >= RECORD_SEGMENT) anchors.push(p)
      }
      if (anchors.length > 1) saveHistory()
      for (let i = 1; i < anchors.length; i++) {
        if (distance(anchors[i], anchors[i - 1]) < MIN_BLOCK_LENGTH) continue
        segments.push({
          x1: anchors[i - 1].x,
          y1: anchors[i - 1].y,
          x2: anchors[i].x,
          y2: anchors[i].y,
          note: nextNote(),
          finish: false,
        })
      }
      changed()
      notifySelection()
    }
    gesture = null
    canvas.style.cursor = ''
  }

  const sim: Sim = {
    reset,
    step,
    setNote,
    setFinish,
    deleteSelected,
    deselect: () => {
      selectedIndex = null
      notifySelection()
    },
    setPaint: (note) => {
      paintNote = note
    },
    setStartMode: (mode) => {
      startMode = mode
    },
    setScaleIndex: (index) => {
      scaleIntervals = SCALES[index].intervals
    },
    setSequence,
    setLoop: (on) => {
      loopOn = on
    },
    // Marca o início do trecho do loop no instante atual.
    markLoopStart: () => {
      loopStart = makeSnapshot()
    },
    rewind,
    transpose,
    addPattern,
    previewNote: (note) => audioPreviewNote(note, getSettings().timbre),
    exportDrawing,
    importDrawing,
    loadBlocks,
    clearBlocks,
    getBlocks: () => segments.map((s) => ({ ...s })),
    undo,
    fitView,
    zoomBy: (factor) => zoomAt(window.innerWidth / 2, window.innerHeight / 2, factor),
  }

  restartAt(0, 0)
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', onKeyDown)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('contextmenu', onContextMenu)
  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('pointercancel', onPointerUp)
  frameId = requestAnimationFrame(loop)

  const destroy = () => {
    cancelAnimationFrame(frameId)
    window.removeEventListener('resize', resize)
    window.removeEventListener('keydown', onKeyDown)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('contextmenu', onContextMenu)
    canvas.removeEventListener('pointerdown', onPointerDown)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerup', onPointerUp)
    canvas.removeEventListener('pointercancel', onPointerUp)
  }

  return { sim, destroy }
}
