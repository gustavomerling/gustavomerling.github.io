export interface Vec2 {
  x: number;
  y: number;
}

export const vec2 = (x = 0, y = 0): Vec2 => ({ x, y });

export const length = (v: Vec2): number => Math.hypot(v.x, v.y);

export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

export const fromAngle = (radians: number, len = 1): Vec2 => ({ x: Math.cos(radians) * len, y: Math.sin(radians) * len });

export const angleOf = (v: Vec2): number => Math.atan2(v.y, v.x);
