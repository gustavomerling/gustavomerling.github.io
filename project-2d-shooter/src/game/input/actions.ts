import { key, mouse, wheel, type Bindings } from '@engine/input/input';

/** Every gameplay verb. Systems only ever ask about actions, never about keys. */
export const ACTIONS = [
  'left',
  'right',
  'up',
  'down',
  'jump',
  'sprint',
  'crouch',
  'slowmo',
  'fire',
  'reload',
  'interact',
  'nextWeapon',
  'prevWeapon',
  'pause',
  'debug',
  'debugGrid',
  'debugGod',
  'debugSpawn',
  'debugStep',
  'debugTick',
  'debugReplay',
] as const;

export type Action = (typeof ACTIONS)[number];

export const DEFAULT_BINDINGS: Bindings<Action> = {
  left: [key('KeyA'), key('ArrowLeft')],
  right: [key('KeyD'), key('ArrowRight')],
  up: [key('KeyW'), key('ArrowUp')],
  down: [key('KeyS'), key('ArrowDown')],
  jump: [key('Space'), key('KeyW'), key('ArrowUp')],
  sprint: [key('ShiftLeft'), key('ShiftRight')],
  crouch: [key('KeyS'), key('ArrowDown')],
  slowmo: [key('KeyE')],
  fire: [mouse(0)],
  reload: [key('KeyR')],
  interact: [key('KeyF')],
  nextWeapon: [wheel('down'), key('Digit2')],
  prevWeapon: [wheel('up'), key('Digit1')],
  pause: [key('Escape')],
  debug: [key('F3')],
  debugGrid: [key('F2')],
  debugGod: [key('F4')],
  debugSpawn: [key('F6')],
  debugStep: [key('F8')],
  debugTick: [key('F9')],
  debugReplay: [key('F10')],
};
