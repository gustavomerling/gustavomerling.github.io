import { getTemplate } from './templates';
import {
  FINISH_MAX, FINISH_MIN, FPS, MAX_SIM, MIN_DURATION, OUTRO,
  type Params, type SimEvent,
} from './types';

export function resolveParams(templateId: string, params: Params): Params {
  return { ...getTemplate(templateId).defaults, ...params };
}

/** Runs a simulation without drawing, to know its events and final length. */
export function simulateHeadless(templateId: string, params: Params, seed: number) {
  const sim = getTemplate(templateId).create(resolveParams(templateId, params), seed);
  const events: SimEvent[] = [];
  while (sim.time < MAX_SIM) {
    events.push(...sim.step());
    if (sim.finishTime !== null && sim.time >= sim.finishTime + OUTRO) break;
  }
  const finishTime = sim.finishTime;
  const duration = finishTime === null ? MIN_DURATION : Math.max(MIN_DURATION, finishTime + OUTRO);
  return {
    events: events.filter((e) => e.t < duration), finishTime, duration, frames: Math.ceil(duration * FPS),
    accepted: sim.accept?.() ?? true,
    drama: (sim.drama?.() ?? 0) + finale(events, finishTime),
  };
}

/** How much busier the last 12s before the finish are than the run as a whole (0 = as busy, 1 = twice as busy). */
function finale(events: SimEvent[], finishTime: number | null) {
  if (finishTime === null || finishTime < 24) return 0;
  const notes = events.filter((e) => (e.kind === 'hit' || e.kind === 'break') && e.t <= finishTime);
  const late = notes.filter((e) => e.t > finishTime - 12).length / 12;
  const all = notes.length / finishTime;
  return all ? Math.max(0, Math.min(1, late / all - 1)) : 0;
}

/**
 * Looks for a seed whose climax lands inside the finish window, so the video lasts ~1:05-1:10. Among the first few
 * that fit, keeps the most dramatic one (busier ending, late lead changes, photo finish).
 */
export function findSeed(templateId: string, params: Params, start: number, tries = 400, candidates = 3): number | null {
  let best: { seed: number; drama: number } | null = null;
  let found = 0;
  for (let s = start; s < start + tries && found < candidates; s++) {
    const { finishTime, accepted, drama } = simulateHeadless(templateId, params, s);
    if (finishTime === null || finishTime < FINISH_MIN || finishTime > FINISH_MAX || !accepted) continue;
    found++;
    if (!best || drama > best.drama) best = { seed: s, drama };
  }
  return best?.seed ?? null;
}
