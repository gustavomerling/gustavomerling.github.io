import { useState } from 'react'
import { GameScreen } from '../screens/GameScreen.tsx'
import { MenuScreen } from '../screens/MenuScreen.tsx'
import { SplashScreen } from '../screens/SplashScreen.tsx'
import type { Screen } from './screens.ts'
import { SettingsProvider } from './SettingsProvider.tsx'

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')

  // `key` remounts the wrapper so each screen plays its enter animation.
  return (
    <SettingsProvider>
      <div className="app" key={screen}>
        {screen === 'splash' && <SplashScreen onNavigate={setScreen} />}
        {screen === 'menu' && <MenuScreen onNavigate={setScreen} />}
        {screen === 'game' && <GameScreen onNavigate={setScreen} />}
      </div>
    </SettingsProvider>
  )
}
