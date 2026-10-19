/**
 * Analytic two-bone IK (law of cosines): shoulder->elbow->hand, hip->knee->foot.
 * Returns world angles for both bones. Out-of-reach targets are reached as far as possible.
 *
 * `bend` picks the side of the middle joint: with the chain pointing along `base`,
 * +1 rotates the first bone towards decreasing angles, -1 towards increasing ones.
 * In screen space (y down), facing right: knees use +1 (forward), elbows -1 (down/back).
 */
export function solveTwoBone(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  upperLength: number,
  lowerLength: number,
  bend: 1 | -1,
): { upper: number; lower: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const minReach = Math.abs(upperLength - lowerLength) + 1e-4;
  const maxReach = upperLength + lowerLength - 1e-4;
  const dist = Math.min(maxReach, Math.max(minReach, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const cosA = (upperLength * upperLength + dist * dist - lowerLength * lowerLength) / (2 * upperLength * dist);
  const a = Math.acos(Math.min(1, Math.max(-1, cosA)));
  const upper = base - bend * a;
  // Joint position, then aim the lower bone at the (clamped) target.
  const jx = sx + Math.cos(upper) * upperLength;
  const jy = sy + Math.sin(upper) * upperLength;
  const ex = sx + Math.cos(base) * dist;
  const ey = sy + Math.sin(base) * dist;
  return { upper, lower: Math.atan2(ey - jy, ex - jx) };
}
