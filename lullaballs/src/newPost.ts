import type { Song } from './audio/notes';
import { BACKGROUNDS, getBackground } from './engine/backgrounds';
import { PALETTES, getPalette } from './engine/palettes';
import { findSeed } from './engine/run';
import { TEMPLATES, getTemplate } from './engine/templates';
import type { Look } from './engine/types';
import { parseDate } from './dates';
import type { Post } from './types';

const BASE_TAGS = ['#lullaballs', '#relaxing', '#satisfying', '#bouncingball', '#sleepmusic', '#piano'];

/** "Für Elise" -> "#furelise" */
export function songTag(song: Song) {
  if (song.tag) return song.tag;
  return '#' +song.title.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function hashtags(song: Song | undefined, look: Look) {
  const tags = [
    ...BASE_TAGS,
    ...(song ? [songTag(song)] : []),
    ...getBackground(look.background).tags,
    ...getPalette(look.palette).tags,
  ];
  return [...new Set(tags)].join(' ');
}

/** Replaces the trailing hashtag line(s) of a caption, keeping whatever the user wrote above them. */
export function withHashtags(caption: string, song: Song | undefined, look: Look) {
  const lines = caption.split('\n');
  while (lines.length && (lines.at(-1)!.trim() === '' || lines.at(-1)!.trim().startsWith('#'))) lines.pop();
  const body = lines.join('\n').trimEnd();
  const tags = hashtags(song, look);
  return body ? `${body}\n\n${tags}` : tags;
}

export function makeCaption(overlay: string, song: Song, look: Look) {
  return `${overlay}\n\n🎵 ${song.title} — ${song.composer}\n\n${hashtags(song, look)}`;
}

export function makeTitle(templateId: string, song: Song) {
  return `${getTemplate(templateId).name} · ${song.title}`;
}

export const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Randomizes every choice of a post (simulation, song, background, colors and version). */
export function randomize(post: Post, songs: Song[]): Post | null {
  const template = pick(TEMPLATES);
  const song = pick(songs);
  const seed = findSeed(template.id, {}, 1 + Math.floor(Math.random() * 1_000_000));
  if (seed === null) return null;
  const changedContent = template.id !== post.template || song.id !== post.song;
  const overlay = template.id !== post.template ? template.defaultOverlay : post.overlay;
  const look = { background: pick(BACKGROUNDS).id, palette: pick(PALETTES).id };
  return {
    ...post,
    ...look,
    template: template.id,
    params: template.id !== post.template ? {} : post.params,
    song: song.id,
    seed,
    overlay,
    title: changedContent ? makeTitle(template.id, song) : post.title,
    caption: changedContent ? makeCaption(overlay, song, look) : withHashtags(post.caption, song, look),
  };
}

/** Creates a ready-to-render post: rotates templates by day, picks the song used least recently and a random look. */
export function newPost(date: string, songs: Song[], posts: Post[]): Post {
  const dayIndex = Math.floor(parseDate(date).getTime() / 86_400_000);
  const template = TEMPLATES[dayIndex % TEMPLATES.length];
  const lastUse = (id: string) =>
    posts.filter((p) => p.song === id).map((p) => p.date).sort().at(-1) ?? '';
  const song = [...songs].sort((a, b) => lastUse(a.id).localeCompare(lastUse(b.id)))[0];
  const seed = findSeed(template.id, {}, 1 + Math.floor(Math.random() * 100_000)) ?? 1;
  const look = { background: pick(BACKGROUNDS).id, palette: pick(PALETTES).id };
  return {
    ...look,
    date,
    title: makeTitle(template.id, song),
    caption: makeCaption(template.defaultOverlay, song, look),
    song: song.id,
    template: template.id,
    params: {},
    seed,
    overlay: template.defaultOverlay,
  };
}
