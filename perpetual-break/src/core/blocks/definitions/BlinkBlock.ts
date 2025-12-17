import { BaseBlock, type BlockInstanceConfig, type BlockData } from '../BaseBlock';

export class BlinkBlock extends BaseBlock {
    public readonly data: BlockData = {
        id: 'blink',
        baseHealth: 1,
        spawnWeight: 0.1,
        dropType: 'UPGRADE',
        color: '#03A6A1',
        scoreValue: 150
    };

    public blinkTimer: number = 0;
    public isVisible: boolean = true;

    constructor(config: BlockInstanceConfig) {
        super(config);
    }

    public update(dt: number): void {
        this.blinkTimer += dt;
        if (this.blinkTimer >= 2) {
            this.blinkTimer = 0;
            this.isVisible = !this.isVisible;
        }
    }

    public onHit(damage: number): void {
        if (!this.isVisible) return;
        super.onHit(damage);
    }
}
