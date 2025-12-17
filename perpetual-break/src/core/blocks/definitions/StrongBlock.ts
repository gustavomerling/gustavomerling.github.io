import { BaseBlock } from '../BaseBlock';
import type { BlockData } from '../BaseBlock';
import { blockRegistry } from '../BlockRegistry';

/**
 * Strong Block - Hard (Retro Orange/Red)
 * - 3 HP
 */
export class StrongBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'strong',
        baseHealth: 3,
        spawnWeight: 50,
        dropType: 'NONE',
        color: '#FF4F0F', // Retro Orange/Red
        scoreValue: 30
    };
}

blockRegistry.register('strong', StrongBlock);
