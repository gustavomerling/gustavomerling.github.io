import { BaseBlock, type BlockData } from '../BaseBlock';

export class SpeedBlock extends BaseBlock {
    public data: BlockData = {
        id: 'speed',
        color: '#00FFFF',
        baseHealth: 1,
        scoreValue: 200,
        spawnWeight: 1,
        dropType: 'NONE'
    };

    public init(): void {
        this.currentHealth = 1;
    }
}
