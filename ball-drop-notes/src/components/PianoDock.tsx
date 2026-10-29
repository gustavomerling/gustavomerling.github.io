import { type CSSProperties, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { ensureAudio, holdNote, playClick, playUi, TIMBRES } from '../audio'
import { NOTE_COUNT, NOTE_NAMES, noteName } from '../music'
import { quantizeFaithful, quantizeRefined, type Refined, type Take } from '../music/quantize'
import type { Melody } from '../types'
import { Icon } from './Icon'
import { isTypingTarget, noteColor } from './ui'

// Teclado do computador como piano, no layout de DAW: fileira do meio são as teclas brancas,
// a de cima os sustenidos. O número é o semitom a partir do dó da oitava escolhida.
const KEY_MAP: Record<string, number> = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
  k: 12, o: 13, l: 14, p: 15, ';': 16, ç: 16,
}
const KEY_LABEL: Record<number, string> = Object.fromEntries(
  Object.entries(KEY_MAP)
    .filter(([key]) => key !== 'ç')
    .map(([key, semitone]) => [semitone, key.toUpperCase()]),
)
const SPAN = 17 // semitons visíveis: de dó até o mi da oitava seguinte
const OCTAVES = [0, 1, 2] // dó3, dó4, dó5
const BLACK = [1, 3, 6, 8, 10]
const COUNT_IN = 4 // batidas de contagem antes de gravar
// Gravação pronta: a versão fiel (como foi tocada) e a refinada (tempo e grade ajustados).
export type Recording = {
  id: number
  bpm: number // tempo do metrônomo na gravação
  faithful: Melody
  refined: Refined
}

type RecState = { phase: 'idle' } | { phase: 'count' | 'rec'; start: number; beat: number }

