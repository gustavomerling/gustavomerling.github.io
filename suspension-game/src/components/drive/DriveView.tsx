import { useEffect, useMemo, useRef, useState } from 'react'
import { medalFor } from '../../game/medals'
import { SIM_DT, Simulation, type DriveInput, type SimEvent, type SimSnapshot } from '../../game/physics/Simulation'
import { getRecord, saveRecord, type GameOptions, type TrackRecord } from '../../game/storage'
import { generateTerrain, type Difficulty } from '../../game/terrain/generate'
import type { CarDesign, CarPoses } from '../../game/types'
import { useGameAudio, type GameAudio } from '../../hooks/useEngineSound'
import { useKeys } from '../../hooks/useKeys'
import { useSize } from '../../hooks/useSize'
import { CarView } from '../parts/CarView'
import { FuelCanShape } from '../parts/FuelCanShape'
import { PropShape } from '../parts/PropShape'
import { StarShape } from '../parts/StarShape'
import { Background } from './Background'
import { Effects } from './effects'
import { EffectsLayer } from './EffectsLayer'
import { Hud, type Toast } from './Hud'
import { TerrainView } from './TerrainView'
import { TouchControls } from './TouchControls'

const PX_PER_M = 48
const MAX_STEPS = 12 // por frame (evita "espiral da morte" em máquina lenta)
const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

/** Melhor percurso por pista+carro, só na memória da sessão. */
interface Ghost {
  score: number
  frames: { t: number; car: CarPoses }[]
}
const ghosts = new Map<string, Ghost>()

interface Props {
  design: CarDesign
  seed: number
  difficulty: Difficulty
  options: GameOptions
  /** Modo vitrine (fundo do menu): piloto automático, sem HUD nem som. */
  demo?: boolean
  onToggleSound?: () => void
  onBack?: () => void
  onNewTrack?: () => void
}

const has = (k: Set<string>, ...names: string[]) => names.some((n) => k.has(n))

/** Lê o primeiro controle conectado (Xbox/PlayStation no layout padrão). */
function readGamepad() {
  const gp = navigator.getGamepads?.().find((g) => g)
  if (!gp) return null
  const b = (i: number) => (gp.buttons[i]?.value ?? 0) > 0.3
  const ax = gp.axes[0] ?? 0
  return {
    gas: b(7) || b(12),
    down: b(6) || b(13),
    left: ax < -0.4 || b(14),
    right: ax > 0.4 || b(15),
    nitro: b(0),
    handbrake: b(1),
    respawn: b(2),
    flip: b(3),
    pause: b(9),
  }
}

