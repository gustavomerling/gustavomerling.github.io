import { BaseBlock } from '../BaseBlock';
import type { BlockData } from '../BaseBlock';
import { blockRegistry } from '../BlockRegistry';
import { eventBus } from '../../events/EventBus';
import { GameEventType } from '../../events/GameEvents';

/**
 * Simple Block - Easy (Retro Teal)
 * - 1 HP
 * - 10% chance to drop coins
 */
export class SimpleBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'simple',
        baseHealth: 1,
        spawnWeight: 100,
        dropType: 'NONE',
        color: '#03A6A1', // Retro Teal
        scoreValue: 10
    };

    public onDestroy(): void {
        if (this.isDestroyed) return;
        super.onDestroy();

        if (Math.random() < 0.1) {
            const coinAmount = Math.floor(Math.random() * 3) + 1;
            eventBus.emit(GameEventType.COINS_EARNED, { amount: coinAmount });
        }
    }
}

blockRegistry.register('simple', SimpleBlock);
