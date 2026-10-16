import { useState } from 'react'
import { ENEMY_BY_ID } from '../game/enemies'
import { isMapUnlocked, MAPS, MAP_BY_ID } from '../game/maps'
import { formatTime } from '../game/math'
import { clearedMaps, type SaveData } from '../game/save'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Window } from '../ui/Window'

interface Props {
  save: SaveData
  onStart(mapId: string): void
  onClose(): void
}

/** "My Computer": each map is a drive. Locked ones say the drive is not ready. */
export function MapSelectScreen({ save, onStart, onClose }: Props) {
  const cleared = clearedMaps(save)
  const firstOpen = [...MAPS].reverse().find((m) => isMapUnlocked(m, cleared)) ?? MAPS[0]
  const [selected, setSelected] = useState(firstOpen.id)
  const map = MAP_BY_ID[selected]
  const unlocked = isMapUnlocked(map, cleared)
  const record = save.maps[map.id]
  const boss = ENEMY_BY_ID[map.boss.id]
  const bossKnown = save.discovered.includes(`enemies:${boss.id}`)

  return (
    <Window
      title="My Computer"
      icon="computer"
      onClose={onClose}
      menu={['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help']}
      status={[`${MAPS.length} object(s)`, `${cleared.length} cleared`]}
    >
      <div className="drives" role="listbox" aria-label="Maps">
        {MAPS.map((m) => {
          const open = isMapUnlocked(m, cleared)
          return (
            <button
              key={m.id}
              role="option"
              aria-selected={m.id === selected}
              className={`drive ${m.id === selected ? 'selected' : ''} ${open ? '' : 'locked'}`}
              onClick={() => setSelected(m.id)}
              onDoubleClick={() => open && onStart(m.id)}
            >
              <span className="drive-icon">
                <Icon name={m.icon} size={32} />
                {!open && (
                  <span className="drive-lock">
                    <Icon name="lock" />
                  </span>
                )}
              </span>
              <span className="drive-name">{m.name}</span>
              <span className="drive-path">{m.path}</span>
              {(save.maps[m.id]?.clears ?? 0) > 0 && <span className="drive-check">✔ cleared</span>}
            </button>
          )
        })}
      </div>

      <fieldset className="group-box">
        <legend>
          {map.name} ({map.path})
        </legend>
        {unlocked ? (
          <>
            <p style={{ margin: '0 0 8px' }}>{map.description}</p>
            <dl className="stat-list">
              <dt>Boss (4:00)</dt>
              <dd>{bossKnown ? boss.name : '???'}</dd>
              <dt>Difficulty</dt>
              <dd>{'★'.repeat(map.tier)}</dd>
              <dt>Clears</dt>
              <dd>{record?.clears ?? 0}</dd>
              <dt>Best time</dt>
              <dd>{record ? formatTime(record.bestTime) : '—'}</dd>
            </dl>
          </>
        ) : (
          <div className="dialog-row">
            <Icon name="warning" size={32} />
            <p style={{ margin: 0 }}>
              <b>{map.path} is not accessible.</b>
              <br />
              The device is not ready. Defeat the boss of {MAP_BY_ID[map.unlockAfter ?? '']?.name ?? 'the previous map'} to
              unlock it.
            </p>
          </div>
        )}
      </fieldset>

      <div className="dialog-buttons">
        <Button onClick={onClose}>Cancel</Button>
        <Button isDefault autoFocus disabled={!unlocked} onClick={() => onStart(map.id)}>
          Open
        </Button>
      </div>
    </Window>
  )
}
