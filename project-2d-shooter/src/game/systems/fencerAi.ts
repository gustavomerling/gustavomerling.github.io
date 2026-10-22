import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import { AI } from '../config';
import { FENCE_AI, FENCING_KITS } from '../content/blades/kits';
import type { EnemyDef } from '../content/enemies/catalog';
import { Body, Fencer, Health, Npc, Position, type BodyData, type BrainData, type FencerData, type IntentData } from '../world/components';
import { bodyCenter } from '../world/geometry';
import type { RunContext } from './context';

type Pos = { x: number; y: number };

/**
 * Sword fighters' AI (skeletons, 'fencer' brain). Output is the same Intent the player's mouse
 * gives (fire = attack, block = shield); the swings themselves run in systems/fencing.ts.
 * Tuning: each kit's `ai` and FENCE_AI (content/blades/kits.ts).
 *
 *   approach  walk up until the player is in guard range
 *   measure   hold a distance just outside the player's cuts and pace in and out (shield up);
 *             fighters queue up behind each other on the same side
 *   press     has the attack token: step into reach and swing (sometimes a feint, sometimes a
 *             second cut). Only FENCE_AI.attackers fighters press at once.
 *   evade     hop back from the player's wind-up, then press into the follow-through
 *   retreat   (shield) guard almost broken: back off until stamina recovers
 *
 * Reactions: a knight throws its quick armoured counter right after blocking a hit; anyone
 * rushes in when the player is stunned (guard broken / parried). Turning around takes
 * kit.turnTime, so getting behind a shield is a real opening.
 */
