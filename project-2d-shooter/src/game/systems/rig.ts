import type { RigInput } from '../character/animator';
import { ENEMIES } from '../content/enemies/catalog';
import { WEAPONS } from '../content/weapons/catalog';
import { Aim, Arsenal, Body, Brain, Npc, PlayerControl, Position, Rig, Velocity } from '../world/components';
import type { RunSystem } from './context';

/**
 * Feeds every rigged character's state into its animator. The animator doesn't care
 * whether it's the player or an NPC; this system translates components into RigInput.
 */
export const rigSystem: RunSystem = {
  name: 'rig',
  update(world, ctx) {
    for (const [e, , vel, body, rig] of world.query(Position, Velocity, Body, Rig)) {
      const dt = body.playerTime ? ctx.playerDt : ctx.clock.dt;
      const pc = world.get(e, PlayerControl);
      const brain = world.get(e, Brain);
      const facing: 1 | -1 = pc?.facing ?? brain?.facing ?? rig.animator.facing;
      const npcState = !body.onGround ? 'air' : brain?.crouching ? 'crouch' : Math.abs(vel.x) > 4 ? 'run' : 'idle';

      const aim = world.get(e, Aim);
      const arsenal = world.get(e, Arsenal);
      const npc = world.get(e, Npc);
      const weaponId = arsenal ? arsenal.weapons[arsenal.active]?.weapon.def.id : npc ? ENEMIES.get(npc.defId).weaponId : undefined;

      const input: RigInput = {
        state: pc?.state ?? npcState,
        vx: vel.x,
        vy: vel.y,
        facing,
        aimAngle: aim?.angle ?? (facing > 0 ? 0 : Math.PI),
        weaponClass: weaponId ? WEAPONS.get(weaponId).weaponClass : null,
      };
      rig.animator.update(dt, input);
    }
  },
};
