import { useCallback, useState } from 'react';
import { GameScreen } from './screens/GameScreen';
import { IntroScreen } from './screens/IntroScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';
import { OptionsScreen } from './screens/OptionsScreen';

type ScreenId = 'intro' | 'menu' | 'options' | 'game';

/** Top-level screen state machine. Each screen is self-contained and reports back via callbacks. */
export function App() {
  const [screen, setScreen] = useState<ScreenId>('intro');
  const go = useCallback((s: ScreenId) => () => setScreen(s), []);

  switch (screen) {
    case 'intro':
      return <IntroScreen onDone={go('menu')} />;
    case 'menu':
      return <MainMenuScreen onNewRun={go('game')} onOptions={go('options')} />;
    case 'options':
      return <OptionsScreen onBack={go('menu')} />;
    case 'game':
      return <GameScreen onQuitRun={go('menu')} />;
  }
}
