import { BookOpen, Info, Play, Settings } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { Navigate } from '../app/screens.ts'
import { SettingsPanel } from '../game/SettingsPanel.tsx'
import { Button } from '../ui/Button.tsx'
import { FallingParticles } from '../ui/FallingParticles.tsx'
import { Panel } from '../ui/Panel.tsx'

type MenuPanel = 'how-to-play' | 'settings' | 'about' | null

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
          <Button variant="ghost" icon={Settings} onClick={() => setPanel('settings')}>
            Settings
          </Button>
          <Button variant="ghost" icon={Info} onClick={() => setPanel('about')}>
            About
          </Button>
        </nav>
      </div>

      {panel === 'how-to-play' && (
        <Panel title="How to Play" onClose={closePanel}>
          <h3 className="tips__heading">Controls</h3>
          <ul className="tips">
            <li>Pick an element in the sidebar (or press 1–9, 0) and draw on the canvas. Hold to keep pouring.</li>
            <li>Right-click or E erases. Space pauses, N steps, [ and ] resize the brush.</li>
            <li>Hover the canvas to see what's there and how hot it is. In the Scene section, roll a Random world or save yours.</li>
          </ul>
          <h3 className="tips__heading">Life</h3>
          <ul className="tips">
            <li>Water soaks into soil. Seeds sprout in wet soil and grow into trees that bear fruit.</li>
            <li>Plants grow by day. Ash and fallen leaves fertilize the soil; worms turn them into rich earth.</li>
            <li>Bees pollinate tree crowns for more fruit. Birds eat fruit and drop the seeds far away.</li>
            <li>Grass spreads over wet soil. Fish live in water. Soaked soil turns into mud.</li>
          </ul>
          <h3 className="tips__heading">Humans</h3>
          <ul className="tips">
            <li>Place a human (Animals) and it lives on its own, Minecraft-style: chops trees into logs and planks, crafts a pickaxe, mines stone, and builds a house before night.</li>
            <li>It eats fruit and fish, sleeps at home, replants trees and waters saplings with a bucket. Hover it to see its inventory and what it's doing.</li>
            <li>It can't walk underwater: it swims, or with 5 planks it builds a boat and rows across. The boat stays moored at the shore for the trip back.</li>
            <li>A bubble shows what it's thinking. When it glows orange it needs something: paint Wood, Stone or Fruit near it and it will happily take your gift.</li>
          </ul>
          <h3 className="tips__heading">Chemistry</h3>
          <ul className="tips">
            <li>Lava hardens into stone, turns water to steam and melts sand into glass. Oil floats and burns fast.</li>
            <li>Acid eats almost anything except glass and metal. Liquid nitrogen freezes water. Gunpowder explodes in chains.</li>
          </ul>
          <h3 className="tips__heading">Heat</h3>
          <ul className="tips">
            <li>Fire under a metal pot of water boils it into steam, which becomes clouds and rains back down.</li>
            <li>Dry wood and plants burn into ash. Living, watered trees resist fire; water puts it out.</li>
          </ul>
        </Panel>
      )}

      {panel === 'settings' && <SettingsPanel onClose={closePanel} />}

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
