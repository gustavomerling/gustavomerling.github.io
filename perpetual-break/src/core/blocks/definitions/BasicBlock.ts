import { BaseBlock } from '../BaseBlock';
import type { BlockData } from '../BaseBlock';
import { blockRegistry } from '../BlockRegistry';

/**
 * Basic Block - Medium (Retro Peach)
 * - 2 HP
 */
export class BasicBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'basic',
        baseHealth: 2,
        spawnWeight: 80,
        dropType: 'NONE',
        color: '#FFA673', // Retro Peach
        scoreValue: 20
    };
}

blockRegistry.register('basic', BasicBlock);
