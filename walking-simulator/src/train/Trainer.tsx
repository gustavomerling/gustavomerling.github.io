import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Model } from '../editor/model'
import { forgetBrain, loadBrain, saveBrain } from '../editor/storage'
import type { TerrainKind } from '../physics/ground'
import type { World } from '../physics/world'
import { attachBrain, buildEpisode, EPISODE_STEPS } from '../evolution/episode'
import type { WorkerIn, WorkerOut } from '../evolution/worker'
import { Canvas, type Look } from '../render/Canvas'
import { LookToggle } from '../render/LookToggle'

type Props = { model: Model; groundY: number; terrain: TerrainKind; look: Look; onLookChange: (look: Look) => void; onBack: () => void }
type Point = { generation: number; best: number; mean: number }

// Velocidades do replay (multiplicador de tempo).
const SPEEDS = [1, 5, 20]

// Treino: roda a neuroevolução num Web Worker, mostra o gráfico de fitness e repete o melhor indivíduo da geração.
export function Trainer({ model, groundY, terrain, look, onLookChange, onBack }: Props) {
  const workerRef = useRef<Worker | null>(null)
  const bestWeights = useRef<Float32Array | null>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const signalsRef = useRef<HTMLCanvasElement>(null)
  const [history, setHistory] = useState<Point[]>([])
  const [distance, setDistance] = useState(0)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState(1)
  // Cada replay é um mundo novo com os pesos mais recentes; troca quando o episódio termina.
  const [replayKey, setReplayKey] = useState(0)
  // Trocar a semente reinicia o treino; `fresh` descarta o cérebro salvo e começa do zero.
  const [seed, setSeed] = useState(() => Date.now())
  const [fresh, setFresh] = useState(false)
  const [resumedFrom, setResumedFrom] = useState<number | null>(null)

  useEffect(() => {
    bestWeights.current = null
    setHistory([])
    setDistance(0)
    setRunning(true)
    setReplayKey((k) => k + 1)
    const worker = new Worker(new URL('../evolution/worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<WorkerOut>) => {
      const m = e.data
      const first = bestWeights.current === null
      bestWeights.current = m.weights
      setDistance(m.distance)
      setHistory((h) => [...h, { generation: m.generation, best: m.best, mean: m.mean }])
      saveBrain(model, terrain, { weights: m.weights, generation: m.generation, distance: m.distance })
      if (first) setReplayKey((k) => k + 1)
    }
    if (fresh) forgetBrain()
    const saved = fresh ? null : loadBrain(model, terrain)
    setResumedFrom(saved ? saved.generation : null)
    const start: WorkerIn = { type: 'start', model, groundY, terrain, seed, seedWeights: saved?.weights, startGeneration: saved?.generation }
    worker.postMessage(start)
    return () => worker.terminate()
  }, [model, groundY, terrain, seed, fresh])

  const toggle = () => {
    const msg: WorkerIn = { type: running ? 'pause' : 'resume' }
    workerRef.current?.postMessage(msg)
    setRunning(!running)
  }

  const replayWorld = useMemo(() => {
    if (!bestWeights.current) return null
    const ep = buildEpisode(model, groundY, terrain)
    attachBrain(ep, bestWeights.current)
    return ep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey, model, groundY, terrain])

  const last = history[history.length - 1]
  const bestEver = history.reduce((max, p) => Math.max(max, p.best), -Infinity)

  return (
    <section>
      <div className="my-2 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={onBack}>
          <ArrowLeft /> Voltar ao editor
        </Button>
        <Button variant="outline" onClick={toggle}>
          {running ? <Pause /> : <Play />} {running ? 'Pausar' : 'Continuar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFresh(true)
            setSeed(Date.now())
          }}
          title="Descarta o cérebro treinado e começa do zero"
        >
          <RotateCcw /> Recomeçar
        </Button>
        <ToggleGroup
          type="single"
          variant="outline"
          value={String(speed)}
          onValueChange={(v) => v && setSpeed(Number(v))}
          aria-label="Velocidade do replay"
        >
          {SPEEDS.map((s) => (
            <ToggleGroupItem key={s} value={String(s)} className="px-3">
              {s}×
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <LookToggle look={look} onChange={onLookChange} />
      </div>
      <div className="stage-wrap">
        {replayWorld ? (
          <Canvas
            world={replayWorld.world}
            body={replayWorld.body}
            look={look}
            follow
            speed={speed}
            onFrame={(w) => {
              if (w.steps >= EPISODE_STEPS) setReplayKey((k) => k + 1)
              if (progressRef.current) progressRef.current.style.width = `${Math.min(100, (100 * w.steps) / EPISODE_STEPS)}%`
              if (signalsRef.current) drawSignals(signalsRef.current, w)
            }}
          />
        ) : (
          <div className="stage" />
        )}
        <div className="pointer-events-none absolute top-3 right-3 rounded-lg border bg-card/85 p-2 text-xs shadow-sm backdrop-blur-sm">
          <p className="mb-1 text-muted-foreground">Sinais dos músculos</p>
          <canvas ref={signalsRef} width={SIGNALS_W} height={SIGNALS_H} style={{ width: SIGNALS_W, height: SIGNALS_H }} />
        </div>
        {/* Painel flutuante: estatísticas e gráfico sobre a cena, sem roubar altura do palco. */}
        <div className="pointer-events-none absolute top-3 left-3 w-[300px] max-w-[calc(100%-24px)] rounded-lg border bg-card/85 p-3 text-xs shadow-sm backdrop-blur-sm">
          {last ? (
            <dl className="mb-2 grid grid-cols-3 gap-x-3 gap-y-0.5">
              <dt className="text-muted-foreground">Geração</dt>
              <dt className="text-muted-foreground">Distância</dt>
              <dt className="text-muted-foreground">Recorde</dt>
              <dd className="text-base font-semibold tabular-nums">{last.generation}</dd>
              <dd className="text-base font-semibold tabular-nums">{distance.toFixed(0)} px</dd>
              <dd className="text-base font-semibold tabular-nums">{bestEver.toFixed(0)}</dd>
            </dl>
          ) : (
            <p className="mb-2 text-sm">
              {resumedFrom !== null ? `Continuando o treino salvo (geração ${resumedFrom})…` : 'Calculando a primeira geração…'}
            </p>
          )}
          <FitnessChart history={history} />
          <p className="mt-1.5 text-muted-foreground">
            <span style={{ color: '#6b46c1' }}>■</span> melhor · <span style={{ color: '#9a978f' }}>■</span> média da geração. A cena
            repete o melhor da última geração.
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded bg-muted" aria-hidden>
            <div ref={progressRef} className="h-full bg-primary/70" style={{ width: 0 }} />
          </div>
        </div>
      </div>
    </section>
  )
}

const SIGNALS_W = 180
const SIGNALS_H = 56

// Uma barra por músculo: para cima e vermelha = contraindo, para baixo e azul = esticando.
// Exemplares de trás (apagados) e da frente lado a lado mostram que recebem sinais diferentes.
function drawSignals(canvas: HTMLCanvasElement, world: World) {
  const ctx = canvas.getContext('2d')!
  const n = world.muscles.length
  ctx.clearRect(0, 0, SIGNALS_W, SIGNALS_H)
  ctx.fillStyle = 'rgba(128, 128, 128, 0.35)'
  ctx.fillRect(0, SIGNALS_H / 2, SIGNALS_W, 1)
  if (n === 0) return
  const bar = SIGNALS_W / n
  world.muscles.forEach((m, i) => {
    const back = m.a.depth < 0 || m.b.depth < 0
    const h = (m.activation * (SIGNALS_H / 2 - 2))
    ctx.globalAlpha = back ? 0.45 : 1
    ctx.fillStyle = m.activation >= 0 ? '#e0533d' : '#2f85be'
    ctx.fillRect(i * bar + 1, SIGNALS_H / 2 - Math.max(0, h), Math.max(1, bar - 2), Math.abs(h))
  })
  ctx.globalAlpha = 1
}

// Gráfico de fitness por geração: melhor (roxo) e média (cinza).
function FitnessChart({ history }: { history: Point[] }) {
  const W = 274
  const H = 70
  if (history.length < 2) return <svg width={W} height={H} className="block rounded-md bg-background/60" />
  const values = history.flatMap((p) => [p.best, p.mean])
  const min = Math.min(0, ...values)
  const max = Math.max(1, ...values)
  const x = (i: number) => 6 + (i / (history.length - 1)) * (W - 12)
  const y = (v: number) => H - 6 - ((v - min) / (max - min)) * (H - 12)
  const line = (pick: (p: Point) => number) => history.map((p, i) => `${x(i)},${y(pick(p))}`).join(' ')
  return (
    <svg width={W} height={H} className="block rounded-md bg-background/60" role="img" aria-label="Fitness por geração">
      <line x1={6} x2={W - 6} y1={y(0)} y2={y(0)} stroke="currentColor" opacity={0.2} />
      <polyline points={line((p) => p.mean)} fill="none" stroke="#9a978f" strokeWidth={2} />
      <polyline points={line((p) => p.best)} fill="none" stroke="#6b46c1" strokeWidth={2} />
    </svg>
  )
}