export function fencerBrain(
  world: World,
  e: Entity,
  ctx: RunContext,
  def: EnemyDef,
  brain: BrainData,
  intent: IntentData,
  aim: { angle: number },
  pos: Pos,
  vel: Pos,
  body: BodyData,
  player: { e: Entity; center: Vec2 } | null,
  sees: boolean,
  dt: number,
): void {
  const f = world.get(e, Fencer);
  vel.x = 0;
  if (!f) return;
  const kit = FENCING_KITS.get(f.kitId);
  const tune = kit.ai;
  const ai = f.ai;
  const swinging = f.phase === 'windup' || f.phase === 'strike' || f.phase === 'recover';

  // Turning around takes a moment (the perception code already turned the brain).
  if (!swinging && brain.facing !== f.facing) {
    f.turnLeft += dt;
    if (f.turnLeft < kit.turnTime) brain.facing = f.facing;
    else f.turnLeft = 0;
  } else {
    f.turnLeft = 0;
  }
  aim.angle = brain.facing > 0 ? 0 : Math.PI;
  if (!tune) return;

  if (f.phase === 'stunned' || f.phase === 'hurt') {
    if (ai.mode === 'press') brain.cooldownLeft = Math.max(brain.cooldownLeft, ctx.rng.range(tune.pause.min, tune.pause.max));
    ai.mode = 'measure';
    ai.feint = false;
    return;
  }
  if (swinging) {
    // A feint: pull the wind-up back halfway, then come in for real shortly after.
    if (f.phase === 'windup' && ai.feint && f.t >= f.duration * tune.feintAt) {
      intent.blockHeld = true;
      ai.feint = false;
      brain.cooldownLeft = ctx.rng.range(0.25, 0.5);
      return;
    }
    // Chain the second cut.
    if (f.phase === 'strike' && brain.burstLeft > 0) {
      intent.firePressed = true;
      brain.burstLeft = 0;
    }
    // Following through (no second cut coming): give the attack token back.
    // The pause before its next attack starts now, not at the wind-up.
    if (f.phase === 'recover' && !f.queued && ai.mode === 'press') {
      ai.mode = 'measure';
      brain.cooldownLeft = Math.max(brain.cooldownLeft, ctx.rng.range(tune.pause.min, tune.pause.max));
    }
    return;
  }

  const me = bodyCenter(pos, body);
  const target = sees && player ? player.center : brain.lastSeen;
  if (!target) return;
  const dx = target.x - me.x;
  const dist = Math.abs(dx);
  const dir = Math.sign(dx) || brain.facing;
  const range = ai.mode === 'approach' ? FENCE_AI.guardRange : FENCE_AI.guardRange * 1.5;
  const engaged = sees && player !== null && Math.abs(target.y - me.y) <= FENCE_AI.sameLevel && dist < range;

  if (!engaged || !player) {
    intent.blockHeld = false;
    if (ai.mode !== 'approach') ai.mode = 'approach';
    if (!sees && dist < 4) {
      brain.lastSeen = null;
      return;
    }
    vel.x = dist <= 4 ? 0 : dir * def.moveSpeed * f.moveScale;
    if (vel.x !== 0 && body.onGround && body.hitWall) vel.y = -AI.melee.jumpSpeed;
    return;
  }

  if (ai.mode === 'approach') {
    // Just arrived: size the player up before the first attack.
    ai.mode = 'measure';
    brain.cooldownLeft = Math.max(brain.cooldownLeft, ctx.rng.range(0.3, 0.8));
  }

  const foe = world.get(player.e, Fencer);
  // The player winds up a cut at us: maybe hop back out of reach (once per cut).
  if (foe?.phase === 'windup') {
    if (!ai.sawSwing) {
      ai.sawSwing = true;
      if (dist < tune.measure.min && body.onGround && ctx.rng.chance(tune.evadeChance)) {
        ai.mode = 'evade';
        ai.left = FENCE_AI.evadeTime;
      }
    }
  } else if (foe?.phase !== 'strike') {
    ai.sawSwing = false;
  }

  if (ai.mode === 'evade') {
    ai.left -= dt;
    vel.x = -dir * FENCE_AI.evadeSpeed;
    if (ai.left <= 0) {
      // Landed out of reach: lunge into the player's follow-through.
      ai.mode = 'press';
      ai.feint = false;
      brain.cooldownLeft = 0;
    }
    return;
  }

  // Shield just stopped a hit: the counter-cut (rolled once per block).
  if (f.phase === 'block' && f.sinceBlocked <= dt * 1.01 && dist <= tune.strikeRange + 8 && ctx.rng.chance(tune.counterChance)) {
    f.opener = tune.counterSwing;
    intent.firePressed = true;
    brain.cooldownLeft = ctx.rng.range(tune.pause.min, tune.pause.max);
    brain.burstLeft = 0;
    ai.mode = 'press';
    ai.feint = false;
    return;
  }

  // Guard nearly broken: back off until it recovers (shield up only while still in reach).
  if (f.shield && tune.retreatStamina > 0) {
    if (f.stamina < kit.stamina * tune.retreatStamina) ai.mode = 'retreat';
    else if (ai.mode === 'retreat' && f.stamina >= kit.stamina * Math.min(1, tune.retreatStamina + 0.4)) ai.mode = 'measure';
  }
  if (ai.mode === 'retreat') {
    // Out of reach the shield comes down: it recovers much faster lowered.
    const keep = tune.measure.max + 24;
    intent.blockHeld = dist < tune.measure.max;
    if (dist < keep) vel.x = -dir * def.moveSpeed;
    return;
  }

  const attackers = attackersBesides(world, e);
  if (ai.mode === 'measure' && attackers < FENCE_AI.attackers) {
    if (foe?.phase === 'stunned') {
      // The player's guard is broken / their cut was parried: rush in.
      ai.mode = 'press';
      ai.feint = false;
      brain.cooldownLeft = 0;
    } else if (brain.cooldownLeft <= 0) {
      ai.mode = 'press';
      ai.feint = ctx.rng.chance(tune.feintChance);
    }
  }

  if (ai.mode === 'press') {
    if (dist <= tune.strikeRange) {
      if (dist < FENCE_AI.tooClose) vel.x = -dir * def.moveSpeed * f.moveScale;
      if (brain.cooldownLeft > 0) {
        intent.blockHeld = f.shield;
        return;
      }
      intent.firePressed = true;
      brain.burstLeft = !ai.feint && ctx.rng.chance(tune.comboChance) ? 1 : 0;
      return;
    }
    // Closing in. A knight walks on behind its shield; a shieldless one never steps into a cut
    // already coming: it waits at the edge for the follow-through instead.
    intent.blockHeld = f.shield;
    const incoming = !f.shield && (foe?.phase === 'windup' || foe?.phase === 'strike');
    vel.x = incoming && dist < tune.measure.min ? -dir * def.moveSpeed * f.moveScale : incoming && dist <= tune.measure.max ? 0 : dir * def.moveSpeed * f.moveScale;
    return;
  }

  // Measuring: hold the distance band (further back behind allies on the same side), pacing.
  const rank = queueRank(world, e, me, player.center);
  const lo = tune.measure.min + rank * FENCE_AI.queueSpacing;
  const hi = tune.measure.max + rank * FENCE_AI.queueSpacing;
  intent.blockHeld = f.shield;
  ai.left -= dt;
  if (ai.left <= 0) {
    ai.pace = ai.pace > 0 ? -1 : 1;
    ai.left = ctx.rng.range(FENCE_AI.paceTime.min, FENCE_AI.paceTime.max);
  }
  if (dist < FENCE_AI.tooClose || dist < lo) vel.x = -dir * def.moveSpeed * f.moveScale;
  else if (dist > hi) vel.x = dir * def.moveSpeed * f.moveScale;
  else vel.x = ai.pace * dir * def.moveSpeed * FENCE_AI.paceSpeed * f.moveScale;
}

const alive = (world: World, e: Entity) => (world.get(e, Health)?.hp ?? 0) > 0;
const attacking = (f: FencerData) => f.ai.mode === 'press' || f.phase === 'windup' || f.phase === 'strike';

/** Other enemy fighters holding an attack token (stepping in or mid-cut). */
function attackersBesides(world: World, e: Entity): number {
  let n = 0;
  for (const [o, f] of world.query(Fencer, Npc)) if (o !== e && alive(world, o) && attacking(f)) n++;
  return n;
}

/** How many enemy fighters stand between us and the target on the same side. */
function queueRank(world: World, e: Entity, me: Vec2, target: Vec2): number {
  const side = Math.sign(me.x - target.x);
  const mine = Math.abs(me.x - target.x);
  let rank = 0;
  for (const [o, , , pos, body] of world.query(Fencer, Npc, Position, Body)) {
    if (o === e || !alive(world, o)) continue;
    const c = bodyCenter(pos, body);
    if (Math.sign(c.x - target.x) === side && Math.abs(c.x - target.x) < mine && Math.abs(c.y - target.y) <= FENCE_AI.sameLevel) rank++;
  }
  return rank;
}
