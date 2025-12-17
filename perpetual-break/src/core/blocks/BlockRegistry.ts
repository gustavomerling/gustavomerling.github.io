import { BaseBlock } from './BaseBlock';
import type { BlockInstanceConfig } from './BaseBlock';

export type BlockConstructor = new (config: BlockInstanceConfig) => BaseBlock;

class BlockRegistry {
    private blocks: Map<string, BlockConstructor> = new Map();

    /**
     * Register a new block type.
     * @param typeId The unique ID of the block type (must match data.id)
     * @param blockClass The class constructor
     */
    public register(typeId: string, blockClass: BlockConstructor) {
        if (this.blocks.has(typeId)) {
            console.warn(`Block type "${typeId}" is already registered. Overwriting.`);
        }
        this.blocks.set(typeId, blockClass);
        console.log(`Block registered: ${typeId}`);
    }

    public get(typeId: string): BlockConstructor | undefined {
        return this.blocks.get(typeId);
    }

    public getAllTypes(): string[] {
        return Array.from(this.blocks.keys());
    }

    /**
     * Helper to create a block instance by type ID.
     */
    public create(typeId: string, config: BlockInstanceConfig): BaseBlock | null {
        const Ctor = this.get(typeId);
        if (!Ctor) {
            console.error(`Block type "${typeId}" not found.`);
            return null;
        }
        const block = new Ctor(config);
        block.init();
        return block;
    }
}

export const blockRegistry = new BlockRegistry();
