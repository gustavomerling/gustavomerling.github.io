import { useEffect, useRef } from 'react';
import { drawWeaponIcon } from '@game/session';

const W = 120;
const H = 44;

/** The gun in hand, drawn with the game's own vector model. */
export function GunIcon({ model, attachments }: { model: string; attachments: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = attachments.join(',');
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawWeaponIcon(ctx, W, H, model, key ? key.split(',') : []);
  }, [model, key]);
  return <canvas ref={ref} className="hud-gun-icon" style={{ width: W, height: H }} />;
}
