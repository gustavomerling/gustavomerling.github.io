import { BaseBlock } from '../BaseBlock';
import type { BlockData } from '../BaseBlock';
import { blockRegistry } from '../BlockRegistry';
import { eventBus } from '../../events/EventBus';
import { GameEventType } from '../../events/GameEvents';

/**
 * Lucky Block - High chance to drop upgrades
 */
export class LuckyBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'lucky',
        baseHealth: 1,
        spawnWeight: 15,
        dropType: 'NONE',
        color: '#FFE3BB', // Cream
        scoreValue: 50
    };

    public onDestroy(): void {
        if (this.isDestroyed) return;
        super.onDestroy();

        // 80% chance to drop upgrade
        if (Math.random() < 0.8) {
            eventBus.emit(GameEventType.UPGRADE_DROPPED, {
                type: 'random',
                position: { x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 }
            });
        }
    }
}

blockRegistry.register('lucky', LuckyBlock);
