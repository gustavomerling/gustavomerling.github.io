import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/useApp';
import { ACCENTS } from '@/lib/theme';
import { bodyPrims, boxCorners, depth, poseAt, project, solve, type AnimDef, type Prim, type View } from './rig';

/** Fecho convexo (monotone chain) dos pontos projetados. */
function hull(pts: [number, number][]) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const crossZ = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Cantos arredondados das caixas */
const BOX_ROUND = 0.025;

const EQUIP_COLOR = '#171717';
const FAR_OPACITY = 0.35;
/** Equipamento levemente transparente para deixar ver as mãos/membros atrás dele */
const EQUIP_OPACITY = 0.88;
/** Espessura do contorno branco */
const HALO = 0.035;

/** Relógio compartilhado que só roda enquanto o quadro está visível. */
function useAnimTime(ref: React.RefObject<Element | null>) {
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const tick = (now: number) => {
      if (visible) setT((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const io = ref.current ? new IntersectionObserver(([e]) => (visible = e.isIntersecting)) : null;
    if (ref.current && io) io.observe(ref.current);
    return () => {
      cancelAnimationFrame(raf);
      io?.disconnect();
    };
  }, [ref]);
  return t;
}

export function ExerciseFigure({ def, view, className, time }: { def: AnimDef; view: View; className?: string; time?: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const clock = useAnimTime(ref);
  // Corpo na cor de destaque escolhida (tom escuro o bastante para o fundo branco)
  const accent = useApp((s) => s.theme.accent);
  const BODY_COLOR = ACCENTS.find((a) => a.id === accent)?.figure ?? '#16a34a';
  const t = time ?? clock;

  const joints = solve(poseAt(def, t), def);
  const total = def.keys.at(-1)!.t;
  const phase = (((t % total) + total) % total) / total;
  const prims: Prim[] = [...bodyPrims(joints), ...(def.equipment?.(joints, phase) ?? [])];

  // Agrupa (um braço, uma perna, o tronco, um halter...) e ordena os grupos pela parte mais próxima.
  const primDepth = (p: Prim) => (p.b ? (depth(p.a, view) + depth(p.b, view)) / 2 : depth(p.a, view)) + (p.bias ?? 0);
  const groupMap = new Map<string, Prim[]>();
  prims.forEach((p, i) => {
    const k = p.group ?? `_${i}`;
    groupMap.set(k, [...(groupMap.get(k) ?? []), p]);
  });
  const groups = [...groupMap.entries()]
    .map(([key, ps]) => ({ key, ps, d: Math.max(...ps.map(primDepth)) }))
    .sort((a, b) => a.d - b.d);

  const [x0, x1] = (view === 'front' ? def.frame?.front : def.frame?.side) ?? [-1, 1];
  const top = def.frame?.top ?? 2.02;
  const bottom = -0.08;
  const w = x1 - x0;
  const h = top - bottom;
  const size = Math.max(w, h);
  const vx = x0 - (size - w) / 2;
  const vy = -(size - h) / 2;
  const sy = (y: number) => top - y; // y para cima → SVG para baixo

  return (
    <svg ref={ref} viewBox={`${vx} ${vy} ${size} ${size}`} className={className} role="img">
      <rect x={vx} y={vy} width={size} height={size} fill="#ffffff" />
      {/* chão e sombra */}
      <line x1={vx} x2={vx + size} y1={sy(0)} y2={sy(0)} stroke="#e5e5e5" strokeWidth={0.012} />
      <ellipse
        cx={project(joints.pelvis, view)[0]}
        cy={sy(0)}
        rx={view === 'front' ? 0.32 : 0.3}
        ry={0.025}
        fill="#000"
        opacity={0.06}
      />
      {groups.map(({ key, ps }) => {
        const first = ps[0];
        const far = view === 'side' && first.side === 0;
        const opacity = (first.opacity ?? (first.color === 'equip' ? EQUIP_OPACITY : 1)) * (far ? FAR_OPACITY : 1);
        // Contorno branco (estilo pictograma) só por fora do grupo; nada entre as partes do mesmo membro
        const halo = far ? 0 : HALO;
        const draw = (p: Prim, i: number, fill: string, extra: number) => {
          const w = typeof p.w === 'number' ? p.w : p.w[view];
          const [ax, ay] = project(p.a, view);
          if (p.kind === 'circle') return <circle key={i} cx={ax} cy={sy(ay)} r={w + extra / 2} fill={fill} />;
          if (p.kind === 'box') {
            const pts = hull(boxCorners(p).map((c) => project(c, view)))
              .map(([x, y]) => `${x},${sy(y)}`)
              .join(' ');
            return <polygon key={i} points={pts} fill={fill} stroke={fill} strokeWidth={BOX_ROUND * 2 + extra} strokeLinejoin="round" />;
          }
          const [bx, by] = project(p.b!, view);
          return (
            <line key={i} x1={ax} y1={sy(ay)} x2={bx} y2={sy(by)} stroke={fill} strokeWidth={w + extra} strokeLinecap="round" />
          );
        };
        return (
          <g key={key} opacity={opacity}>
            {halo > 0 && ps.map((p, i) => draw(p, i, '#fff', halo))}
            {ps.map((p, i) => draw(p, i + ps.length, p.color === 'body' ? BODY_COLOR : EQUIP_COLOR, 0))}
          </g>
        );
      })}
    </svg>
  );
}
