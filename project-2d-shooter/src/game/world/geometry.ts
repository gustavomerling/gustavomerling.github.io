import type { Rect } from '@engine/math/rect';
import type { Vec2 } from '@engine/math/vec2';
import type { BodyData } from './components';

type Pos = { x: number; y: number };

export const bodyRect = (pos: Pos, body: BodyData): Rect => ({ x: pos.x, y: pos.y, w: body.w, h: body.h });

export const bodyCenter = (pos: Pos, body: BodyData): Vec2 => ({ x: pos.x + body.w / 2, y: pos.y + body.h / 2 });

/** Where guns are held / items are thrown from. */
export const shoulder = (pos: Pos, body: BodyData): Vec2 => ({ x: pos.x + body.w / 2, y: pos.y + body.h * 0.35 });
