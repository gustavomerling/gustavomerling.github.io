import { formatTime } from '../game/math'
import type { SaveData } from '../game/save'
import type { AppId } from '../os/apps'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Window } from '../ui/Window'

interface Props {
  save: SaveData
  onOpen(id: AppId): void
  onStartRun(): void
}

export function WelcomeScreen({ save, onOpen, onStartRun }: Props) {
  return (
    <Window title="Welcome to Pointer Survivor" icon="computer" className="welcome" status={['Ready', `${save.kb} KB free`]}>
      <div className="welcome-banner">
        <Icon name="cursor" size={44} />
        <div>
          <h1>Pointer Survivor 2000</h1>
          <p>Your desktop is under attack. You are the pointer.</p>
        </div>
      </div>
      <div className="welcome-grid">
        <div className="welcome-actions">
          <Button big isDefault autoFocus onClick={onStartRun}>
            <Icon name="cursor" /> Start Run
            <small>pick a drive</small>
          </Button>
          <Button big onClick={() => onOpen('shop')}>
            <Icon name="controlPanel" /> Upgrades
            <small>spend KB</small>
          </Button>
          <Button big onClick={() => onOpen('glossary')}>
            <Icon name="bug" /> Glossary
          </Button>
          <Button big onClick={() => onOpen('help')}>
            <Icon name="help" /> How to Play
          </Button>
        </div>
        <fieldset className="group-box" style={{ margin: 0 }}>
          <legend>System Properties</legend>
          <dl className="stat-list">
            <dt>Memory</dt>
            <dd>{save.kb} KB</dd>
            <dt>Runs</dt>
            <dd>{save.runs}</dd>
            <dt>Best time</dt>
            <dd>{formatTime(save.bestTime)}</dd>
            <dt>Best kills</dt>
            <dd>{save.bestKills}</dd>
            <dt>Total kills</dt>
            <dd>{save.totalKills}</dd>
          </dl>
        </fieldset>
      </div>
    </Window>
  )
}
