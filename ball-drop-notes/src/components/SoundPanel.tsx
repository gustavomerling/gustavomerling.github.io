import { TIMBRES } from '../audio'
import { ChipGroup, Section, Slider, Switch } from './controls'

export function SoundPanel({
  volume,
  onVolume,
  timbre,
  onTimbre,
  bpm,
  onBpm,
  metronome,
  onMetronome,
  onTryTimbre,
}: {
  volume: number
  onVolume: (v: number) => void
  timbre: string
  onTimbre: (t: string) => void
  bpm: number
  onBpm: (v: number) => void
  metronome: boolean
  onMetronome: (on: boolean) => void
  onTryTimbre: () => void
}) {
  return (
    <>
      <Section title="Volume">
        <Slider
          label="Volume geral"
          value={Math.round(volume * 100)}
          min={0}
          max={100}
          display={volume === 0 ? 'mudo' : `${Math.round(volume * 100)}%`}
          onChange={(v) => onVolume(v / 100)}
        />
      </Section>

      <Section title="Instrumento" hint="vale para a pista inteira">
        <ChipGroup
          label="Timbre"
          options={TIMBRES}
          value={timbre}
          onChange={(t) => {
            onTimbre(t)
            onTryTimbre()
          }}
        />
      </Section>

      <Section title="Tempo">
        <Slider label="Andamento" value={bpm} min={40} max={200} display={`${bpm} BPM`} onChange={onBpm} />
        <Switch
          label="Metrônomo"
          description="Cliques no tempo enquanto a bolinha cai"
          checked={metronome}
          onChange={onMetronome}
        />
        <p className="muted small">
          As marcas rosa na linha de previsão mostram as batidas, e os pontos amarelos, os quiques.
        </p>
      </Section>
    </>
  )
}
