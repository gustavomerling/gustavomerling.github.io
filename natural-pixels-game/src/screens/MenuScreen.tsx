import { BookOpen, Info, Play } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { Navigate } from '../app/screens.ts'
import { Button } from '../ui/Button.tsx'
import { FallingParticles } from '../ui/FallingParticles.tsx'
import { Panel } from '../ui/Panel.tsx'

type MenuPanel = 'how-to-play' | 'about' | null

export function MenuScreen({ onNavigate }: { onNavigate: Navigate }) {
  const [panel, setPanel] = useState<MenuPanel>(null)
  const closePanel = useCallback(() => setPanel(null), [])

  return (
    <main className="screen menu">
      <FallingParticles count={50} />
      <div className="menu__content">
        <h1 className="title title--small">
          Natural <span className="title__accent">Pixels</span>
        </h1>
        <nav className="menu__list">
          <Button icon={Play} onClick={() => onNavigate('game')} autoFocus>
            Play
          </Button>
          <Button variant="ghost" icon={BookOpen} onClick={() => setPanel('how-to-play')}>
            How to Play
          </Button>
          <Button variant="ghost" icon={Info} onClick={() => setPanel('about')}>
            About
          </Button>
        </nav>
      </div>

      {panel === 'how-to-play' && (
        <Panel title="How to Play" onClose={closePanel}>
          <ul className="tips">
            <li>Pick an element from the toolbar (or press 1–9, 0) and draw on the canvas.</li>
            <li>Hold the button to keep pouring. Right-click or E to erase.</li>
            <li>Space pauses, N steps one tick, [ and ] change the brush size.</li>
            <li>Water soaks into soil and darkens it. Sprinkle seeds on wet soil to make them sprout.</li>
            <li>Keep the soil watered: the sprout grows tall, forms a crown and turns into a tree.</li>
            <li>Grown trees bear fruit. Release some birds: they eat fruit and drop the seeds far away.</li>
            <li>Build a metal pot, fill it with water and light a fire under it: the water boils into steam, which turns into clouds and rains back down.</li>
            <li>Dry wood and plants burn into ash. Living, watered trees resist fire for a while; water puts it out.</li>
            <li>Hover the canvas to see what's there and how hot it is.</li>
          </ul>
        </Panel>
      )}

      {panel === 'about' && (
        <Panel title="About" onClose={closePanel}>
          <p>
            Natural Pixels is an element sandbox inspired by the classic Powder Game (2011), rebuilt
            with modern web tech.
          </p>
          <p className="muted">Made by Gustavo Merling.</p>
        </Panel>
      )}
    </main>
  )
}
