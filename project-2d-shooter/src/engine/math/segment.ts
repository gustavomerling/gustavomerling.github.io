/**
 * Closest approach between segments P(s) = p0 + s(p1-p0) and Q(u) = q0 + u(q1-q0), s,u in [0,1].
 * Returns the distance and `s` (where along the first segment it happens).
 * (Ericson, Real-Time Collision Detection, 5.1.9.)
 */
export function segmentDistance(
  p0x: number,
  p0y: number,
  p1x: number,
  p1y: number,
  q0x: number,
  q0y: number,
  q1x: number,
  q1y: number,
): { dist: number; s: number } {
  const d1x = p1x - p0x;
  const d1y = p1y - p0y;
  const d2x = q1x - q0x;
  const d2y = q1y - q0y;
  const rx = p0x - q0x;
  const ry = p0y - q0y;
  const a = d1x * d1x + d1y * d1y;
  const e = d2x * d2x + d2y * d2y;
  const f = d2x * rx + d2y * ry;
  const EPS = 1e-9;
  let s: number;
  let u: number;

  if (a <= EPS && e <= EPS) {
    s = 0;
    u = 0;
  } else if (a <= EPS) {
    s = 0;
    u = clamp01(f / e);
  } else {
    const c = d1x * rx + d1y * ry;
    if (e <= EPS) {
      u = 0;
      s = clamp01(-c / a);
    } else {
      const b = d1x * d2x + d1y * d2y;
      const denom = a * e - b * b;
      s = denom > EPS ? clamp01((b * f - c * e) / denom) : 0;
      u = (b * s + f) / e;
      if (u < 0) {
        u = 0;
        s = clamp01(-c / a);
      } else if (u > 1) {
        u = 1;
        s = clamp01((b - c) / a);
      }
    }
  }

  const dx = p0x + d1x * s - (q0x + d2x * u);
  const dy = p0y + d1y * s - (q0y + d2y * u);
  return { dist: Math.hypot(dx, dy), s };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
