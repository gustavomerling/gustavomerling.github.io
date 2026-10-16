import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Window } from '../ui/Window'

const VERSION = '0.2'

/** Credits roll, top to bottom. `h` = section heading. */
const CREDITS: { h?: string; lines: string[] }[] = [
  { lines: ['Pointer Survivor 2000', `Version ${VERSION} (Build 2195)`] },
  { h: 'Created by', lines: ['Gustavo Merling'] },
  { h: 'Game Design & Direction', lines: ['Gustavo Merling'] },
  { h: 'Programming', lines: ['Gustavo Merling', 'Claude Code'] },
  { h: 'Pixel Art', lines: ['Claude Code (placeholder sprites)'] },
  { h: 'Sound', lines: ['WebAudio oscillators', 'doing their best'] },
  { h: 'Built with', lines: ['React · TypeScript · Vite', 'Canvas 2D · WebAudio'] },
  { h: 'Inspired by', lines: ['Vampire Survivors', 'The Windows 2000 desktop', 'Every pop-up ad of 1999'] },
  { h: 'Monster Consultants', lines: ['Bug', 'Virus', 'Pop-up Ad', 'Hourglass (still loading)', 'Blue Screen'] },
  { h: 'Special Thanks', lines: ['You, for clicking', 'Ctrl+Alt+Del'] },
  { lines: ['No pointers were harmed', 'in the making of this game.'] },
]

export function CreditsScreen({ onClose }: { onClose(): void }) {
  return (
    <Window title="About Pointer Survivor" icon="cursor" onClose={onClose}>
      <div className="welcome-banner">
        <Icon name="cursor" size={40} />
        <div>
          <h1>Pointer Survivor 2000</h1>
          <p>Professional · Version {VERSION}</p>
        </div>
      </div>
      <div className="boot-stripe" />
      <div style={{ padding: '10px 4px 0' }}>
        <p style={{ margin: '0 0 8px' }}>
          This product is licensed to:
          <br />
          <b>Player One</b>
        </p>
        <div className="credits-roll sunken" aria-label="Credits">
          <div className="credits-track">
            {CREDITS.map((c, i) => (
              <div key={i} className="credits-block">
                {c.h && <div className="credits-h">{c.h}</div>}
                {c.lines.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <p style={{ margin: '8px 0 0', color: '#404040' }}>© 2026 Gustavo Merling. Not affiliated with any operating system.</p>
      </div>
      <div className="dialog-buttons">
        <Button isDefault autoFocus onClick={onClose}>
          OK
        </Button>
      </div>
    </Window>
  )
}
