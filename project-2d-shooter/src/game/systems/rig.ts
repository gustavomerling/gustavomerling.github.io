import { clamp } from '@engine/math/math';
import type { RigInput } from '../character/animator';
import { KICK, PLAYER_TUNING as T } from '../config';
import { ENEMIES } from '../content/enemies/catalog';
import { WEAPONS } from '../content/weapons/catalog';
import { GUN_MODELS, withAttachments, type GunModel } from '../content/weapons/models';
import { Aim, Arsenal, Body, Brain, Fencer, Npc, PlayerControl, Position, Rig, Velocity, Zombie } from '../world/components';
import type { RunSystem } from './context';
import { spawnDebris } from './effects';
import { fencerPose } from './fencing';
import { GUN } from '../render/palette';

const CASINGS = {
  brass: { shape: [-0.6, -0.25, 0.6, -0.25, 0.6, 0.25, -0.6, 0.25], color: GUN.brass },
  shell: { shape: [-0.9, -0.45, 0.9, -0.45, 0.9, 0.45, -0.9, 0.45], color: GUN.shell },
} as const;

/** A gun's magazine as a loose polygon around its centre, scaled and mirrored like the rig. */
function magShape(gun: GunModel, scale: number, facing: 1 | -1): number[] {
  const pts = gun.mag!.points;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i += 2) {
    cx += pts[i]!;
    cy += pts[i + 1]!;
  }
  cx /= pts.length / 2;
  cy /= pts.length / 2;
  return pts.map((v, i) => (i % 2 === 0 ? (v - cx) * scale * facing : (v - cy) * scale));
}

/**
 * Feeds every rigged character's state into its animator. The animator doesn't care
 * whether it's the player or an NPC; this system translates components into RigInput.
 */
export const rigSystem: RunSystem = {
  name: 'rig',
  update(world, ctx) {
    for (const [e, pos, vel, body, rig] of world.query(Position, Velocity, Body, Rig)) {
      const dt = body.playerTime ? ctx.playerDt : ctx.clock.dt;
      const pc = world.get(e, PlayerControl);
      const brain = world.get(e, Brain);
      const facing: 1 | -1 = pc?.facing ?? brain?.facing ?? rig.animator.facing;
      const npcState = body.climbing ? 'climb' : !body.onGround ? 'air' : brain?.downed ? 'crawl' : brain?.crouching ? 'crouch' : Math.abs(vel.x) > 4 ? 'run' : 'idle';

      const aim = world.get(e, Aim);
      const arsenal = world.get(e, Arsenal);
      const npc = world.get(e, Npc);
      const ws = arsenal?.weapons[arsenal.active];
      const weaponId = ws?.weapon.def.id ?? (npc ? ENEMIES.get(npc.defId).weaponId : undefined);

      const input: RigInput = {
        state: pc?.state ?? npcState,
        vx: vel.x,
        vy: vel.y,
        facing,
        aimAngle: aim?.angle ?? (facing > 0 ? 0 : Math.PI),
        gun: ws
          ? withAttachments(GUN_MODELS.get(ws.weapon.def.model), ws.weapon.attachments.map((a) => a.id))
          : weaponId
            ? GUN_MODELS.get(WEAPONS.get(weaponId).model)
            : null,
        cycle: ws ? clamp(ws.cooldown * ws.weapon.stats.fireRate, 0, 1) : 0,
        reload: ws && ws.reloadLeft > 0 ? 1 - ws.reloadLeft / ws.weapon.stats.reloadTime : undefined,
      };
      const fencer = world.get(e, Fencer);
      if (fencer) {
        input.blade = fencerPose(fencer);
        input.shield = fencer.shield;
        input.shieldUp = fencer.phase === 'block';
        input.lunge = fencer.phase === 'strike' ? 1 : fencer.phase === 'windup' ? -0.5 : fencer.phase === 'stunned' ? -1 : 0;
        input.fencePhase = fencer.phase;
        input.fenceProgress = fencer.duration > 0 ? clamp(fencer.t / fencer.duration, 0, 1) : 0;
        input.parry = clamp(fencer.parryFlash / 0.4, 0, 1);
      }
      const zombie = world.get(e, Zombie);
      if (zombie) input.zombie = { rush: zombie.rush, grabbing: zombie.grab !== null };
      if (pc) {
        const feetX = pos.x + body.w / 2;
        const feetY = pos.y + body.h;
        if (pc.state === 'wallSlide') input.wallSide = pc.wallSide;
        if (pc.state === 'wallJump') {
          input.wallSide = -pc.wallJumpDir as 1 | -1;
          input.progress = 1 - pc.wallKickLeft / T.wallKickTime;
        }
        if (pc.state === 'roll') input.progress = 1 - pc.rollLeft / T.rollTime;
        if (pc.kickLeft > 0) input.kick = 1 - pc.kickLeft / KICK.time;
        if (pc.state === 'mantle') {
          input.progress = pc.mantleTotal > 0 ? 1 - pc.mantleLeft / pc.mantleTotal : 1;
          input.ledge = { x: pc.mantleLedgeX - feetX, y: pc.mantleLedgeY - feetY };
        }
      }
      const anim = rig.animator;
      anim.update(dt, input);

      // Casings and magazines leave the gun as loose debris (local -> world, mirrored when facing left).
      for (const ev of anim.events) {
        const gun = anim.gun;
        if (!gun) continue;
        const f = anim.facing;
        const base = ev.kind === 'mag' ? { shape: magShape(gun, anim.s, f), color: GUN.dark } : CASINGS[gun.casing];
        spawnDebris(world, {
          x: pos.x + body.w / 2 + f * ev.x,
          y: pos.y + body.h + ev.y,
          vx: f * ev.vx + vel.x * 0.5,
          vy: ev.vy + Math.min(0, vel.y) * 0.5,
          // Mirrored shapes rotate the other way.
          angle: ev.kind === 'mag' ? f * ev.angle : f > 0 ? ev.angle : Math.PI - ev.angle,
          spin: ev.kind === 'mag' ? f * 4 : (Math.random() * 2 - 1) * 25,
          shape: base.shape,
          color: base.color,
          life: ev.kind === 'mag' ? 8 : 5,
        });
      }
      anim.events.length = 0;
    }
  },
};
