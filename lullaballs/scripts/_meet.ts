import { getTemplate } from '../src/engine/templates';
import { resolveParams } from '../src/engine/run';
for (let seed = 1; seed <= 12; seed++) {
  const sim = getTemplate('meeting-balls').create(resolveParams('meeting-balls', {}), seed);
  const breaks: string[] = []; let hits = 0;
  while (sim.time < 75 && sim.finishTime === null) for (const e of sim.step()) e.kind === 'break' ? breaks.push(e.t.toFixed(1)) : e.kind === 'hit' && hits++;
  console.log(seed, sim.finishTime?.toFixed(1), 'hits', hits, 'meets', breaks.join(' '));
}
