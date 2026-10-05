import { useCallback, useEffect, useState } from 'react'
import { Builder } from './components/builder/Builder'
import { Topbar } from './components/builder/Topbar'
import { DriveView } from './components/drive/DriveView'
import { Intro } from './components/menu/Intro'
import { MainMenu, type MenuTarget } from './components/menu/MainMenu'
import { Credits, HowTo, OptionsScreen } from './components/menu/Screens'
import { PRESETS } from './game/presets'
import { loadDesign, loadOptions, saveDesign, saveOptions, type GameOptions } from './game/storage'
import type { Difficulty } from './game/terrain/generate'
import { useHistory } from './hooks/useHistory'

type Screen = 'intro' | 'menu' | 'howto' | 'options' | 'credits' | 'build' | 'drive'

const randomSeed = () => Math.floor(Math.random() * 99999)
const DEMO_DESIGN = PRESETS[1].design
const MENU_SCREENS: Screen[] = ['menu', 'howto', 'options', 'credits']

export function App() {
  const [screen, setScreen] = useState<Screen>(location.search.includes('drive') ? 'drive' : location.search.includes('build') ? 'build' : 'intro')
  const car = useHistory(loadDesign)
  const design = car.value
  const [seed, setSeed] = useState(randomSeed)
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [options, setOptions] = useState<GameOptions>(loadOptions)

  useEffect(() => saveDesign(design), [design])
  useEffect(() => saveOptions(options), [options])
  // link compartilhado já foi lido: limpa o hash para não sobrescrever edições ao recarregar
  useEffect(() => {
    if (location.hash.includes('car=')) window.history.replaceState(null, '', location.pathname + location.search)
  }, [])

  const toMenu = useCallback(() => setScreen('menu'), [])
  const toBuild = useCallback(() => setScreen('build'), [])
  const newTrack = useCallback(() => setSeed(randomSeed()), [])
  const toggleSound = useCallback(() => setOptions((o) => ({ ...o, sound: !o.sound })), [])
  const onMenu = useCallback((t: MenuTarget) => setScreen(t), [])

  if (screen === 'intro') return <Intro onDone={toMenu} />

  if (MENU_SCREENS.includes(screen)) {
    return (
      <div className="app">
        {/* vitrine ao vivo atrás do menu */}
        <DriveView design={DEMO_DESIGN} seed={4242} difficulty="easy" options={options} demo />
        {screen === 'menu' && <MainMenu onSelect={onMenu} />}
        {screen === 'howto' && <HowTo onBack={toMenu} />}
        {screen === 'options' && <OptionsScreen options={options} onChange={setOptions} onBack={toMenu} />}
        {screen === 'credits' && <Credits onBack={toMenu} />}
      </div>
    )
  }

  if (screen === 'drive') {
    return (
      <div className="app">
        <DriveView
          design={design}
          seed={seed}
          difficulty={difficulty}
          options={options}
          onToggleSound={toggleSound}
          onBack={toBuild}
          onNewTrack={newTrack}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <Topbar
        seed={seed}
        difficulty={difficulty}
        canUndo={car.canUndo}
        canRedo={car.canRedo}
        onMenu={toMenu}
        onUndo={car.undo}
        onRedo={car.redo}
        onClear={() => car.set({ ...design, parts: [] })}
        onReset={() => car.set(structuredClone(PRESETS[0].design))}
        onSeed={setSeed}
        onRandomSeed={newTrack}
        onDifficulty={setDifficulty}
        onDrive={() => setScreen('drive')}
      />
      <Builder design={design} onChange={car.set} onUndo={car.undo} onRedo={car.redo} />
    </div>
  )
}
