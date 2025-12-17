import { BaseBlock, type BlockData } from '../BaseBlock';

export class ArmorBlock extends BaseBlock {
    public data: BlockData = {
        id: 'armor',
        color: '#888888',
        baseHealth: 3,
        scoreValue: 150,
        spawnWeight: 1,
        dropType: 'NONE'
    };

    public init(): void {
        this.currentHealth = 3;
    }

    public onHit(damage: number): void {
        super.onHit(damage);
        if (this.currentHealth === 2) this.data.color = '#AAAAAA';
        if (this.currentHealth === 1) this.data.color = '#CCCCCC';
    }
}
