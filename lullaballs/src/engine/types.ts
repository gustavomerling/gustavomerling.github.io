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

/** hit/break/finish play the song; clack is a dry percussive knock that doesn't move the melody on. */
export type EventKind = 'hit' | 'break' | 'finish' | 'clack';
export interface SimEvent {
  t: number;
  kind: EventKind;
  /** Strength 0-1, for clacks. */
  vel?: number;
  /** Where it happened (0..W), to place the sound left or right. */
  x?: number;
}

export type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Params = Record<string, number>;

export interface Sim {
  time: number;
  finishTime: number | null;
  /** Advances one video frame (1/FPS) and returns the events that happened in it. */
  step(): SimEvent[];
  draw(ctx: Ctx2D, overlay: string): void;
  /** Extra condition for a seed to be picked, checked after the run (e.g. when the winner of a race arrives). */
  accept?(): boolean;
  /** How tense the run was (late lead changes, photo finish...), to prefer the most dramatic seeds. About 0-1. */
  drama?(): number;
}

/** A line for the text on the video; with a poll, its options show as chips during the first seconds. */
export interface Hook {
  text: string;
  poll?: string[];
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
  /** Hooks for the text on the video, drawn at random (the first is the classic one). */
  hooks: Hook[];
  /** Keyword-rich lines describing the video, for the caption (TikTok search reads it). */
  blurbs: string[];
  /** Hashtags for this kind of video. */
  tags: string[];
  defaults: Params;
  specs: ParamSpec[];
  create(params: Params, seed: number, look?: Look): Sim;
}
