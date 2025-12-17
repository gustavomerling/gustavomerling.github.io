import { BaseBlock } from '../BaseBlock';
import type { BlockData } from '../BaseBlock';

export class DowngradeBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'downgrade',
        baseHealth: 1,
        spawnWeight: 5,
        dropType: 'DOWNGRADE',
        color: '#e63946', // Red
        scoreValue: -50
    };
}
