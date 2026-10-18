import { FPS, H, W, type Ctx2D, type Sim } from './types';
import { overlayBottom } from './util';

/** Seconds the poll stays on screen at the start. */
export const POLL_TIME = 4.5;
/** Seconds of crossfade into the first frame at the end, so the video loops seamlessly. */
export const LOOP_FADE = 0.8;

const FONT = '"Nunito", "Segoe UI", system-ui, sans-serif';

/** The poll's options as chips under the headline, popping in one by one, plus a nudge to comment. */
export function drawPoll(ctx: Ctx2D, options: string[], overlay: string, t: number) {
  if (!options.length || t > POLL_TIME) return;
  const fade = Math.min(1, t / 0.3, (POLL_TIME - t) / 0.4);
  const y = overlayBottom(ctx, overlay) + 10;
  ctx.save();
  ctx.font = `800 46px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pad = 34, gap = 28;
  const widths = options.map((o) => ctx.measureText(o).width + pad * 2);
  let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (options.length - 1)) / 2;
  options.forEach((o, i) => {
    const w = widths[i];
    const pop = Math.max(0, Math.min(1, (t - 0.15 - i * 0.18) / 0.25));
    const k = pop < 1 ? 0.6 + 0.5 * pop - 0.1 * Math.sin(pop * Math.PI) : 1 + 0.03 * Math.sin(t * 5 + i);
    ctx.save();
    ctx.globalAlpha = fade * pop;
    ctx.translate(x + w / 2, y);
    ctx.scale(k, k);
    ctx.fillStyle = 'rgba(25,18,45,0.62)';
    ctx.strokeStyle = 'rgba(255,248,240,0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -40, w, 80, 40);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff8f0';
    ctx.fillText(o, 0, 2);
    ctx.restore();
    x += w + gap;
  });
  ctx.globalAlpha = fade * Math.max(0, Math.min(1, (t - 0.8) / 0.3));
  ctx.font = `700 36px ${FONT}`;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(45,30,70,0.55)';
  ctx.fillStyle = '#fff8f0';
  ctx.strokeText('Comment your guess 👇', W / 2, y + 82);
  ctx.fillText('Comment your guess 👇', W / 2, y + 82);
  ctx.restore();
}

/** A slim bar under TikTok's top tabs, filling up until the climax, with the elapsed time and a flag at the end. */
export function drawProgress(ctx: Ctx2D, t: number, finishTime: number) {
  const u = Math.max(0, Math.min(1, t / finishTime));
  const x0 = W / 2 - 280, x1 = W / 2 + 280, y = 218;
  ctx.save();
  ctx.fillStyle = 'rgba(25,18,45,0.35)';
  ctx.beginPath();
  ctx.roundRect(x0, y - 6, x1 - x0, 12, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,248,240,0.9)';
  ctx.beginPath();
  ctx.roundRect(x0, y - 6, Math.max(12, (x1 - x0) * u), 12, 6);
  ctx.fill();
  ctx.font = `800 30px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(45,30,70,0.5)';
  ctx.fillStyle = '#fff8f0';
  const s = Math.min(t, finishTime);
  const label = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  ctx.textAlign = 'right';
  ctx.strokeText(label, x0 - 16, y);
  ctx.fillText(label, x0 - 16, y);
  ctx.textAlign = 'left';
  ctx.fillText(u >= 1 ? '🏆' : '🏁', x1 + 14, y);
  ctx.restore();
}

/**
 * The simulation dressed for the video: the poll at the start, the progress bar, and a crossfade at the end into
 * the very first frame, so TikTok's loop back to the start is seamless.
 */
export function dressed(
  make: () => Sim,
  opts: { overlay: string; poll?: string[]; finishTime: number | null; duration: number },
) {
  const sim = make();
  let first: OffscreenCanvas | null = null;
  const climax = opts.finishTime ?? opts.duration;
  function frame(s: Sim, ctx: Ctx2D) {
    s.draw(ctx, opts.overlay);
    drawProgress(ctx, s.time, climax);
    if (opts.poll) drawPoll(ctx, opts.poll, opts.overlay, s.time);
  }
  return {
    sim,
    step: () => sim.step(),
    draw(ctx: Ctx2D) {
      frame(sim, ctx);
      const k = (sim.time - (opts.duration - LOOP_FADE)) / LOOP_FADE;
      if (k <= 0 || typeof OffscreenCanvas === 'undefined') return;
      if (!first) {
        // The opening frame, as the viewer first saw it (one step in, like the export's first frame).
        first = new OffscreenCanvas(W, H);
        const s0 = make();
        s0.step();
        frame(s0, first.getContext('2d')!);
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, k * k * (3 - 2 * k));
      ctx.drawImage(first, 0, 0);
      ctx.restore();
    },
  };
}

export const frameCount = (duration: number) => Math.ceil(duration * FPS);