export function PianoDock({
  open,
  enabled,
  timbre,
  onTimbre,
  bpm,
  onBpm,
  onClose,
  onRecorded,
}: {
  open: boolean
  // Falso com a tela de boas-vindas ou a ajuda abertas: o teclado não toca.
  enabled: boolean
  timbre: string
  onTimbre: (timbre: string) => void
  bpm: number
  onBpm: (bpm: number) => void
  onClose: () => void
  onRecorded: (recording: Recording) => void
}) {
  const [octave, setOctave] = useState(1)
  const [active, setActive] = useState<Set<number>>(() => new Set())
  const [rec, setRecState] = useState<RecState>({ phase: 'idle' })
  const [takeCount, setTakeCount] = useState(0)
  const takes = useRef<Take[]>([])
  // Notas soando agora (tecla pressionada) e a função que solta cada uma.
  const releases = useRef(new Map<number, () => void>())
  const timer = useRef(0)
  // Cópia do estado da gravação para os handlers de teclado, atualizada junto com o estado.
  const recRef = useRef(rec)
  const setRec = (next: RecState) => {
    recRef.current = next
    setRecState(next)
  }

  // Trocar de oitava solta as teclas pressionadas (o keyup viria para a oitava nova).
  const changeOctave = (delta: number) => {
    for (const note of [...releases.current.keys()]) release(note)
    setOctave((o) => Math.max(OCTAVES[0], Math.min(OCTAVES[OCTAVES.length - 1], o + delta)))
  }

  const base = octave * 12

  // Batida atual da gravação (negativa durante a contagem), ou null sem gravar.
  const recBeat = () => {
    const r = recRef.current
    return r.phase === 'idle' ? null : (performance.now() - r.start) / (60000 / bpm)
  }

  const press = (note: number) => {
    if (note < 0 || note >= NOTE_COUNT) return
    ensureAudio()
    const pan = ((note - base) / SPAN) * 1.2 - 0.6
    releases.current.get(note)?.()
    releases.current.set(note, holdNote(note, timbre, pan))
    setActive((set) => new Set(set).add(note))
    const beat = recBeat()
    // Notas tocadas já na contagem também valem (anacruse): a melodia começa na primeira nota.
    if (beat !== null) {
      takes.current.push({ beat, note })
      setTakeCount(takes.current.length)
    }
  }

  const release = (note: number) => {
    const stop = releases.current.get(note)
    if (!stop) return
    stop()
    releases.current.delete(note)
    // A gravação guarda quando a tecla subiu, para a duração da nota.
    const beat = recBeat()
    if (beat !== null) {
      const take = takes.current.findLast((t) => t.note === note && t.end === undefined)
      if (take) take.end = beat
    }
    setActive((set) => {
      if (!set.has(note)) return set
      const next = new Set(set)
      next.delete(note)
      return next
    })
  }

  const stopTimer = () => {
    window.clearTimeout(timer.current)
    timer.current = 0
  }

  const startRecording = () => {
    ensureAudio()
    stopTimer()
    takes.current = []
    setTakeCount(0)
    const beatMs = 60000 / bpm
    const start = performance.now() + COUNT_IN * beatMs
    // Metrônomo: agenda cada batida a partir do relógio, para não acumular atraso.
    const tick = (k: number) => {
      playClick(((k % 4) + 4) % 4 === 0)
      setRec({ phase: k < 0 ? 'count' : 'rec', start, beat: k })
      timer.current = window.setTimeout(() => tick(k + 1), start + (k + 1) * beatMs - performance.now())
    }
    tick(-COUNT_IN)
  }

  const stopRecording = () => {
    // Teclas ainda pressionadas terminam agora.
    const now = recBeat()
    if (now !== null) for (const t of takes.current) t.end ??= now
    stopTimer()
    setRec({ phase: 'idle' })
    const faithful = quantizeFaithful(takes.current, bpm)
    const refined = quantizeRefined(takes.current, bpm)
    takes.current = []
    setTakeCount(0)
    if (faithful.notes.length === 0) {
      playUi('error')
      return
    }
    onRecorded({ id: Date.now(), bpm, faithful, refined })
  }

  const cancelRecording = () => {
    stopTimer()
    takes.current = []
    setTakeCount(0)
    setRec({ phase: 'idle' })
  }

  useEffect(() => stopTimer, [])

  // Fechar o piano cancela uma gravação em andamento (para o metrônomo, que é um timer).
  useEffect(() => {
    if (open || recRef.current.phase === 'idle') return
    stopTimer()
    takes.current = []
    recRef.current = { phase: 'idle' }
    // oxlint-disable-next-line react/set-state-in-effect
    setRecState(recRef.current)
  }, [open])

  // Teclado: na fase de captura, para o Espaço parar a gravação antes do play/pause do App.
  const handlers = useRef({
    down: (_e: KeyboardEvent) => {},
    up: (_e: KeyboardEvent) => {},
    releaseAll: () => {},
  })
  useEffect(() => {
    handlers.current.releaseAll = () => {
      for (const note of [...releases.current.keys()]) release(note)
    }
    handlers.current.down = (e) => {
      if (!enabled || e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return
      if (e.key === ' ' && recRef.current.phase !== 'idle') {
        e.preventDefault()
        e.stopImmediatePropagation()
        stopRecording()
        return
      }
      const key = e.key.toLowerCase()
      if (key === 'z' || key === 'x') {
        if (!e.repeat) changeOctave(key === 'z' ? -1 : 1)
        return
      }
      const semitone = KEY_MAP[key]
      if (semitone === undefined) return
      e.preventDefault()
      if (!e.repeat) press(base + semitone)
    }
    handlers.current.up = (e) => {
      const semitone = KEY_MAP[e.key.toLowerCase()]
      if (semitone !== undefined) release(base + semitone)
    }
  })
  useEffect(() => {
    const down = (e: KeyboardEvent) => handlers.current.down(e)
    const up = (e: KeyboardEvent) => handlers.current.up(e)
    // Sem foco, o keyup nunca chega: solta tudo.
    const blur = () => handlers.current.releaseAll()
    window.addEventListener('keydown', down, true)
    window.addEventListener('keyup', up, true)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      window.removeEventListener('blur', blur)
      blur()
    }
  }, [])

  // Mouse e toque: arrastar por cima das teclas toca cada uma (glissando).
  const onKeyPointerDown = (note: number) => (e: ReactPointerEvent) => {
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    press(note)
  }
  const onKeyPointerEnter = (note: number) => (e: ReactPointerEvent) => {
    if (e.buttons & 1) press(note)
  }

  const semitones = Array.from({ length: SPAN }, (_, i) => i)
  const whites = semitones.filter((s) => !BLACK.includes(s % 12))
  const whiteWidth = 100 / whites.length
  const blackWidth = whiteWidth * 0.62

  const recording = rec.phase !== 'idle'
  const status =
    rec.phase === 'count'
      ? `Prepare-se… ${-rec.beat}`
      : rec.phase === 'rec'
        ? `Gravando · compasso ${Math.floor(rec.beat / 4) + 1} · ${takeCount} ${takeCount === 1 ? 'nota' : 'notas'}`
        : 'Toque com o mouse ou com o teclado'

  return (
    <section className="piano-dock glass" data-open={open} aria-label="Piano" aria-hidden={!open}>
      <header className="piano-head">
        <div className="piano-group">
          <button
            type="button"
            className="icon-btn"
            aria-label="Oitava abaixo (Z)"
            title="Oitava abaixo (Z)"
            disabled={octave === OCTAVES[0]}
            onClick={() => changeOctave(-1)}
          >
            <Icon name="minus" size={16} />
          </button>
          <span className="piano-octave" title="Oitava">
            {NOTE_NAMES[0]}
            {octave + 3}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Oitava acima (X)"
            title="Oitava acima (X)"
            disabled={octave === OCTAVES[OCTAVES.length - 1]}
            onClick={() => changeOctave(1)}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>

        <select
          className="piano-select"
          aria-label="Timbre"
          value={timbre}
          onChange={(e) => onTimbre(e.target.value)}
        >
          {TIMBRES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <label className="piano-bpm">
          <span>{bpm} BPM</span>
          <input
            type="range"
            min={50}
            max={180}
            value={bpm}
            disabled={recording}
            onChange={(e) => onBpm(Number(e.target.value))}
          />
        </label>

        <div className="piano-group piano-rec-group">
          {recording ? (
            <>
              <button type="button" className="btn btn-small piano-rec is-recording" onClick={stopRecording} title="Parar e levar para o Compor (Espaço)">
                <Icon name="stop" size={16} />
                Parar
              </button>
              <button type="button" className="icon-btn" aria-label="Descartar gravação" title="Descartar gravação" onClick={cancelRecording}>
                <Icon name="trash" size={16} />
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-small piano-rec" onClick={startRecording} title="Grava com metrônomo depois de 4 batidas de contagem">
              <span className="rec-dot" aria-hidden="true" />
              Gravar
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Fechar piano" title="Fechar piano" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </header>

      <div className="piano-status" data-phase={rec.phase} aria-live="polite">
        {recording && (
          <span className="beat-dots" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={(((rec.beat % 4) + 4) % 4) === i ? 'beat-dot is-on' : 'beat-dot'} />
            ))}
          </span>
        )}
        {status}
      </div>

      <div className="piano-keys" role="group" aria-label={`Teclas, a partir de ${noteName(base)}`}>
        {whites.map((s, i) => {
          const note = base + s
          return (
            <button
              key={s}
              type="button"
              tabIndex={-1}
              className={`piano-key white${active.has(note) ? ' is-down' : ''}`}
              style={{ left: `${i * whiteWidth}%`, width: `${whiteWidth}%`, '--note': noteColor(note) } as CSSProperties}
              disabled={note >= NOTE_COUNT}
              onPointerDown={onKeyPointerDown(note)}
              onPointerEnter={onKeyPointerEnter(note)}
              onPointerUp={() => release(note)}
              onPointerLeave={() => release(note)}
              aria-label={noteName(note)}
            >
              <span className="key-note">{NOTE_NAMES[note % 12]}</span>
              {KEY_LABEL[s] && <kbd className="key-kbd">{KEY_LABEL[s]}</kbd>}
            </button>
          )
        })}
        {semitones
          .filter((s) => BLACK.includes(s % 12))
          .map((s) => {
            const note = base + s
            // A tecla preta fica na divisa entre as brancas vizinhas.
            const left = whites.filter((w) => w < s).length * whiteWidth - blackWidth / 2
            return (
              <button
                key={s}
                type="button"
                tabIndex={-1}
                className={`piano-key black${active.has(note) ? ' is-down' : ''}`}
                style={{ left: `${left}%`, width: `${blackWidth}%`, '--note': noteColor(note) } as CSSProperties}
                disabled={note >= NOTE_COUNT}
                onPointerDown={onKeyPointerDown(note)}
                onPointerEnter={onKeyPointerEnter(note)}
                onPointerUp={() => release(note)}
                onPointerLeave={() => release(note)}
                aria-label={noteName(note)}
              >
                {KEY_LABEL[s] && <kbd className="key-kbd">{KEY_LABEL[s]}</kbd>}
              </button>
            )
          })}
      </div>
    </section>
  )
}
