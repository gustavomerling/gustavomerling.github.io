import { useState, type ReactNode } from 'react'
import { ENEMIES, isActive } from '../game/enemies'
import { enemyVisualSize } from '../game/enemies/helpers'
import { PASSIVES } from '../game/items/passives'
import type { DiscoveryKind, EnemyDef, IconName, PassiveDef, WeaponDef } from '../game/types'
import { STARTING_WEAPON, WEAPONS } from '../game/weapons'
import { Button } from '../ui/Button'
import { EnemyPreview } from '../ui/EnemyPreview'
import { Icon } from '../ui/Icon'
import { SpriteSheet } from '../ui/SpriteSheet'
import { Window } from '../ui/Window'

const ZOOMS = [1, 2, 3, 4, 6]
const PREVIEW_W = 420
const PREVIEW_H = 236
const DEV = import.meta.env.DEV

/** Largest whole zoom (pixel art stays crisp) that keeps the monster comfortably inside the preview. */
function fitZoom(def: EnemyDef): number {
  return Math.max(1, Math.min(6, Math.floor((PREVIEW_H * 0.45) / enemyVisualSize(def))))
}

function thumbZoom(def: EnemyDef): number {
  return Math.min(1, 22 / enemyVisualSize(def))
}

interface Entry {
  id: string
  name: string
  found: boolean
  concept?: boolean
  thumb: ReactNode
}

const TABS: { id: DiscoveryKind; label: string }[] = [
  { id: 'enemies', label: 'Monsters' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'items', label: 'Items' },
]

/**
 * Glossary of everything in the game. Entries unlock the first time they show up in a run;
 * until then they're "File Not Found". In dev builds, 'concept' monsters and a reveal toggle
 * turn it into a design bench.
 */
