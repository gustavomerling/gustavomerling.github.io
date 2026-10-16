import { useState } from 'react'
import { TASK_MANAGER_KILLS } from '../game/config'
import { MAPS } from '../game/maps'
import { formatTime } from '../game/math'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Tabs } from '../ui/Tabs'
import { Window } from '../ui/Window'

type Tab = 'basics' | 'controls' | 'maps' | 'ctrlaltdel' | 'shop'

const TABS: { id: Tab; label: string }[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'controls', label: 'Controls' },
  { id: 'maps', label: 'Maps & Bosses' },
  { id: 'ctrlaltdel', label: 'Ctrl+Alt+Del' },
  { id: 'shop', label: 'Shop' },
]

/** Weapons, items and monsters are deliberately not listed: they unlock in the Glossary as you meet them. */
export function HelpScreen({ onClose }: { onClose(): void }) {
  const [tab, setTab] = useState<Tab>('basics')

  return (
    <Window
      title="Pointer Survivor Help"
      icon="help"
      onClose={onClose}
      menu={['File', 'Edit', 'View', 'Help']}
    >
      <div className="help-body" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Tabs<Tab> tabs={TABS} active={tab} onChange={setTab}>
          <div style={{ minHeight: 280 }}>
            {tab === 'basics' && (
              <>
                <h3>What is this?</h3>
                <p>
                  Bugs, viruses and pop-ups are crawling across your computer. You are the mouse pointer. Survive until the{' '}
                  <b>boss</b> shows up at <b>{formatTime(MAPS[0].boss.at)}</b> and delete it to clear the map.
                </p>
                <ul>
                  <li>Your weapons fire on their own. You only steer.</li>
                  <li>Enemies drop <b>bits</b> (diamonds). Collect them to level up and pick an upgrade.</li>
                  <li>Rare drops: <b>floppy disks</b> (bonus KB) and <b>hearts</b> (heal).</li>
                  <li>When the run ends — win or lose — you earn <b>KB</b> to spend in the Control Panel.</li>
                </ul>
                <p>
                  Every monster, weapon and item you meet is saved to the <b>Glossary</b>. Until then it's just a{' '}
                  <i>File Not Found</i>.
                </p>
              </>
            )}
            {tab === 'controls' && (
              <>
                <h3>Steering the pointer</h3>
                <ul>
                  <li>
                    <b>Mouse:</b> move it — the pointer follows and <b>turns to face the direction you drag it</b>.
                  </li>
                  <li>
                    <b>Touch:</b> drag your finger on the screen.
                  </li>
                  <li>
                    <b>Keyboard:</b> <span className="kbd">W</span> <span className="kbd">A</span>{' '}
                    <span className="kbd">S</span> <span className="kbd">D</span> or arrow keys.
                  </li>
                  <li>
                    <span className="kbd">Esc</span> or <span className="kbd">P</span> pauses.
                  </li>
                  <li>
                    <span className="kbd">Space</span> fires Ctrl+Alt+Del when its meter is full.
                  </li>
                  <li>
                    On level up, click a choice or press <span className="kbd">1</span> <span className="kbd">2</span>{' '}
                    <span className="kbd">3</span>.
                  </li>
                </ul>
                <p>
                  Tip: <b>Left Click</b> shoots where the pointer is facing. To aim behind you, swing the pointer around in a
                  little loop.
                </p>
              </>
            )}
            {tab === 'maps' && (
              <>
                <h3>Drives</h3>
                <p>Each map is a drive in My Computer. Clearing a map's boss unlocks the next one.</p>
                {MAPS.map((m) => (
                  <div key={m.id} className="help-item">
                    <Icon name={m.icon} size={24} />
                    <div>
                      <b>
                        {m.name} ({m.path})
                      </b>{' '}
                      {'★'.repeat(m.tier)} — {m.description}
                    </div>
                  </div>
                ))}
                <p>
                  Bosses have a health bar, fire bullets and call for backup. Killing one ends the run as a win and pays a
                  big KB bonus.
                </p>
              </>
            )}
            {tab === 'ctrlaltdel' && (
              <>
                <h3>The three-finger salute</h3>
                <p>
                  Every kill charges the <b>Ctrl+Alt+Del</b> meter in the toolbar. After {TASK_MANAGER_KILLS} kills it's ready:
                  press <span className="kbd">Space</span> (or click the button) to open Task Manager and{' '}
                  <b>End Process</b> on every enemy on screen.
                </p>
                <ul>
                  <li>Clears all enemy bullets too.</li>
                  <li>Bosses are too big to end — they lose 10% HP instead.</li>
                  <li>Save it for when the screen fills up.</li>
                </ul>
              </>
            )}
            {tab === 'shop' && (
              <>
                <h3>KB and the Control Panel</h3>
                <p>
                  At the end of every run you earn KB based on time survived, kills, level and floppies. Surviving the full
                  run gives a big bonus.
                </p>
                <p>
                  Spend KB in <b>Control Panel</b> on permanent upgrades: more HP, damage, speed, pickup range... They apply
                  from the start of every future run. You can uninstall everything for a full refund to try other builds.
                </p>
              </>
            )}
          </div>
        </Tabs>
        <div className="dialog-buttons">
          <Button isDefault onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </Window>
  )
}
