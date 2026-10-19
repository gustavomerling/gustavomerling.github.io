import { approach } from '../math/math';

/**
 * Game clock with smoothly ramped time scale (slow motion / hit-stop).
 * Systems read `dt` (scaled world time) and may opt into their own scale.
 */
export class Clock {
  /** Current time scale applied to the world. */
  scale = 1;
  /** Scale the clock is ramping towards. */
  targetScale = 1;
  /** How fast `scale` moves towards `targetScale`, in scale units per real second. */
  rampPerSecond = 8;

  /** Scaled seconds of the current step. */
  dt = 0;
  /** Unscaled seconds of the current step. */
  realDt = 0;
  /** Total scaled seconds since start. */
  elapsed = 0;
  /** Total unscaled seconds since start. */
  realElapsed = 0;
  /** Simulation steps since start. */
  tick = 0;

  private hitStopSeconds = 0;

  /** Freezes the world for a few real-time seconds (impact feel). */
  hitStop(seconds: number): void {
    this.hitStopSeconds = Math.max(this.hitStopSeconds, seconds);
  }

  step(realDt: number): void {
    this.scale = approach(this.scale, this.targetScale, this.rampPerSecond * realDt);
    this.realDt = realDt;
    if (this.hitStopSeconds > 0) {
      this.hitStopSeconds = Math.max(0, this.hitStopSeconds - realDt);
      this.dt = 0;
    } else {
      this.dt = realDt * this.scale;
    }
    this.elapsed += this.dt;
    this.realElapsed += realDt;
    this.tick++;
  }
}
