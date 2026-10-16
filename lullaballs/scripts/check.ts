// Calibration helper: prints how long each template takes to finish across seeds.
import { TEMPLATES } from '../src/engine/templates';
import { FINISH_MAX, FINISH_MIN } from '../src/engine/types';
import { simulateHeadless } from '../src/engine/run';

for (const tpl of TEMPLATES) {
  const times: number[] = [];
  let unfinished = 0;
  const t0 = performance.now();
  for (let s = 1; s <= 40; s++) {
    const r = simulateHeadless(tpl.id, {}, s);
    if (r.finishTime === null) unfinished++;
    else times.push(r.finishTime);
  }
  times.sort((a, b) => a - b);
  const q = (p: number) => times[Math.floor(p * (times.length - 1))]?.toFixed(1);
  const inWindow = times.filter((t) => t >= FINISH_MIN && t <= FINISH_MAX).length;
  console.log(
    `${tpl.id}: min ${q(0)} p25 ${q(0.25)} med ${q(0.5)} p75 ${q(0.75)} max ${q(1)} | ` +
      `não terminou ${unfinished}/40 | na janela: ${inWindow}/40 | ${(performance.now() - t0).toFixed(0)}ms`,
  );
}
