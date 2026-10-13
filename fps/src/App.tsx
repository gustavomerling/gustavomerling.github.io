import { useEffect, useState } from 'react'
import { levelFromHash } from './app/startLevel.ts'
import type { Screen } from './app/screens.ts'
import { loadSettings, saveSettings } from './app/storage.ts'
import type { GameSettings } from './engine/settings.ts'
import { GameScreen } from './screens/GameScreen.tsx'
import { MenuScreen } from './screens/MenuScreen.tsx'

export default function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    levelFromHash(window.location.hash) === null ? 'menu' : 'game',
  )
  const [startLevel, setStartLevel] = useState(() => levelFromHash(window.location.hash) ?? 0)
  const [settings, setSettings] = useState<GameSettings>(loadSettings)

  const changeSettings = (next: GameSettings) => {
    setSettings(next)
    saveSettings(next)
  }

  // Typing `#/n-N` in the address bar jumps straight into that level.
  useEffect(() => {
    const onHashChange = () => {
      const level = levelFromHash(window.location.hash)
      if (level === null) return
      setStartLevel(level)
      setScreen('game')
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return (
    <div className="app" key={screen}>
      {screen === 'menu' && (
        <MenuScreen
          settings={settings}
          onSettingsChange={changeSettings}
          onPlay={(level) => {
            setStartLevel(level)
            setScreen('game')
          }}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          key={startLevel}
          startLevel={startLevel}
          settings={settings}
          onSettingsChange={changeSettings}
          onNavigate={setScreen}
        />
      )}
    </div>
  )
}
