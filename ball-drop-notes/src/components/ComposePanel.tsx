import { useEffect, useMemo, useRef, useState } from 'react'
import { ensureAudio, playNote, playUi } from '../audio'
import { TRACK_STYLES, type TrackStyle } from '../generator'
import { composeMelody, MOODS, NOTE_SUSTAIN_PER_PX, SCALES, SONGS, songMelody } from '../music'
import type { Melody } from '../types'
import { ChipGroup, Section, Slider, Switch } from './controls'
import { Icon } from './Icon'
import { MelodyRoll } from './MelodyRoll'
import type { Recording } from './PianoDock'
import { scaleForNotes } from './ui'

export type GenerateRequest = {
  melody: Melody
  bpm: number
  scaleIndex: number
  style: TrackStyle
  finish: boolean
  title: string
}

const LENGTHS = [
  { value: 2, label: 'Curtinha' },
  { value: 4, label: 'Média' },
  { value: 8, label: 'Longa' },
]

const newSeed = () => Math.floor(Math.random() * 1e9)

// Toca a melodia na hora, agendando cada nota com setTimeout. Mostra qual nota está tocando.
function useMelodyPreview(timbre: string) {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const timers = useRef<number[]>([])

  const stop = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    setPlayingIndex(null)
  }

  const play = (melody: Melody, bpm: number) => {
    stop()
    ensureAudio()
    const beatSeconds = 60 / bpm
    let t = 0
    melody.notes.forEach((note, i) => {
      const seconds = (melody.beats[i] ?? 1) * beatSeconds
      // A duração da nota vem da "largura" equivalente, como na pista.
      const width = (seconds * 0.9) / NOTE_SUSTAIN_PER_PX
      const at = t
      timers.current.push(
        window.setTimeout(() => {
          playNote(note, 1000, width, timbre)
          setPlayingIndex(i)
        }, at * 1000),
      )
      t += seconds
    })
    timers.current.push(window.setTimeout(() => setPlayingIndex(null), t * 1000 + 150))
  }

  useEffect(() => {
    const list = timers
    return () => list.current.forEach((t) => window.clearTimeout(t))
  }, [])

  return { playingIndex, play, stop, playing: playingIndex !== null }
}

