import type { Slide } from '../types';

const plain = (html: string) =>
  html
    .replace(/<\/(p|li)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .trim();

/** Legenda a partir dos slides: gancho da capa, tópicos, chamada para ação e hashtags do cliente. */
export function captionFromSlides(slides: Slide[], hashtags: string) {
  if (!slides.length) return '';
  const [cover, ...rest] = slides;
  const hook = plain(cover.content.title) || plain(cover.content.body);
  const closing = rest.length > 1 && rest[rest.length - 1].role === 'closing' ? rest.pop() : undefined;
  const topics = rest
    .map((s) => plain(s.content.title) || plain(s.content.body).split('\n')[0])
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => `→ ${t.length > 90 ? `${t.slice(0, 87)}…` : t}`);
  const cta = closing ? plain(closing.content.title || closing.content.body) : 'Arraste para o lado e salve para consultar depois.';
  return [hook, topics.join('\n'), cta, hashtags.trim()].filter(Boolean).join('\n\n');
}
