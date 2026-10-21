import { useEffect, useRef, useState } from 'react';
import type { DebugStats, HudState, RunSummary } from '@game/events';
import { GameSession } from '@game/session';
import { Controls, DebugPanel, Hud, Summary } from '../components/Hud';
import { Menu } from '../components/Menu';

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
  const [dead, setDead] = useState<RunSummary | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [cleared, setCleared] = useState<RunSummary | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const session = new GameSession(canvas);
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
      session.bus.on('level:exit', (summary) => {
        session.pause();
        setCleared(summary);
      }),
      session.bus.on('run:over', (summary) => {
        // Let the death play out in slow motion for a moment, then freeze.
        deathTimer = window.setTimeout(() => {
          session.pause();
          setDead(summary);
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

  const nextLevel = () => {
    setCleared(null);
    resume();
  };

  const retry = () => {
    sessionRef.current?.restart();
    setDead(null);
    canvasRef.current?.focus();
  };

  return (
    <div className="screen game">
      <canvas ref={canvasRef} className={paused || dead || cleared ? 'game-canvas' : 'game-canvas no-cursor'} tabIndex={0} />
      {dead && (
        <div className="pause-overlay">
          <h2 className="is-danger">Você morreu</h2>
          <Summary s={dead} />
          <Menu
            items={[
              { id: 'retry', label: 'Tentar de novo', onSelect: retry },
              { id: 'quit', label: 'Menu principal', onSelect: onQuitRun },
            ]}
          />
        </div>
      )}
      {cleared && (
        <div className="pause-overlay">
          <h2 className="is-accent">Saída alcançada</h2>
          <Summary s={cleared} />
          <Menu
            onBack={nextLevel}
            items={[
              { id: 'next', label: 'Próximo cenário', onSelect: nextLevel },
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
          <div className="pause-columns">
            <Menu
              onBack={resume}
              items={[
                { id: 'resume', label: 'Continuar', onSelect: resume },
                {
                  id: 'restart',
                  label: 'Reiniciar',
                  onSelect: () => {
                    setPaused(false);
                    retry();
                  },
                },
                { id: 'quit', label: 'Abandonar run', onSelect: onQuitRun },
              ]}
            />
            <Controls />
          </div>
        </div>
      )}
    </div>
  );
}
