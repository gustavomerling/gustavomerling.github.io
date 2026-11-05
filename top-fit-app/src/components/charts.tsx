import { useLayoutEffect, useRef, useState } from 'react';

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(300);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const PAD = { l: 34, r: 12, t: 22, b: 22 };

/** Linha de uma série só. Toque num ponto para ver o valor. */
export function LineChart({ points, unit, height = 160 }: { points: { label: string; value: number }[]; unit: string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [sel, setSel] = useState<number | null>(null);
  if (!points.length) return null;

  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 2) {
    min -= 1;
    max += 1;
  }
  const iw = w - PAD.l - PAD.r;
  const ih = height - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * ih;
  const ticks = [min, (min + max) / 2, max];
  const active = sel ?? points.length - 1;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

  return (
    <div ref={ref} className="w-full select-none">
      <svg width={w} height={height} role="img" aria-label={`Gráfico de ${unit}`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={w - PAD.r} y1={y(t)} y2={y(t)} className="stroke-border" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px]">
              {fmt(t)}
            </text>
          </g>
        ))}
        <polyline
          points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <g key={i} onPointerDown={() => setSel(i)} onPointerEnter={() => setSel(i)} className="cursor-pointer">
            <circle cx={x(i)} cy={y(p.value)} r={14} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.value)}
              r={i === active ? 5 : 3.5}
              className={i === active ? 'fill-primary stroke-card' : 'fill-card stroke-primary'}
              strokeWidth={2}
            />
          </g>
        ))}
        <text
          x={Math.min(Math.max(x(active), PAD.l + 30), w - PAD.r - 30)}
          y={y(points[active].value) - 12}
          textAnchor="middle"
          className="fill-foreground text-[11px] font-semibold"
        >
          {fmt(points[active].value)} {unit}
        </text>
        <text x={PAD.l} y={height - 4} className="fill-muted-foreground text-[10px]">
          {points[0].label}
        </text>
        {points.length > 1 && (
          <text x={w - PAD.r} y={height - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {points.at(-1)!.label}
          </text>
        )}
      </svg>
    </div>
  );
}

/** Barras de uma série só, com rótulo em cada coluna embaixo. */
export function BarChart({ bars, height = 130 }: { bars: { label: string; value: number }[]; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [sel, setSel] = useState<number | null>(null);
  const max = Math.max(3, ...bars.map((b) => b.value));
  const top = 18;
  const bottom = 20;
  const ih = height - top - bottom;
  const slot = w / bars.length;
  const bw = Math.min(28, slot - 8);

  return (
    <div ref={ref} className="w-full select-none">
      <svg width={w} height={height} role="img" aria-label="Checkins por semana">
        <line x1={0} x2={w} y1={top + ih} y2={top + ih} className="stroke-border" />
        {bars.map((b, i) => {
          const h = (b.value / max) * ih;
          const cx = slot * i + slot / 2;
          const show = sel === i || (sel === null && i === bars.length - 1);
          return (
            <g key={i} onPointerDown={() => setSel(i)} onPointerEnter={() => setSel(i)} className="cursor-pointer">
              <rect x={slot * i} y={0} width={slot} height={height} fill="transparent" />
              {b.value > 0 && (
                <path
                  d={`M${cx - bw / 2},${top + ih} v${-(h - 4)} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${h - 4} z`}
                  className={sel === i ? 'fill-primary' : 'fill-primary/70'}
                />
              )}
              {show && (
                <text x={cx} y={top + ih - h - 6} textAnchor="middle" className="fill-foreground text-[11px] font-semibold">
                  {b.value}
                </text>
              )}
              <text x={cx} y={height - 4} textAnchor="middle" className="fill-muted-foreground text-[10px]">
                {b.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