export function GlossaryScreen({ discovered, onClose }: { discovered: string[]; onClose(): void }) {
  const [tab, setTab] = useState<DiscoveryKind>('enemies')
  const [selected, setSelected] = useState<Record<DiscoveryKind, string>>({
    enemies: ENEMIES[0].id,
    weapons: WEAPONS[0].id,
    items: PASSIVES[0].id,
  })
  const [revealAll, setRevealAll] = useState(false)
  const known = new Set(discovered)
  const isFound = (kind: DiscoveryKind, id: string) => revealAll || known.has(`${kind}:${id}`)

  const enemies = ENEMIES.filter((e) => isActive(e) || DEV)
  const entries: Record<DiscoveryKind, Entry[]> = {
    enemies: enemies.map((e) => ({
      id: e.id,
      name: e.name,
      // concepts aren't in the game yet, so they're always visible on the dev bench
      found: !isActive(e) || isFound('enemies', e.id),
      concept: !isActive(e),
      thumb: <EnemyPreview def={e} width={24} height={24} zoom={thumbZoom(e)} />,
    })),
    weapons: WEAPONS.map((w) => ({ id: w.id, name: w.name, found: isFound('weapons', w.id), thumb: <Icon name={w.icon} size={24} /> })),
    items: PASSIVES.map((p) => ({ id: p.id, name: p.name, found: isFound('items', p.id), thumb: <Icon name={p.icon} size={24} /> })),
  }

  const list = entries[tab]
  const current = list.find((e) => e.id === selected[tab]) ?? list[0]
  const kinds = Object.keys(entries) as DiscoveryKind[]
  const foundCount = kinds.reduce((n, k) => n + entries[k].filter((e) => e.found && !e.concept).length, 0)
  const total = kinds.reduce((n, k) => n + entries[k].filter((e) => !e.concept).length, 0)

  let detail: ReactNode
  if (!current.found) detail = <NotFound kind={tab} index={list.indexOf(current) + 1} />
  else if (tab === 'enemies') detail = <MonsterDetail key={current.id} def={ENEMIES.find((e) => e.id === current.id)!} />
  else if (tab === 'weapons') detail = <WeaponDetail def={WEAPONS.find((w) => w.id === current.id)!} />
  else detail = <ItemDetail def={PASSIVES.find((p) => p.id === current.id)!} />

  return (
    <Window
      title={`Glossary — ${current.found ? current.name : 'File Not Found'}`}
      icon="bug"
      onClose={onClose}
      menu={['File', 'Edit', 'View', 'Help']}
      status={[`Found ${foundCount} of ${total} entries`, DEV ? 'dev build' : 'v0.3']}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
        <div className="glossary-tabs">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === tab}
                className={`tab ${t.id === tab ? 'active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label} ({entries[t.id].filter((e) => e.found && !e.concept).length}/{entries[t.id].filter((e) => !e.concept).length})
              </button>
            ))}
          </div>
          {DEV && (
            <label style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 'auto' }}>
              <input type="checkbox" checked={revealAll} onChange={(e) => setRevealAll(e.target.checked)} /> Reveal all (dev)
            </label>
          )}
        </div>
        <div className="glossary" style={{ flex: 1, minHeight: 0 }}>
          <div className="list-view glossary-list" role="listbox" aria-label="Entries">
            {list.map((e) => (
              <button
                key={e.id}
                role="option"
                aria-selected={e.id === current.id}
                className={`${e.id === current.id ? 'selected' : ''} ${e.found ? '' : 'missing'}`}
                onClick={() => setSelected((s) => ({ ...s, [tab]: e.id }))}
              >
                {e.found ? e.thumb : <Icon name="notFound" size={24} />}
                <span>{e.found ? e.name : '????????'}</span>
                {e.concept && <span className="tag">concept</span>}
              </button>
            ))}
          </div>
          <div className="glossary-detail">{detail}</div>
        </div>
      </div>
    </Window>
  )
}

function NotFound({ kind, index }: { kind: DiscoveryKind; index: number }) {
  const folder = kind === 'enemies' ? 'Monsters' : kind === 'weapons' ? 'Weapons' : 'Items'
  const how = kind === 'enemies' ? 'Encounter it' : 'Get it offered on a level-up'
  return (
    <div className="not-found">
      <div className="dialog-row">
        <Icon name="warning" size={32} />
        <div>
          <b>Cannot find 'C:\Glossary\{folder}\entry{String(index).padStart(2, '0')}.dat'.</b>
          <p>Make sure the path and file name are correct and that the entry has been discovered.</p>
          <p>{how} during a run to restore this file.</p>
        </div>
      </div>
    </div>
  )
}

function MonsterDetail({ def }: { def: EnemyDef }) {
  const [zoom, setZoom] = useState(0)
  const [walk, setWalk] = useState(true)
  const [hitbox, setHitbox] = useState(false)
  const [compare, setCompare] = useState(false)
  const [flashKey, setFlashKey] = useState(0)
  const active = isActive(def)

  return (
    <>
      <div className="glossary-preview">
        <EnemyPreview
          def={def}
          width={PREVIEW_W}
          height={PREVIEW_H}
          zoom={zoom || fitZoom(def)}
          walk={walk}
          hitbox={hitbox}
          compare={compare}
          flashKey={flashKey}
          background="#3a6ea5"
          fluid
        />
      </div>

      <div className="glossary-tools">
        <label>
          Zoom
          <select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}>
            <option value={0}>Fit ({fitZoom(def)}x)</option>
            {ZOOMS.map((z) => (
              <option key={z} value={z}>
                {z}x
              </option>
            ))}
          </select>
        </label>
        <label>
          <input type="checkbox" checked={walk} onChange={(e) => setWalk(e.target.checked)} /> Walk
        </label>
        <label>
          <input type="checkbox" checked={hitbox} onChange={(e) => setHitbox(e.target.checked)} /> Hitbox
        </label>
        <label>
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Size vs. pointer
        </label>
        <Button onClick={() => setFlashKey((k) => k + 1)}>Hit flash</Button>
      </div>

      <div>
        <b style={{ fontSize: 14 }}>{def.name}</b> {def.boss && <span className="tag boss">BOSS</span>}{' '}
        {!active && <span className="tag">concept</span>}
        <p style={{ margin: '4px 0' }}>{def.description}</p>
      </div>
      {def.lore && <div className="lore">“{def.lore}”</div>}

      {def.sprite && (
        <fieldset className="group-box">
          <legend>Sprite</legend>
          <SpriteSheet sprite={def.sprite} />
        </fieldset>
      )}

      <StatTable
        rows={[
          ['Status', active ? 'Active' : 'Concept (not in the game yet)'],
          ['Appears', def.appears ?? '—'],
          ['HP', `${def.hp}${def.boss ? '' : ' (scaled by wave)'}`],
          ['Speed', `${def.speed} px/s`],
          ['Contact damage', String(def.damage)],
          ['XP dropped', String(def.xp)],
          ['Hitbox radius', `${def.radius} px`],
          ['Knockback resist', `${Math.round((def.knockbackResist ?? 0) * 100)}%`],
          [
            'Source',
            <>
              <code>src/game/enemies/{def.id}.ts</code>
              {def.sprite && (
                <>
                  <br />
                  <code>src/game/enemies/{def.id}.sprite.ts</code>
                </>
              )}
            </>,
          ],
        ]}
      />
    </>
  )
}

function BigIconHeader({ icon, name, description, tag }: { icon: IconName; name: string; description: string; tag?: string }) {
  return (
    <div className="glossary-header">
      <div className="glossary-bigicon">
        <Icon name={icon} size={64} />
      </div>
      <div>
        <b style={{ fontSize: 14 }}>{name}</b> {tag && <span className="tag">{tag}</span>}
        <p style={{ margin: '4px 0' }}>{description}</p>
      </div>
    </div>
  )
}

// the registry holds weapons with different state shapes
function WeaponDetail({ def }: { def: WeaponDef<any> }) {
  return (
    <>
      <BigIconHeader
        icon={def.icon}
        name={def.name}
        description={def.description}
        tag={def.id === STARTING_WEAPON ? 'starting weapon' : undefined}
      />
      <fieldset className="group-box">
        <legend>Levels</legend>
        <StatTable rows={Array.from({ length: def.maxLevel }, (_, i): [string, ReactNode] => [`Level ${i + 1}`, def.levelText(i + 1)])} />
      </fieldset>
      <StatTable
        rows={[
          ['Max level', String(def.maxLevel)],
          ['Source', <code key="src">src/game/weapons/{def.id}.ts</code>],
        ]}
      />
    </>
  )
}

function ItemDetail({ def }: { def: PassiveDef }) {
  return (
    <>
      <BigIconHeader icon={def.icon} name={def.name} description={`${def.description} per level.`} />
      <StatTable
        rows={[
          ['Per level', def.description],
          ['Max level', String(def.maxLevel)],
          ['Source', <code key="src">src/game/items/passives.ts</code>],
        ]}
      />
    </>
  )
}

function StatTable({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="stat-table">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
