export const W = 1080;
export const H = 1920;
export const FPS = 60;
export const SUBSTEPS = 8;
export const DT = 1 / (FPS * SUBSTEPS);

/** The climax should land inside this window, so the video ends right after it. */
export const FINISH_MIN = 62;
export const FINISH_MAX = 66;
/** Seconds kept after the finish for the celebration. */
export const OUTRO = 3.5;
/** TikTok Creator Rewards requires > 1 min; we never go below 1:05. */
export const MIN_DURATION = 65.5;
/** Cut-off for simulations that never finish. */
export const MAX_SIM = 75;

export type EventKind = 'hit' | 'break' | 'finish';
export interface SimEvent {
  t: number;
  kind: EventKind;
}

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Params = Record<string, number>;

export interface Sim {
  time: number;
  finishTime: number | null;
  /** Advances one video frame (1/FPS) and returns the events that happened in it. */
  step(): SimEvent[];
  draw(ctx: Ctx2D, overlay: string): void;
}

export interface ParamSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
}

/** Visual choices that don't affect the physics. */
export interface Look {
  background?: string;
  palette?: string;
}

export interface Template {
  id: string;
  name: string;
  defaultOverlay: string;
  defaults: Params;
  specs: ParamSpec[];
  create(params: Params, seed: number, look?: Look): Sim;
}
