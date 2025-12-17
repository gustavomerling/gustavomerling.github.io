import { BaseBlock } from '../BaseBlock';
import type { BlockData } from '../BaseBlock';
import { blockRegistry } from '../BlockRegistry';
import { eventBus } from '../../events/EventBus';
import { GameEventType } from '../../events/GameEvents';

/**
 * Explosive Block - Destroys nearby blocks when hit
 */
export class ExplosiveBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'explosive',
        baseHealth: 1,
        spawnWeight: 20,
        dropType: 'NONE',
        color: '#fb8500', // Orange
        scoreValue: 50
    };

    public onDestroy(): void {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        // Emit explosion event
        eventBus.emit(GameEventType.BLOCK_DESTROYED, {
            blockId: this.instanceId,
            type: this.data.id,
            isExplosion: true,
            position: { x: this.position.x + this.width / 2, y: this.position.y + this.height / 2 }
        });
    }
}

blockRegistry.register('explosive', ExplosiveBlock);
