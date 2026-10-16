import { MAP_BY_ID } from '../game/maps'
import { formatTime } from '../game/math'
import type { SaveData } from '../game/save'
import type { RunResult } from '../game/types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { ProgressBar } from '../ui/ProgressBar'
import { Window } from '../ui/Window'

interface Props {
  result: RunResult
  save: SaveData
  /** a map that was just unlocked by this run, if any */
  unlockedMap?: string
  onAgain(): void
  onMaps(): void
  onShop(): void
  onMenu(): void
}

export function ResultsScreen({ result, save, unlockedMap, onAgain, onMaps, onShop, onMenu }: Props) {
  const map = MAP_BY_ID[result.mapId]
  const unlocked = unlockedMap ? MAP_BY_ID[unlockedMap] : null
  return (
    <Window
      title={`Run Report — ${map.name}`}
      icon="license"
      onClose={onMenu}
      status={[result.victory ? 'Map cleared' : 'Run terminated', `${save.kb} KB total`]}
    >
      <div className="dialog-row" style={{ marginBottom: 8 }}>
        <Icon name={result.victory ? 'computer' : 'warning'} size={32} />
        <div>
          <b style={{ fontSize: 14 }}>{result.victory ? `${map.name} cleared!` : 'Your pointer crashed.'}</b>
          <div>
            You earned <b>{result.earned} KB</b>.
          </div>
        </div>
      </div>
      {unlocked && (
        <div className="lore" style={{ fontStyle: 'normal', marginBottom: 8 }}>
          <b>New drive detected:</b> {unlocked.name} ({unlocked.path}) is now available in My Computer.
        </div>
      )}
      <fieldset className="group-box">
        <legend>Statistics</legend>
        <dl className="stat-list">
          <dt>Time</dt>
          <dd>{formatTime(result.time)}</dd>
          <dt>Enemies closed</dt>
          <dd>{result.kills}</dd>
          <dt>Level reached</dt>
          <dd>{result.level}</dd>
          <dt>Floppies found</dt>
          <dd>{result.floppies}</dd>
        </dl>
        <div style={{ marginTop: 8 }}>
          <ProgressBar value={Math.min(result.time, map.boss.at)} max={map.boss.at} label="Progress to the boss" />
        </div>
      </fieldset>
      <div className="dialog-buttons">
        <Button onClick={onShop}>Upgrades</Button>
        <Button onClick={onMaps}>Change map</Button>
        <Button isDefault autoFocus onClick={onAgain}>
          {unlocked ? `Go to ${unlocked.name}` : 'Run again'}
        </Button>
      </div>
    </Window>
  )
}