export function DriveView({ design, seed, difficulty, options, demo = false, onToggleSound, onBack, onNewTrack }: Props) {
  const terrain = useMemo(() => generateTerrain(seed, difficulty), [seed, difficulty])
  const ghostKey = useMemo(() => `${seed}:${difficulty}:${JSON.stringify(design)}`, [seed, difficulty, design])
  const keys = useKeys()
  const audio = useGameAudio(!demo)
  const [ref, size] = useSize<HTMLDivElement>()
  const [runId, setRunId] = useState(0)
  const [snap, setSnap] = useState<SimSnapshot | null>(null)
  const [paused, setPaused] = useState(false)
  const [userZoom, setUserZoom] = useState(1)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showKeys, setShowKeys] = useState(true)
  const [record, setRecord] = useState<TrackRecord>(() => getRecord(seed, difficulty))
  const camera = useRef({ x: 0, y: -2, zoom: 1, shake: 0 })
  const simRef = useRef<Simulation | null>(null)
  const fx = useRef(new Effects())
  const ghostFrame = useRef<CarPoses | null>(null)
  const live = useRef({ paused, options, demo })
  live.current = { paused, options, demo }

  useEffect(() => setRecord(getRecord(seed, difficulty)), [seed, difficulty])
  useEffect(() => {
    if (audio.current) audio.current.muted = !options.sound
  }, [options.sound, audio])

  // loop da simulação: recria tudo quando muda carro, pista ou reinicia
  useEffect(() => {
    const sim = new Simulation(design, terrain, demo ? { fragile: false, fuel: false } : { fragile: options.fragile, fuel: options.fuel })
    simRef.current = sim
    camera.current = { x: 0, y: -2, zoom: 1, shake: 0 }
    fx.current.clear()
    setPaused(false)
    setToasts([])
    setShowKeys(true)
    const hideKeys = setTimeout(() => setShowKeys(false), 9000)

    const ghost = ghosts.get(ghostKey)
    let ghostIdx = 0
    const recording: Ghost = { score: 0, frames: [] }
    let committed = false
    const commitGhost = () => {
      if (committed || demo) return
      committed = true
      const s = sim.snapshot()
      recording.score = s.score
      const best = ghosts.get(ghostKey)
      if (!best || s.score > best.score) ghosts.set(ghostKey, recording)
    }

    let raf = 0
    let last = performance.now()
    let acc = 0
    let frameNo = 0
    let toastId = 0
    let prevPad: ReturnType<typeof readGamepad> = null
    let demoBest = 0
    let demoStuck = 0

    const onEvent = (e: SimEvent, a: GameAudio | null) => {
      const f = fx.current
      const toast = (text: string, color: string, points: number | undefined, icon: Toast['icon']) =>
        setToasts((ts) => [...ts.filter((t) => performance.now() - t.t0 < 1600), { id: toastId++, text, color, points, icon, t0: performance.now() }])
      switch (e.type) {
        case 'star':
          f.starBurst(e.x, e.y, e.points ?? 0)
          break
        case 'fuel':
          f.pickupBurst(e.x, e.y, '#ff5252', 'Cheio!')
          toast('Tanque cheio!', '#ff8a80', undefined, 'fuel')
          break
        case 'flip':
        case 'air':
          toast(e.text ?? '', '#7ee0ff', e.points, 'trick')
          break
        case 'checkpoint':
          toast(e.text ?? '', '#b9f6ca', undefined, 'checkpoint')
          break
        case 'boost':
          toast('Turbo!', '#ffb74d', undefined, 'boost')
          break
        case 'jump':
          toast('Boing!', '#ff8a80', undefined, 'jump')
          break
        case 'crash':
          f.crash(e.x, e.y)
          camera.current.shake = 0.6
          break
        case 'finish':
          for (let i = 0; i < 5; i++) f.pickupBurst(e.x + (i - 2) * 0.8, e.y - 1 - Math.random(), ['#ffd400', '#ff6b3d', '#7ee0ff', '#b9f6ca', '#e84393'][i], '')
          break
      }
      a?.sfx(e.type)
    }

    const tick = (now: number) => {
      const frame = Math.min(0.1, (now - last) / 1000)
      last = now
      const { paused: isPaused, options: opt, demo: isDemo } = live.current
      const k = keys.current
      const pad = isDemo ? null : readGamepad()
      const speedX = sim.chassis.getLinearVelocity().x
      let input: DriveInput
      if (isDemo) {
        const a = sim.chassis.getAngle()
        input = { throttle: 1, tilt: a < -0.3 ? 1 : a > 0.3 ? -1 : 0, brake: false, nitro: false }
      } else {
        const gas = has(k, 'ArrowUp', 'w', 'W') || !!pad?.gas
        const down = has(k, 'ArrowDown', 's', 'S') || !!pad?.down
        const left = has(k, 'ArrowLeft', 'a', 'A') || !!pad?.left
        const right = has(k, 'ArrowRight', 'd', 'D') || !!pad?.right
        // ↓ freia enquanto anda para frente; parado (ou já de ré) vira marcha à ré
        const braking = down && !gas && speedX > 0.6
        input = {
          throttle: gas ? 1 : down && !braking ? -1 : 0,
          tilt: ((right ? 1 : 0) - (left ? 1 : 0)) as -1 | 0 | 1,
          brake: braking || k.has(' ') || !!pad?.handbrake,
          nitro: has(k, 'Shift') || !!pad?.nitro,
        }
        // botões do controle: só na borda (apertou agora)
        if (pad && prevPad) {
          if (pad.pause && !prevPad.pause) setPaused((p) => !p)
          if (pad.flip && !prevPad.flip) sim.rightCar()
          if (pad.respawn && !prevPad.respawn) sim.respawn()
        }
        prevPad = pad
      }

      if (!isPaused) {
        acc += frame
        sim.setInput(input)
        let steps = 0
        while (acc >= SIM_DT && steps++ < MAX_STEPS) {
          sim.step()
          acc -= SIM_DT
        }
        if (steps >= MAX_STEPS) acc = 0
      }
      const s = sim.snapshot()
      for (const e of sim.drainEvents()) onEvent(e, isDemo ? null : audio.current)
      if (s.ended) commitGhost()

      // efeitos
      if (!isPaused) {
        if (opt.particles) for (const d of s.dust) fx.current.dust(d, s.speed)
        fx.current.update(frame)
      }

      // fantasma: grava a cada 3 frames e reproduz pelo tempo da corrida
      if (!isDemo && !isPaused && !s.ended && frameNo++ % 3 === 0) recording.frames.push({ t: s.time, car: s.car })
      if (ghost && opt.ghost && !isDemo) {
        while (ghostIdx + 1 < ghost.frames.length && ghost.frames[ghostIdx + 1].t <= s.time) ghostIdx++
        ghostFrame.current = ghost.frames[ghostIdx]?.car ?? null
      } else ghostFrame.current = null

      // câmera
      const c = s.car.chassis
      const cam = camera.current
      cam.x += (c.x + s.speed * 0.35 - cam.x) * 0.08
      cam.y += (c.y - 1 - cam.y) * 0.08
      const targetZoom = (isDemo ? 0.85 : 1) - Math.min(0.4, Math.abs(s.speed) / 45) // afasta com a velocidade
      cam.zoom += (targetZoom - cam.zoom) * 0.03
      cam.shake = Math.max(0, cam.shake - frame)

      audio.current?.engine(Math.min(1, s.wheelSpin / 35), isPaused || s.ended ? 0 : Math.abs(input.throttle), isPaused ? 0 : 1)

      // vitrine: recomeça quando termina ou empaca
      if (isDemo) {
        if (c.x > demoBest + 1) {
          demoBest = c.x
          demoStuck = 0
        } else demoStuck += frame
        if (s.ended || demoStuck > 5) {
          setRunId((n) => n + 1)
          return
        }
      }

      setSnap(s)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(hideKeys)
      commitGhost()
    }
  }, [design, terrain, runId, keys, audio, demo, ghostKey, options.fragile, options.fuel])

  // recordes
  useEffect(() => {
    if (!snap || demo) return
    const dist = Math.max(0, Math.min(snap.car.chassis.x, terrain.finishX))
    const stars = snap.stars.filter(Boolean).length
    const medal = medalFor(snap)
    const betterTime = snap.finishTime !== null && (record.bestTime === null || snap.finishTime < record.bestTime)
    if (dist > record.bestDistance + 1 || betterTime || stars > record.bestStars || snap.score > record.bestScore || medal > record.bestMedal) {
      const next: TrackRecord = {
        bestDistance: Math.max(record.bestDistance, dist),
        bestTime: betterTime ? snap.finishTime : record.bestTime,
        bestStars: Math.max(record.bestStars, stars),
        bestScore: Math.max(record.bestScore, snap.score),
        bestMedal: Math.max(record.bestMedal, medal),
      }
      // durante a corrida só grava de vez em quando (o snapshot muda todo frame)
      if (snap.ended || dist > record.bestDistance + 10 || medal > record.bestMedal) {
        setRecord(next)
        saveRecord(seed, difficulty, next)
      }
    }
  }, [snap, record, seed, difficulty, terrain.finishX, demo])

  // atalhos
  useEffect(() => {
    if (demo) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      if (k === 'r') setRunId((n) => n + 1)
      else if (k === 'n') onNewTrack?.()
      else if (k === 'g' || k === 'escape') onBack?.()
      else if (k === 'p') setPaused((p) => !p)
      else if (k === 'm') onToggleSound?.()
      else if (k === 'f') simRef.current?.rightCar()
      else if (k === 'c') {
        simRef.current?.respawn()
        setPaused(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onBack, onNewTrack, onToggleSound, demo])

  const cam = camera.current
  const scale = PX_PER_M * userZoom * cam.zoom
  const halfW = size.width / 2 / scale
  const visible = (x: number) => x > cam.x - halfW - 6 && x < cam.x + halfW + 6
  const shake = cam.shake > 0 ? { x: (Math.random() - 0.5) * cam.shake * 30, y: (Math.random() - 0.5) * cam.shake * 30 } : { x: 0, y: 0 }

  return (
    <div
      className={demo ? 'drive demo' : 'drive'}
      ref={ref}
      onWheel={demo ? undefined : (e) => setUserZoom((z) => Math.min(2.5, Math.max(0.4, z * (e.deltaY > 0 ? 0.9 : 1.1))))}
    >
      <Background camX={cam.x} camY={cam.y} scale={scale} width={size.width} height={size.height} />
      <svg className="world" width={size.width} height={size.height}>
        <g transform={`translate(${size.width / 2 + shake.x} ${size.height / 2 + shake.y}) scale(${scale}) translate(${-cam.x} ${-cam.y})`}>
          <TerrainView terrain={terrain} />
          {terrain.checkpoints.slice(1).map((cp, i) =>
            visible(cp.x) ? (
              <g key={`cp${i}`} transform={`translate(${cp.x} ${cp.y})`} className="checkpoint">
                <line y2={-2.2} stroke="#455a64" strokeWidth={0.06} />
                <path d="M0 -2.2L0.8 -1.95L0 -1.7Z" fill={snap && snap.checkpoint > i ? '#66bb6a' : '#29b6f6'} />
              </g>
            ) : null,
          )}
          {terrain.stars.map((s, i) =>
            snap && !snap.stars[i] && visible(s.x) ? (
              <g key={i} transform={`translate(${s.x} ${s.y})`}>
                <StarShape />
              </g>
            ) : null,
          )}
          {terrain.fuel.map((f, i) =>
            snap && !snap.fuelCans[i] && visible(f.x) && (options.fuel || !demo) ? (
              <g key={`f${i}`} transform={`translate(${f.x} ${f.y})`}>
                <FuelCanShape />
              </g>
            ) : null,
          )}
          {snap?.props.map((p, i) =>
            visible(p.poses[0]?.x ?? p.spec.x) || p.spec.kind === 'bridge' ? <PropShape key={i} prop={p} /> : null,
          )}
          {ghostFrame.current && (
            <g className="ghost">
              <CarView design={design} poses={ghostFrame.current} />
            </g>
          )}
          {snap && <CarView design={design} poses={snap.car} />}
          <EffectsLayer fx={fx.current} />
        </g>
      </svg>
      {snap && !demo && (
        <Hud
          snap={snap}
          terrain={terrain}
          record={record}
          medal={medalFor(snap)}
          paused={paused}
          muted={!options.sound}
          toasts={toasts}
          ghostX={ghostFrame.current?.chassis.x ?? null}
          showKeys={showKeys || paused}
          onBack={() => onBack?.()}
          onReset={() => setRunId((n) => n + 1)}
          onNewTrack={() => onNewTrack?.()}
          onPause={() => setPaused((p) => !p)}
          onMute={() => onToggleSound?.()}
          onRightCar={() => simRef.current?.rightCar()}
          onRespawn={() => {
            simRef.current?.respawn()
            setPaused(false)
          }}
        />
      )}
      {isTouch && !demo && <TouchControls keys={keys} />}
    </div>
  )
}
