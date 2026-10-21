import { useCallback, useState } from 'react';
import { GameScreen } from './screens/GameScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';

type ScreenId = 'menu' | 'game';

/** Top-level screen state machine. Each screen is self-contained and reports back via callbacks. */
export function App() {
  const [screen, setScreen] = useState<ScreenId>('menu');
  const go = useCallback((s: ScreenId) => () => setScreen(s), []);

  switch (screen) {
    case 'menu':
      return <MainMenuScreen onPlay={go('game')} />;
    case 'game':
      return <GameScreen onQuitRun={go('menu')} />;
  }
}