export function ComposePanel({
  timbre,
  recording,
  onGenerate,
  onPreviewNote,
  onOpenPiano,
}: {
  timbre: string
  // Última melodia gravada no piano, se houver.
  recording: Recording | null
  onGenerate: (request: GenerateRequest) => void
  onPreviewNote: (note: number) => void
  onOpenPiano: () => void
}) {
  // Fonte da melodia: 'mood' (composta na hora), 'recorded' (gravada no piano) ou o índice de uma música pronta.
  const [source, setSource] = useState<'mood' | 'recorded' | number>('mood')
  const [mood, setMood] = useState(MOODS[0]?.id ?? 'happy')
  const [bars, setBars] = useState(4)
  const [seed, setSeed] = useState(newSeed)
  const [bpmOverride, setBpmOverride] = useState<number | null>(null)
  const [style, setStyle] = useState<TrackStyle>(TRACK_STYLES[0]?.value ?? 'zigzag')
  const [finish, setFinish] = useState(true)
  const preview = useMelodyPreview(timbre)

  // Uma gravação nova vira a melodia do painel, no tempo em que foi gravada.
  const [seenRecording, setSeenRecording] = useState(recording)
  if (recording !== seenRecording) {
    setSeenRecording(recording)
    if (recording) {
      preview.stop()
      setBpmOverride(null)
      setSource('recorded')
    }
  }

  const composition = useMemo(() => composeMelody({ mood, bars, seed }), [mood, bars, seed])
  const song = typeof source === 'number' ? SONGS[source] : null
  const recorded = source === 'recorded' ? recording : null
  const melody: Melody = useMemo(
    () =>
      recorded
        ? { notes: recorded.notes, beats: recorded.beats }
        : song
          ? songMelody(song)
          : { notes: composition.notes, beats: composition.beats },
    [recorded, song, composition],
  )
  const suggestedBpm = recorded ? recorded.bpm : song ? song.bpm : composition.bpm
  const bpm = bpmOverride ?? suggestedBpm
  const scaleIndex = recorded || song ? scaleForNotes(melody.notes) : composition.scaleIndex
  const title = recorded ? 'Gravada por você' : song ? song.title : composition.title
  const totalBeats = melody.beats.reduce((a, b) => a + b, 0)
  const seconds = Math.round((totalBeats * 60) / bpm)

  // Trocar a melodia interrompe a pré-escuta e volta ao tempo sugerido.
  const changeMelody = (apply: () => void) => {
    preview.stop()
    setBpmOverride(null)
    apply()
  }

  return (
    <div className="compose">
      <Section title="Clima">
        <div className="mood-grid" role="radiogroup" aria-label="Clima da música">
          {MOODS.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={source === 'mood' && mood === m.id}
              className={`mood-card mood-${i % 6}`}
              onClick={() => {
                playUi('click')
                changeMelody(() => {
                  setSource('mood')
                  setMood(m.id)
                  setSeed(newSeed())
                })
              }}
            >
              <span className="mood-label">{m.label}</span>
              <span className="mood-sub">
                {SCALES[m.scaleIndex]?.label} · {m.bpm} BPM
              </span>
            </button>
          ))}
        </div>
        <ChipGroup
          label="Tamanho"
          options={LENGTHS}
          value={source === 'mood' ? bars : -1}
          onChange={(v) =>
            changeMelody(() => {
              setSource('mood')
              setBars(v)
            })
          }
        />
      </Section>

      <Section title="Ou toque você mesmo">
        <div className="song-list">
          {recording && (
            <button
              type="button"
              className="song-btn"
              aria-pressed={source === 'recorded'}
              onClick={() => {
                playUi('click')
                changeMelody(() => setSource('recorded'))
              }}
            >
              <span className="song-title">Gravada por você</span>
              <span className="song-sub">
                {recording.notes.length} notas · {recording.bpm} BPM
              </span>
            </button>
          )}
          <button type="button" className="song-btn" onClick={onOpenPiano}>
            <span className="song-title">{recording ? 'Gravar outra no piano' : 'Gravar no piano'}</span>
            <span className="song-sub">Teclas A S D F G H J K, com metrônomo</span>
          </button>
        </div>
      </Section>

      <Section title="Ou uma música pronta">
        <div className="song-list">
          {SONGS.map((s, i) => (
            <button
              key={s.title}
              type="button"
              className="song-btn"
              aria-pressed={source === i}
              onClick={() => {
                playUi('click')
                changeMelody(() => setSource(i))
              }}
            >
              <span className="song-title">{s.title}</span>
              <span className="song-sub">{s.bpm} BPM</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Sua melodia" hint={`${melody.notes.length} notas · ~${seconds} s`}>
        <div className="melody-card">
          <div className="melody-title">{title}</div>
          {melody.notes.length > 0 ? (
            <MelodyRoll melody={melody} playingIndex={preview.playingIndex} onNoteClick={onPreviewNote} />
          ) : (
            <p className="muted">Essa música não cabe no alcance de notas.</p>
          )}
          <div className="melody-actions">
            <button
              type="button"
              className="btn"
              disabled={melody.notes.length === 0}
              onClick={() => (preview.playing ? preview.stop() : preview.play(melody, bpm))}
            >
              <Icon name={preview.playing ? 'stop' : 'headphones'} size={18} />
              {preview.playing ? 'Parar' : 'Ouvir'}
            </button>
            <button
              type="button"
              className="btn"
              title={source === 'mood' ? 'Compor outra melodia' : 'Compor uma melodia nova neste clima'}
              onClick={() => {
                playUi('click')
                changeMelody(() => {
                  setSource('mood')
                  setSeed(newSeed())
                })
              }}
            >
              <Icon name="dice" size={18} />
              Outra
            </button>
          </div>
        </div>
        <Slider
          label="Tempo"
          value={bpm}
          min={40}
          max={200}
          display={`${bpm} BPM`}
          onChange={(v) => {
            preview.stop()
            setBpmOverride(v)
          }}
        />
        {bpm === suggestedBpm ? (
          <p className="muted small">Tempo sugerido para esta melodia.</p>
        ) : (
          <button type="button" className="link-btn" onClick={() => setBpmOverride(null)}>
            Voltar ao sugerido ({suggestedBpm} BPM)
          </button>
        )}
      </Section>

      <Section title="Pista">
        <ChipGroup label="Estilo da pista" options={TRACK_STYLES} value={style} onChange={setStyle} />
        <Switch
          label="Linha de chegada"
          description="Pausa e comemora quando a bolinha termina"
          checked={finish}
          onChange={setFinish}
        />
      </Section>

      <div className="compose-cta">
        <button
          type="button"
          className="btn btn-primary btn-big"
          disabled={melody.notes.length === 0}
          onClick={() => {
            preview.stop()
            onGenerate({ melody, bpm, scaleIndex, style, finish, title })
          }}
        >
          <Icon name="sparkle" size={20} />
          Gerar pista e tocar
        </button>
      </div>
    </div>
  )
}
