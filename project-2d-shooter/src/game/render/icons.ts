import { drawGun } from '../character/draw';
import { GUN_MODELS, withAttachments } from '../content/weapons/models';

/** Draws a gun (with its attachments) fitted into a w x h box, for UI icons. */
export function drawWeaponIcon(ctx: CanvasRenderingContext2D, w: number, h: number, modelId: string, attachments: readonly string[]): void {
  ctx.clearRect(0, 0, w, h);
  const def = GUN_MODELS.tryGet(modelId);
  if (!def) return;
  const gun = withAttachments(def, attachments);
  // Fit the whole silhouette (guns are long, shields are tall) into the box.
  let minX = 0;
  let maxX = gun.muzzle.x;
  let minY = 0;
  let maxY = 0;
  for (const part of [...gun.parts, ...(gun.mag ? [gun.mag] : [])]) {
    for (let i = 0; i < part.points.length; i += 2) {
      minX = Math.min(minX, part.points[i]!);
      maxX = Math.max(maxX, part.points[i]!);
      minY = Math.min(minY, part.points[i + 1]!);
      maxY = Math.max(maxY, part.points[i + 1]!);
    }
  }
  const scale = Math.min(7, (w - 10) / (maxX - minX), (h - 8) / Math.max(1, maxY - minY));
  drawGun(ctx, gun, w / 2 - ((minX + maxX) / 2) * scale, h / 2 - ((minY + maxY) / 2) * scale, 1, 0, scale, 0, '#000000', true);
}
