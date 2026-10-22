import { useCallback, useState } from 'react';
import type { RunModeId } from '@game/content/modes/catalog';
import { prefs, resolveSeed } from '@game/prefs';
import type { SessionOptions } from '@game/session';
import { GameScreen } from './screens/GameScreen';
import { MainMenuScreen } from './screens/MainMenuScreen';

type ScreenId = 'menu' | 'game';

interface Run {
  id: number;
  mode: RunModeId;
  options: Omit<SessionOptions, 'mode'>;
}

/** Top-level screen state machine. Each screen is self-contained and reports back via callbacks. */
export function App() {
  const [screen, setScreen] = useState<ScreenId>('menu');
  const [run, setRun] = useState<Run | null>(null);
  const play = useCallback((mode: RunModeId) => {
    const store = prefs();
    const p = store.get();
    // The seed is picked here (random / daily / last / typed) and remembered by the session.
    setRun((prev) => ({ id: (prev?.id ?? 0) + 1, mode, options: { seed: resolveSeed(p), grid: p.grid, prefs: store } }));
    setScreen('game');
  }, []);
  const toMenu = useCallback(() => setScreen('menu'), []);

  if (screen === 'game' && run) {
    return <GameScreen key={run.id} mode={run.mode} session={run.options} onQuitRun={toMenu} />;
  }
  return <MainMenuScreen onPlay={play} />;
}
