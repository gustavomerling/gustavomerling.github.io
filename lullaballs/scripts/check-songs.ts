// Validates every song in musicas/: notes parse, durations, tempo and category.
import fs from 'node:fs';
import path from 'node:path';
import { CATEGORIES, parseEntry } from '../src/audio/notes';

const dir = path.join(process.cwd(), 'musicas');
let bad = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const song = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const problems: string[] = [];
  let beats = 0;
  for (const n of song.notes) {
    try { beats += parseEntry(n).beats; } catch (e) { problems.push(String(e)); }
  }
  if (!song.bpm) problems.push('sem bpm');
  if (!song.titleEn || !song.composerEn) problems.push('sem titleEn/composerEn (a legenda é em inglês)');
  if (!(song.category in CATEGORIES)) problems.push(`categoria inválida: ${song.category}`);
  if (problems.length) bad++;
  const secs = song.bpm ? (beats * 60) / song.bpm : 0;
  console.log(`${problems.length ? '✗' : '✓'} ${f}: ${song.notes.length} notas, ${beats} tempos, ${song.bpm} bpm (~${secs.toFixed(0)}s), ${song.category} ${problems.join('; ')}`);
}
process.exit(bad ? 1 : 0);
