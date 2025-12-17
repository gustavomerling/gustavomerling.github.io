import type { BlockInstanceConfig } from '../blocks/BaseBlock';
// Import block definitions to trigger auto-registration
import '../blocks/definitions';

export interface RowConfig {
    rowIndex: number;
    blocks: BlockInstanceConfig[];
}

export class LevelGenerator {
    private static readonly CANVAS_WIDTH = 1024;
    private static readonly BASE_COLUMNS = 8;
    private static readonly ROW_HEIGHT = 40;
    private static readonly BLOCK_PADDING = 5;

    /**
     * Generates a specific row based on its index (difficulty).
     * @param rowIndex The absolute index of the row (0-based)
     * @param yPosition The vertical position to place this row
     */
    public generateRow(rowIndex: number, yPosition: number): RowConfig {
        const cycleIndex = rowIndex % 5;
        const cycleCount = Math.floor(rowIndex / 5);
        const difficultyMultiplier = 1 + (cycleCount * 0.1); // 10% harder per cycle

        // Calculate number of columns (density)
        // "Aumentar o número total de blocos em 20% a cada 10 fileiras"
        const densityBonus = Math.floor(rowIndex / 10) * 0.2;
        const columns = Math.floor(LevelGenerator.BASE_COLUMNS * (1 + densityBonus));

        const blockWidth = (LevelGenerator.CANVAS_WIDTH - (columns + 1) * LevelGenerator.BLOCK_PADDING) / columns;

        const blocks: BlockInstanceConfig[] = [];

        for (let col = 0; col < columns; col++) {
            // Determine block type based on rules
            const typeId = this.selectBlockType(cycleIndex, difficultyMultiplier);

            if (typeId) {
                blocks.push({
                    id: `row_${rowIndex}_col_${col}`,
                    position: {
                        x: LevelGenerator.BLOCK_PADDING + col * (blockWidth + LevelGenerator.BLOCK_PADDING),
                        y: yPosition
                    },
                    width: blockWidth,
                    height: LevelGenerator.ROW_HEIGHT
                });
            }
        }

        return { rowIndex, blocks };
    }

    private selectBlockType(cycleIndex: number, difficulty: number): string | null {
        const rand = Math.random();

        // Base probabilities (can be tweaked)
        const upgradeChance = 0.05 * difficulty; // Increases with difficulty
        const downgradeChance = 0.05; // Fixed low chance
        const specialChance = 0.1 * difficulty;

        switch (cycleIndex) {
            case 0: // Row 1: Simple blocks only
                return 'basic';

            case 1: // Row 2: Simple + Upgrade chance
                return rand < upgradeChance ? 'lucky' : 'basic';

            case 2: // Row 3: Simple (Denser - handled by column calc), just return basic here
                return 'basic';

            case 3: // Row 4: Simple + Upgrade + Downgrade + Special
                if (rand < upgradeChance) return 'lucky';
                if (rand < upgradeChance + downgradeChance) return 'downgrade';
                if (rand < upgradeChance + downgradeChance + specialChance) return 'strong';
                return 'basic';

            case 4: // Row 5: Simple with more HP (Strong blocks)
                return 'strong';

            default:
                return 'basic';
        }
    }
}

export const levelGenerator = new LevelGenerator();
