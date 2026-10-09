import { BookOpen, Info, Play, Settings } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { Navigate } from '../app/screens.ts'
import { SettingsPanel } from '../game/SettingsPanel.tsx'
import { Button } from '../ui/Button.tsx'
import { FallingParticles } from '../ui/FallingParticles.tsx'
import { LogoMark, Scenery } from '../ui/Logo.tsx'
import { Panel } from '../ui/Panel.tsx'

type MenuPanel = 'how-to-play' | 'settings' | 'about' | null

export function MenuScreen({ onNavigate }: { onNavigate: Navigate }) {
  const [panel, setPanel] = useState<MenuPanel>(null)
  const closePanel = useCallback(() => setPanel(null), [])

  return (
    <main className="screen menu">
      <Scenery />
      <FallingParticles count={40} />
      <div className="menu__content">
        <header className="menu__head">
          <LogoMark className="menu__logo" size={64} />
          <h1 className="title title--small">
            Natural <span className="title__accent">Pixels</span>
          </h1>
          <p className="menu__tagline">A tiny world of elements</p>
        </header>
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
            <li>Mouse wheel zooms in and out; drag with the middle button (or Shift + drag) to look around. The buttons in the corner zoom too, or show the whole world.</li>
            <li>Hover the canvas to see what's there and how hot it is. Every game starts in a new random world; in the Scene section, roll another one or save yours.</li>
          </ul>
          <h3 className="tips__heading">Life</h3>
          <ul className="tips">
            <li>Water soaks into soil. Seeds sprout in wet soil and grow into trees that bear fruit.</li>
            <li>Plants grow by day. Ash and fallen leaves fertilize the soil; worms turn them into rich earth.</li>
            <li>Bees pollinate tree crowns for more fruit. Birds eat fruit and drop the seeds far away.</li>
            <li>Grass spreads over wet soil; flowers bloom in it and fireflies come out at night. Mushrooms grow in the shade.</li>
            <li>Rabbits nibble grass and wheat and have babies (a scarecrow keeps them off the wheat). Fish live in water. Soaked soil turns into mud.</li>
            <li>Butterflies visit the flowers on sunny days; wild beehives on tree trunks fill up with honey. Frogs hop along the shores and ducks paddle on the lakes. When it rains, snails come out of the grass.</li>
          </ul>
          <h3 className="tips__heading">Humans</h3>
          <ul className="tips">
            <li>Place a human (Animals) and it lives on its own, Minecraft-style: chops trees into logs and planks, crafts a pickaxe, mines stone, and builds a house before night.</li>
            <li>It eats fruit and fish, sleeps at home, replants trees and waters saplings with a bucket. Hover it to see its inventory and what it's doing.</li>
            <li>Its house grows in 4 stages, wider and taller, with ladders, beds and doors. It farms wheat (seeds come from cutting grass), spends time at home and greets its neighbours.</li>
            <li>At night zombies may rise. Humans fight them (swords, or a musket with gunpowder zombies drop) or hide behind their doors. Out after dark, they carry a torch.</li>
            <li>Once the house is up it makes the yard cozy: a campfire (it grills its fish there and sings at night), a flower garden, a bench, tiki torches, lamp posts, statues, a scarecrow, a workshop with a smoking furnace and a watchtower to keep watch or stargaze. Its chimney smokes of an evening.</li>
            <li>It digs a mine with ladders and tidy galleries (a post and a torch every few steps). While it rests up top, skeletons, bats and glowing mushrooms turn up down there: it fights skeletons with its sword or musket, and grinds their bones into bone meal for its saplings. Deep down there's iron, gold, amethyst, and sulfur and saltpeter for gunpowder.</li>
            <li>It gets better at what it does most (mining, fishing, farming, building, woodcutting, fighting) and earns titles like "Seasoned miner". Open its card in the top bar to read its skills and its journal, where it writes down every milestone.</li>
            <li>Once its house is big, travellers come to live nearby: neighbours greet each other, trade what they have plenty of and visit each other. Now and then a travelling merchant walks in to buy and sell.</li>
            <li>It builds a pen and brings wild sheep and cows home, shears them for wool (a cozy blanket) and milks the cows. From its pier it fishes, and sometimes hooks a chest or a message in a bottle.</li>
            <li>It can't walk underwater: it swims, or with 5 planks it builds a boat and rows across. The boat stays moored at the shore for the trip back.</li>
            <li>A bubble shows what it's thinking. When it glows orange it needs something: paint Wood, Stone or Fruit near it and it will happily take your gift.</li>
          </ul>
          <h3 className="tips__heading">Weather</h3>
          <ul className="tips">
            <li>It rains for a while every day; some rains are storms with lightning that can start fires. After a gentle rain, look for a rainbow.</li>
            <li>Puddles evaporate in the sun, rise as steam and come back as rain. The wind comes and goes: smoke, steam and clouds drift with it.</li>
            <li>On clear nights, watch for shooting stars. Rarely: a solar eclipse, an aurora, a meteor shower that leaves glowing fallen stars, a double rainbow.</li>
            <li>Deep in the stone there are caves, with underground pools and glowing mushrooms.</li>
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
