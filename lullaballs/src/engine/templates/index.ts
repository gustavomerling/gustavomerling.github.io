import type { Template } from '../types';
import { breakoutRing } from './breakoutRing';
import { christmasTree } from './christmasTree';
import { escapeRings } from './escapeRings';
import { growingBall } from './growingBall';
import { mazeDescent } from './mazeDescent';
import { multiplyBalls } from './multiplyBalls';
import { nestedPolygons } from './nestedPolygons';
import { paintRing } from './paintRing';

export const TEMPLATES: Template[] = [
  escapeRings, growingBall, multiplyBalls, breakoutRing, paintRing, nestedPolygons, mazeDescent, christmasTree,
];

export function getTemplate(id: string): Template {
  const t = TEMPLATES.find((t) => t.id === id);
  if (!t) throw new Error(`Template desconhecido: ${id}`);
  return t;
}
