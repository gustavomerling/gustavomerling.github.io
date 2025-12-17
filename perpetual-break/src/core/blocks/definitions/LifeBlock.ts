import { BaseBlock } from '../BaseBlock';
import type { BlockData } from '../BaseBlock';
import { blockRegistry } from '../BlockRegistry';
import { eventBus } from '../../events/EventBus';
import { GameEventType } from '../../events/GameEvents';

/**
 * Life Block - Drops an extra life upgrade
 */
export class LifeBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'life',
        baseHealth: 2,
        spawnWeight: 10,
        dropType: 'NONE',
        color: '#ff006e', // Pink/Magenta
        scoreValue: 100
    };

    public onDestroy(): void {
        if (this.isDestroyed) return;
        super.onDestroy();

        // Always drop life
        eventBus.emit(GameEventType.UPGRADE_COLLECTED, { type: 'extra_life' });
    }
}

blockRegistry.register('life', LifeBlock);
