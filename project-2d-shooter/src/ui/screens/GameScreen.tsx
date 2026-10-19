import { useEffect, useRef, useState } from 'react';
import type { DebugStats, HudState } from '@game/events';
import { GameSession } from '@game/session';
import { DebugPanel, Hud } from '../components/Hud';
import { Menu } from '../components/Menu';
import { audio, settingsStore } from '../services';

interface Props {
  onQuitRun: () => void;
}

/** Hosts the canvas + GameSession, and the React overlays (HUD, pause). */
export function GameScreen({ onQuitRun }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [debug, setDebug] = useState<DebugStats | null>(null);
  const [paused, setPaused] = useState(false);
  const [dead, setDead] = useState(false);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const settings = settingsStore.get();
    const session = new GameSession(canvas, {
      audio,
      debug: settings.showDebug,
      scaleMode: settings.pixelPerfect ? 'integer' : 'fit',
    });
    sessionRef.current = session;
    let deathTimer = 0;
    const offs = [
      session.bus.on('hud', setHud),
      session.bus.on('debug', setDebug),
      session.bus.on('replay', setReplaying),
      session.bus.on('ui:pause', () => {
        session.pause();
        setPaused(true);
      }),
      session.bus.on('run:over', () => {
        // Let the death play out in slow motion for a moment, then freeze.
        deathTimer = window.setTimeout(() => {
          session.pause();
          setDead(true);
        }, 900);
      }),
    ];
    session.start();
    canvas.focus();
    return () => {
      window.clearTimeout(deathTimer);
      offs.forEach((off) => off());
      session.dispose();
      sessionRef.current = null;
    };
  }, []);

  const resume = () => {
    sessionRef.current?.resume();
    setPaused(false);
    canvasRef.current?.focus();
  };

  const retry = () => {
    sessionRef.current?.restart();
    setDead(false);
    canvasRef.current?.focus();
  };

  return (
    <div className="screen game">
      <canvas ref={canvasRef} className={paused || dead ? 'game-canvas' : 'game-canvas no-cursor'} tabIndex={0} />
      {dead && (
        <div className="pause-overlay">
          <h2>Você morreu</h2>
          <p className="tagline">a lasanha continua desaparecida.</p>
          <Menu
            items={[
              { id: 'retry', label: 'Tentar de novo', onSelect: retry },
              { id: 'quit', label: 'Menu principal', onSelect: onQuitRun },
            ]}
          />
        </div>
      )}
      <Hud hud={hud} replaying={replaying} />
      <DebugPanel stats={debug} />
      {paused && (
        <div className="pause-overlay">
          <h2>Pausa</h2>
          <Menu
            onBack={resume}
            items={[
              { id: 'resume', label: 'Continuar', onSelect: resume },
              { id: 'quit', label: 'Abandonar run', onSelect: onQuitRun },
            ]}
          />
        </div>
      )}
    </div>
  );
}
