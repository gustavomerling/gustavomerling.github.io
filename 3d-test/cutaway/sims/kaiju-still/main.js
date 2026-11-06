// KAIJU KX-1, the still loop: no page, no tour, just the studio and the body. t picks the view:
// 0 = the reference pose (front 3/4 from the left), 1 = side, 2 = front, 3 = from above behind.
import {runSim} from '../kit/runtime.js';
import {PAPER_GREEN} from '../green/look.js';
import {PAL} from '../tarantula-shared/parts.js';
import {createStage, PAPER} from '../tarantula-shared/stage.js';
import {buildKaiju, FLOOR_Y} from '../kaiju-shared/kaiju.js';

const D2R = Math.PI / 180;
Object.assign(PAL, {orange: '#14a03c'});
Object.assign(PAPER, PAPER_GREEN);

const VIEWS = [
  {tx: -1.0, ty: -0.2, tz: -0.2, az: 140, el: 7, d: 9.6},
  {tx: -0.8, ty: -0.1, tz: 0, az: 180, el: 4, d: 11.5},
  {tx: 0.2, ty: -0.1, tz: 0, az: 90, el: 6, d: 9},
  {tx: -0.8, ty: -0.2, tz: 0, az: 215, el: 40, d: 11},
];

runSim({duration: 4, fps: 60, theme: 'light', hud: {enabled: false, title: 'kaiju-still', subtitle: ''}, director: {enabled: false}, watermark: ''}, async ({canvas, capture}) => {
  const st = createStage({canvas, floorY: FLOOR_Y, guides: {centre: [-0.6, 0.1, 0], scale: 2.2}});
  const k = buildKaiju();
  st.addBee(k);
  const resize = () => st.resize(1600, 900, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
  resize();
  return {
    resize,
    render(t) {
      const v = VIEWS[Math.min(VIEWS.length - 1, Math.floor(t))];
      st.frame({...v, az: v.az * D2R, el: v.el * D2R, fov: 30}, {guides: 0});
      return {};
    },
  };
});
