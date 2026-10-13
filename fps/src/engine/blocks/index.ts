import { arrowBlock } from './arrow.ts'
import { blinkBlock } from './blink.ts'
import { bounceBlock } from './bounce.ts'
import { crumbleBlock } from './crumble.ts'
import { hazardBlock } from './hazard.ts'
import { lampBlock } from './lamp.ts'
import { solidBlock } from './solid.ts'
import type { BlockType } from './types.ts'

/** Registry of every block type available to levels, keyed by `id`. */
export const BLOCK_TYPES: Record<string, BlockType> = Object.fromEntries(
  [solidBlock, hazardBlock, bounceBlock, crumbleBlock, blinkBlock, lampBlock, arrowBlock].map((type) => [
    type.id,
    type,
  ]),
)

/** Register a new block type at runtime (or just add it to BLOCK_TYPES above). */
export function registerBlockType(type: BlockType) {
  BLOCK_TYPES[type.id] = type
}

export type { BlockDef, BlockKind, BlockSpecial, BlockType, ResolvedBlock } from './types.ts'
