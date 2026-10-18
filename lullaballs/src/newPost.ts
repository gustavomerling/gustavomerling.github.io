import type { Song } from './audio/notes';
import { INSTRUMENTS } from './audio/synth';
import { BACKGROUNDS, getBackground } from './engine/backgrounds';
import { PALETTES, getPalette } from './engine/palettes';
import { findSeed } from './engine/run';
import { TEMPLATES, getTemplate } from './engine/templates';
import type { Look, Template } from './engine/types';
import { mulberry32 } from './engine/util';
import { parseDate } from './dates';
import type { Post } from './types';

/** Always there: the brand and the two words the niche searches most. */
const FIXED_TAGS = ['#lullaballs', '#satisfying', '#relaxing'];
/** A few of these rotate in every day, so the posts don't all carry the exact same block. */
const ROTATING_TAGS = [
  '#bouncingball', '#asmr', '#oddlysatisfying', '#sleepmusic', '#piano', '#physics', '#satisfyingvideo', '#calm',
  '#pianomusic', '#studymusic', '#relaxingmusic', '#sleep', '#simulation', '#calming', '#lullaby', '#fyp',
];
/** Small caption cap: TikTok favors a handful of relevant tags over a wall of them. */
const MAX_TAGS = 9;

/** One line asking for a comment or a share. */
const CTAS = [
  'Did you guess right? Tell me below 👇',
  'Tag someone who needs to sleep tonight 😴',
  'Watch it again and try to sing along 🎶',
  'Which part was the most satisfying? 👇',
  'Save it for bedtime 🌙',
  'Send this to a friend who needs to relax 💌',
  'What song should the next one play? 🎹',
  'Comment a 🎵 if you recognized the song',
];

export const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** "Für Elise" -> "#furelise" */
export function songTag(song: Song) {
  if (song.tag) return song.tag;
  return '#' + (song.titleEn ?? song.title).normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/** Same day and video, same rotating tags (so editing the look doesn't reshuffle them). */
function rotation(date: string, templateId: string) {
  let h = 0;
  for (const c of date + templateId) h = (h * 31 + c.charCodeAt(0)) | 0;
  const rng = mulberry32(h);
  return [...ROTATING_TAGS].sort(() => rng() - 0.5);
}

export function hashtags(post: Pick<Post, 'date' | 'template'> & Look, song: Song | undefined) {
  const tpl = getTemplate(post.template);
  const tags = [
    ...FIXED_TAGS,
    tpl.tags[0],
    ...(song ? [songTag(song)] : []),
    getBackground(post.background).tags[0],
    getPalette(post.palette).tags[0],
    ...tpl.tags.slice(1),
  ];
  for (const t of rotation(post.date, post.template)) tags.push(t);
  return [...new Set(tags)].slice(0, MAX_TAGS).join(' ');
}

/** Replaces the trailing hashtag line(s) of a caption, keeping whatever the user wrote above them. */
export function withHashtags(caption: string, song: Song | undefined, post: Pick<Post, 'date' | 'template'> & Look) {
  const lines = caption.split('\n');
  while (lines.length && (lines.at(-1)!.trim() === '' || lines.at(-1)!.trim().startsWith('#'))) lines.pop();
  const body = lines.join('\n').trimEnd();
  const tags = hashtags(post, song);
  return body ? `${body}\n\n${tags}` : tags;
}

/** Hook, a searchable description of the video, a call to comment, the song, and the tags. */
export function makeCaption(overlay: string, song: Song, post: Pick<Post, 'date' | 'template'> & Look) {
  const tpl = getTemplate(post.template);
  return `${overlay}\n${pick(tpl.blurbs)}\n\n${pick(CTAS)}\n\n🎵 ${song.titleEn ?? song.title} — ${song.composerEn ?? song.composer}\n\n${hashtags(post, song)}`;
}

export function makeTitle(templateId: string, song: Song) {
  return `${getTemplate(templateId).name} · ${song.title}`;
}

/** A random hook for the text on the video, with its poll when it has one. */
export function pickHook(tpl: Template): Pick<Post, 'overlay' | 'poll'> {
  const h = pick(tpl.hooks);
  return { overlay: h.text, poll: h.poll };
}

/** The timbre that suits a background; neutral ones keep the felt piano. */
export function themeInstrument(background: string | undefined) {
  const byTheme: Record<string, keyof typeof INSTRUMENTS> = {
    christmas: 'celesta', halloween: 'organ', cotton: 'musicbox', sakura: 'musicbox', ballpit: 'musicbox',
    ocean: 'kalimba', fireflies: 'kalimba',
  };
  return byTheme[getBackground(background).id] ?? 'felt';
}

/** Randomizes every choice of a post (simulation, song, background, colors, timbre and version). */
export function randomize(post: Post, songs: Song[]): Post | null {
  const template = pick(TEMPLATES);
  const song = pick(songs);
  const seed = findSeed(template.id, {}, 1 + Math.floor(Math.random() * 1_000_000));
  if (seed === null) return null;
  const changedContent = template.id !== post.template || song.id !== post.song;
  const hook = template.id !== post.template ? pickHook(template) : { overlay: post.overlay, poll: post.poll };
  const look = { background: pick(BACKGROUNDS).id, palette: pick(PALETTES).id };
  const next = { ...post, ...look, ...hook, template: template.id };
  return {
    ...next,
    instrument: Math.random() < 0.5 ? themeInstrument(look.background) : pick(Object.keys(INSTRUMENTS)),
    params: template.id !== post.template ? {} : post.params,
    song: song.id,
    seed,
    title: changedContent ? makeTitle(template.id, song) : post.title,
    caption: changedContent ? makeCaption(hook.overlay, song, next) : withHashtags(post.caption, song, next),
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
  const hook = pickHook(template);
  const base = { ...look, ...hook, date, template: template.id };
  return {
    ...base,
    instrument: themeInstrument(look.background),
    title: makeTitle(template.id, song),
    caption: makeCaption(hook.overlay, song, base),
    song: song.id,
    params: {},
    seed,
  };
}
