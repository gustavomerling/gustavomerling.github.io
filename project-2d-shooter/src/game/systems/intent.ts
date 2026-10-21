import { emptyIntent, Health, Intent, PlayerControl } from '../world/components';
import type { RunSystem } from './context';

/** Keyboard/mouse -> the player's Intent (AI fills the same component for enemies). */
export const playerIntentSystem: RunSystem = {
  name: 'playerIntent',
  update(world, ctx) {
    const { input } = ctx;
    for (const [, , intent, health] of world.query(PlayerControl, Intent, Health)) {
      if (health.hp <= 0) {
        Object.assign(intent, emptyIntent());
        continue;
      }
      intent.fireHeld = input.isDown('fire');
      intent.firePressed = input.pressed('fire');
      intent.reload = input.pressed('reload');
      intent.switchBy = (input.pressed('nextWeapon') ? 1 : 0) - (input.pressed('prevWeapon') ? 1 : 0);
    }
  },
};
