import { BaseUpgrade, type UpgradeConfig } from '../UpgradeRegistry';
import { upgradeRegistry } from '../UpgradeRegistry';
import { eventBus } from '../../events/EventBus';
import { GameEventType } from '../../events/GameEvents';

/**
 * Multiball Upgrade
 * Spawns an additional ball when collected
 */
export class MultiballUpgrade extends BaseUpgrade {
    public readonly type = 'multiball';
    public readonly isNegative = false;

    private static readonly MAX_BALLS = 10; // Limit to prevent chaos
    private activeBallCount = 0;

    constructor(config: UpgradeConfig) {
        super(config);
        this.setupListeners();
    }

    /**
     * Listen to ball events to track active ball count
     */
    private setupListeners(): void {
        eventBus.on(GameEventType.BALL_SPAWN, () => {
            this.activeBallCount++;
        });

        eventBus.on(GameEventType.BALL_LOST, () => {
            this.activeBallCount = Math.max(0, this.activeBallCount - 1);
        });

        eventBus.on(GameEventType.ALL_BALLS_LOST, () => {
            this.activeBallCount = 0;
        });
    }

    /**
     * Called when the upgrade is collected
     */
    public onCollect(): void {
        // Check if we've hit the max ball limit
        if (this.activeBallCount >= MultiballUpgrade.MAX_BALLS) {
            console.warn('Max balls reached, cannot spawn more');
            return;
        }

        // Spawn a new ball at a random position near the top
        const spawnX = 256 + Math.random() * 512; // Random X in middle area
        const spawnY = 300;

        // Random angle between -45 and 45 degrees
        const angle = (Math.random() - 0.5) * Math.PI / 2;
        const speed = 400;

        eventBus.emit(GameEventType.BALL_SPAWN, {
            position: { x: spawnX, y: spawnY },
            velocity: {
                x: Math.sin(angle) * speed,
                y: Math.cos(angle) * speed
            }
        });

        console.log('Multiball activated! New ball spawned.');
    }

    /**
     * Called when the upgrade expires (not applicable for instant upgrades)
     */
    public onExpire(): void {
        // Multiball is an instant effect, no expiration logic needed
    }
}

// Auto-register this upgrade
upgradeRegistry.register('multiball', MultiballUpgrade);
