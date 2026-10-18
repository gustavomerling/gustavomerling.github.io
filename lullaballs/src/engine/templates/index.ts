import type { Template } from '../types';
import { breakoutRing } from './breakoutRing';
import { brickBreaker } from './brickBreaker';
import { escapeRings } from './escapeRings';
import { growingBall } from './growingBall';
import { marbleRace } from './marbleRace';
import { mazeDescent } from './mazeDescent';
import { meetingBalls } from './meetingBalls';
import { multiplyBalls } from './multiplyBalls';
import { nestedPolygons } from './nestedPolygons';
import { paintRing } from './paintRing';
import { spiderWeb } from './spiderWeb';

export const TEMPLATES: Template[] = [
  escapeRings, growingBall, multiplyBalls, breakoutRing, paintRing, nestedPolygons, mazeDescent, meetingBalls, marbleRace, brickBreaker,
  spiderWeb,
];

export function getTemplate(id: string): Template {
  const t = TEMPLATES.find((t) => t.id === id);
  if (!t) throw new Error(`Template desconhecido: ${id}`);
  return t;
}
