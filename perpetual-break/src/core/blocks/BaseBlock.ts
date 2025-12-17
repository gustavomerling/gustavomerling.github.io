import { eventBus } from '../events/EventBus';
import { GameEventType } from '../events/GameEvents';

export type BlockDropType = 'NONE' | 'UPGRADE' | 'DOWNGRADE' | 'COIN';

/**
 * Static definition data for a block type.
 */
export interface BlockData {
    id: string;          // Type ID (e.g., 'basic_block')
    baseHealth: number;
    spawnWeight: number; // Probability weight for generation
    dropType: BlockDropType;
    color: string;       // Hex code or CSS color
    scoreValue: number;
}

/**
 * Configuration for a specific block instance.
 */
export interface BlockInstanceConfig {
    id: string; // Unique Instance ID
    position: { x: number, y: number };
    width: number;
    height: number;
}

/**
 * Base class for all blocks.
 * Extend this to create new block types.
 */
export abstract class BaseBlock {
    // Abstract property forces subclasses to define their data
    public abstract readonly data: BlockData;

    public instanceId: string;
    public position: { x: number, y: number };
    public width: number;
    public height: number;
    public currentHealth: number = 0;
    public isDestroyed: boolean = false;

    constructor(config: BlockInstanceConfig) {
        this.instanceId = config.id;
        this.position = config.position;
        this.width = config.width;
        this.height = config.height;

        // Initialize health from data (will be available in subclass)
        // We use a timeout or immediate call to init because 'data' might not be set in super() call depending on TS compilation
        // But abstract readonly properties are usually safe to access if defined as class properties
    }

    /**
     * Called immediately after instantiation to set up initial state.
     */
    public init() {
        this.currentHealth = this.data.baseHealth;
    }

    /**
     * Hook called when the block is hit by a ball.
     * @param damage Amount of damage taken
     */
    public onHit(damage: number): void {
        if (this.isDestroyed) return;

        this.currentHealth -= damage;

        eventBus.emit(GameEventType.BLOCK_HIT, {
            blockId: this.instanceId,
            damage
        });

        if (this.currentHealth <= 0) {
            this.onDestroy();
        }
    }

    /**
     * Hook called when the block's health reaches zero.
     */
    public onDestroy(): void {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        eventBus.emit(GameEventType.BLOCK_DESTROYED, {
            blockId: this.instanceId,
            type: this.data.id,
            position: this.position
        });

        // Handle drops logic here or via event listener?
        // User requirement: "tipo de drop (nenhum, upgrade, downgrade, moedas)"
        // We emit the event, and a DropSystem should handle the actual spawning based on the block type/data.
        // But we can also emit a specific drop event here if we want the block to decide.
        // For now, BLOCK_DESTROYED carries the type, so the system can look up the drop type.
    }
}
