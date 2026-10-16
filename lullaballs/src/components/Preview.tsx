import { Play, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Sequencer, type Song } from '../audio/notes';
import { createChain, playHit } from '../audio/synth';
import { resolveParams } from '../engine/run';
import { getTemplate } from '../engine/templates';
import { H, W } from '../engine/types';
import type { Post } from '../types';

/** Live preview: runs the same deterministic simulation as the export, in real time, with sound. */
export function Preview({ post, song, duration }: { post: Post; song: Song | undefined; duration: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRef = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);

  const create = () => getTemplate(post.template).create(resolveParams(post.template, post.params), post.seed, post);

  // Still frame whenever the post changes (a few seconds in, so the background's motion is visible).
  useEffect(() => {
    stopRef.current();
    const sim = create();
    for (let i = 0; i < 60 * 3; i++) sim.step();
    sim.draw(canvasRef.current!.getContext('2d')!, post.overlay);
    setTime(0);
  }, [post.template, post.seed, post.overlay, post.background, post.palette, JSON.stringify(post.params)]);

  useEffect(() => () => stopRef.current(), []);

  function play() {
    if (!song) return;
    stopRef.current();
    const ctx2d = canvasRef.current!.getContext('2d')!;
    const audio = new AudioContext();
    const dest = createChain(audio);
    const seq = new Sequencer(song);
    const sim = create();
    const start = performance.now();
    let raf = 0;
    const frame = () => {
      const elapsed = Math.min(duration, (performance.now() - start) / 1000);
      while (sim.time < elapsed) {
        for (const ev of sim.step()) {
          const hit = seq.next(ev);
          if (hit) playHit(audio, dest, hit, audio.currentTime + 0.01);
        }
      }
      sim.draw(ctx2d, post.overlay);
      setTime(elapsed);
      if (elapsed >= duration) stop();
      else raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      void audio.close();
      setPlaying(false);
      stopRef.current = () => {};
    };
    stopRef.current = stop;
    setPlaying(true);
    raf = requestAnimationFrame(frame);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="preview">
      <div className="preview-frame">
        <canvas ref={canvasRef} width={W} height={H} />
        {!playing && (
          <button className="play-overlay" onClick={play} disabled={!song} aria-label="Assistir">
            <Play size={28} fill="currentColor" />
          </button>
        )}
      </div>
      <div className="preview-bar">
        {playing ? (
          <button className="icon" onClick={() => stopRef.current()} aria-label="Parar"><Square size={14} fill="currentColor" /></button>
        ) : (
          <button className="icon" onClick={play} disabled={!song} aria-label="Assistir"><Play size={14} fill="currentColor" /></button>
        )}
        <div className="scrub"><div style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} /></div>
        <span className="time">{fmt(time)} / {fmt(duration)}</span>
      </div>
    </div>
  );
}
