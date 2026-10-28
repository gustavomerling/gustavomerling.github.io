import type { TemplateDef } from '../templates';
import type { Slide } from '../types';
import { newSlideImage } from './generate';

const SAMPLE: Record<string, { title: string; body: string }> = {
  list: {
    title: 'Três dicas <strong>rápidas</strong>',
    body: '<ul><li>Comece pelo problema</li><li>Mostre o caminho</li><li>Feche com uma ação</li></ul>',
  },
  default: {
    title: 'Seu título com <strong>destaque</strong>',
    body: '<p>Um texto de apoio curto, com <mark>ultradestaque</mark> quando precisar.</p>',
  },
};

/** Slide de exemplo para prévias de template (cadastro do cliente, trocar template). */
export function sampleSlide(t: TemplateDef): Slide {
  return {
    id: `sample-${t.id}`,
    role: t.roles[0],
    templateId: t.id,
    content: t.roles[0] === 'list' ? SAMPLE.list : SAMPLE.default,
    boxes: {},
    images: t.images.map(() => newSlideImage(null)),
    elements: (t.icons ?? []).map((ic, i) => ({ ...ic, id: `${t.id}-${i}`, fromTemplate: true })),
  };
}
