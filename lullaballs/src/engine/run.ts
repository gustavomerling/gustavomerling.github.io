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
  };
}

/** Looks for a seed whose climax lands inside the finish window, so the video lasts ~1:05-1:10. */
export function findSeed(templateId: string, params: Params, start: number, tries = 400): number | null {
  for (let s = start; s < start + tries; s++) {
    const { finishTime, accepted } = simulateHeadless(templateId, params, s);
    if (finishTime !== null && finishTime >= FINISH_MIN && finishTime <= FINISH_MAX && accepted) return s;
  }
  return null;
}
