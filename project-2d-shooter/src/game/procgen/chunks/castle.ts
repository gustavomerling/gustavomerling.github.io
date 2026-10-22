import type { RoomTemplate } from '../rooms';

const ROOM_COLS = 30;
const ROOM_ROWS = 21;

/**
 * Castelo (modo medieval): a straight, flat test field. Every chunk is open-air and has the
 * ground on the same row, so combat can be tested without platforms, ladders or storeys.
 *
 *   P  player spawn   X  exit   E  enemy spawn
 */

type Mark = { col: number; char: 'P' | 'X' | 'E' };

function flatRoom(id: string, name: string, marks: readonly Mark[]): RoomTemplate {
  const rows = Array.from({ length: ROOM_ROWS }, (_, r) => {
    if (r === 0 || r === ROOM_ROWS - 1) return '#'.repeat(ROOM_COLS);
    const cols = [...`#${'.'.repeat(ROOM_COLS - 2)}#`];
    if (r === ROOM_ROWS - 2) for (const m of marks) cols[m.col] = m.char;
    return cols.join('');
  });
  return { id, name, tags: ['castle'], outdoor: true, noUpperDoors: true, rows };
}

// Enemies come in small groups spread across each room (the first room is always quiet), so a
// fight is one or two blades at a time plus whoever queues up: see the attack tokens in
// content/blades/kits.ts (FENCE_AI). The last room is the hardest.
export const CASTLE_CHUNKS: readonly RoomTemplate[] = [
  flatRoom('castle-gate', 'Portão do castelo', [{ col: 4, char: 'P' }]),
  flatRoom('castle-yard', 'Pátio de treino', [
    { col: 12, char: 'E' },
    { col: 22, char: 'E' },
  ]),
  flatRoom('castle-hall', 'Salão dos ossos', [
    { col: 8, char: 'E' },
    { col: 18, char: 'E' },
    { col: 26, char: 'E' },
  ]),
  flatRoom('castle-bridge', 'Ponte levadiça', [
    { col: 8, char: 'E' },
    { col: 14, char: 'E' },
    { col: 20, char: 'E' },
    { col: 26, char: 'X' },
  ]),
];
