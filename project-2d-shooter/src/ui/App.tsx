import { useCallback, useState } from 'react';
import type { RunModeId } from '@game/content/modes/catalog';
import { GameScreen } from './screens/GameScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';

type ScreenId = 'menu' | 'game';

/** Top-level screen state machine. Each screen is self-contained and reports back via callbacks. */
export function App() {
  const [screen, setScreen] = useState<ScreenId>('menu');
  const [mode, setMode] = useState<RunModeId>('campaign');
  const play = useCallback((next: RunModeId) => {
    setMode(next);
    setScreen('game');
  }, []);
  const toMenu = useCallback(() => setScreen('menu'), []);

  switch (screen) {
    case 'menu':
      return <MainMenuScreen onPlay={play} />;
    case 'game':
      return <GameScreen mode={mode} onQuitRun={toMenu} />;
  }
}
