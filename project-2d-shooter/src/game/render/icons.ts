import { drawGun } from '../character/draw';
import { GUN_MODELS, withAttachments } from '../content/weapons/models';

/** Draws a gun (with its attachments) fitted into a w x h box, for UI icons. */
export function drawWeaponIcon(ctx: CanvasRenderingContext2D, w: number, h: number, modelId: string, attachments: readonly string[]): void {
  ctx.clearRect(0, 0, w, h);
  const def = GUN_MODELS.tryGet(modelId);
  if (!def) return;
  const gun = withAttachments(def, attachments);
  // Fit the gun's length (stock to muzzle) into the box.
  let min = 0;
  let max = gun.muzzle.x;
  for (const part of [...gun.parts, ...(gun.mag ? [gun.mag] : [])]) {
    for (let i = 0; i < part.points.length; i += 2) {
      min = Math.min(min, part.points[i]!);
      max = Math.max(max, part.points[i]!);
    }
  }
  const scale = Math.min(7, (w - 10) / (max - min));
  drawGun(ctx, gun, w / 2 - ((min + max) / 2) * scale, h / 2, 1, 0, scale, 0, '#000000', true);
}
