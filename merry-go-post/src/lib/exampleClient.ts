import { HORSE_PATHS } from '../components/MerryLogo';
import type { Client, Format, Palette, Post, PostStyle } from '../types';
import { captionFromSlides } from './caption';
import { DEMO_IMAGES } from './demoImages';
import { buildSlides } from './generate';
import { uid } from './id';
import { plainToHtml, sanitizeRich } from './richtext';
import { splitText } from './split';

/**
 * Cliente exemplo de toda conta nova: o próprio Merry Go Post, com 5 posts prontos.
 * É um cliente comum (dá para editar e apagar); logos e imagens são data: URLs, fora do IndexedDB.
 */
const COLORS: Palette = { primary: '#7c3aed', secondary: '#ede9fe', accent: '#f59e0b', dark: '#1e1b4b', light: '#ffffff' };

const svgUrl = (w: number, h: number, body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

const horse = (x: number, y: number, size: number, fill: string) =>
  `<g transform="translate(${x} ${y}) scale(${size / 32})">${HORSE_PATHS.map((d) => `<path fill="${fill}" d="${d}"/>`).join('')}</g>`;

const word = (fill: string) =>
  `<text x="150" y="104" font-family="Arial Rounded MT Bold, Arial, Helvetica, sans-serif" font-weight="800" font-size="62" letter-spacing="-1" fill="${fill}">Merry Go Post</text>`;

const LOGOS = {
  positive: svgUrl(640, 160, horse(20, 24, 112, COLORS.primary) + word(COLORS.dark)),
  negative: svgUrl(640, 160, horse(20, 24, 112, COLORS.accent) + word('#ffffff')),
};
const AVATAR = svgUrl(160, 160, `<rect width="160" height="160" fill="${COLORS.primary}"/>` + horse(32, 30, 96, COLORS.light));

const HASHTAGS = '#merrygopost #carrossel #marketingdigital';

const POSTS: { title: string; style: PostStyle; format: Format; text: string }[] = [
  {
    title: 'Como funciona',
    style: 'design',
    format: '4x5',
    text: `SLIDE 1 imagem
Do texto ao **carrossel** em 3 passos
SLIDE 2
1. Cole o texto
Do Docs, do Word ou do bloco de notas. O negrito vem junto e vira destaque.
SLIDE 3 imagem
2. A gente divide
Cada parágrafo vira um slide. Quer controlar? Marque com SLIDE 1, SLIDE 2…
SLIDE 4
3. Ajuste e exporte
Troque o template, arraste as caixas e baixe tudo em PNG.
SLIDE 5
Bora ==girar==?`,
  },
  {
    title: '5 dicas de carrossel',
    style: 'design',
    format: '4x5',
    text: `SLIDE 1 imagem
5 dicas para um carrossel que **prende o dedo**
SLIDE 2
Capa é promessa
Diga logo o que a pessoa ganha ao arrastar para o lado.
SLIDE 3
Uma ideia por slide
- Frases curtas
- Respiro em volta do texto
- Destaque só no que importa
SLIDE 4 imagem
Imagem conta história
Use fotos que mostrem o assunto, não só enfeitem.
SLIDE 5
Feche com uma ação
Salvar, comentar, compartilhar: peça ==uma coisa só==.`,
  },
  {
    title: 'Destaque e ultradestaque',
    style: 'social',
    format: '4x5',
    text: `SLIDE 1
Seu texto já sabe se **destacar**
SLIDE 2
Negrito vira destaque
Tudo que estiver em **negrito** ganha a cor de destaque da marca.
SLIDE 3
Marca-texto vira ultradestaque
Escreva entre ==sinais de igual duplos== para o efeito mais forte.
SLIDE 4
Cores e fontes vêm do cliente
Cadastre a marca uma vez e todo post já nasce com a cara dela.`,
  },
  {
    title: 'Checklist antes de postar',
    style: 'mixed',
    format: '4x5',
    text: `SLIDE 1 imagem
Checklist **antes de postar**
SLIDE 2
O texto
- Revisou a ortografia?
- A capa tem gancho?
- O último slide pede uma ação?
SLIDE 3
O visual
- Nenhum espaço de imagem vazio
- Contraste bom em todos os slides
- Paginação no lugar certo
SLIDE 4 imagem
A legenda
Gere a legenda a partir dos slides e ajuste o tom. As hashtags do cliente entram sozinhas.
SLIDE 5
Tudo certo? ==Exporta e posta!==`,
  },
  {
    title: 'Frase da semana',
    style: 'design',
    format: '4x5',
    text: `SLIDE 1 imagem
"Um bom carrossel é uma **conversa**, não um panfleto."
SLIDE 2
Escreva como fala
Leia em voz alta. Se travar, o slide também vai travar quem lê.
SLIDE 3
Salve e ==compartilhe== com quem cuida do seu feed!`,
  },
];

export function exampleClient(userId: string): { client: Client; posts: Post[] } {
  const now = Date.now();
  const client: Client = {
    id: uid(),
    userId,
    example: true,
    name: 'Merry Go Post',
    logos: LOGOS,
    profile: { avatar: AVATAR, displayName: 'Merry Go Post', handle: 'merrygopost', posts: '5', followers: '12,5 mil', following: '310', verified: true },
    colors: { ...COLORS },
    fonts: { base: 'Inter', highlight: 'Grandstander', ultra: 'Bebas Neue' },
    favoriteTemplates: [],
    hashtags: HASHTAGS,
    createdAt: now,
    updatedAt: now,
  };
  const posts = POSTS.map((p, i): Post => {
    const id = uid();
    const sourceHtml = sanitizeRich(plainToHtml(p.text));
    // Imagens de exemplo em rodízio, para cada post começar por uma diferente.
    const imageIds = DEMO_IMAGES.map((_, k) => DEMO_IMAGES[(i + k) % DEMO_IMAGES.length]);
    const slides = buildSlides({ style: p.style, drafts: splitText(sourceHtml), mode: 'some', imageIds, favorites: [], seed: id });
    // A lista mostra os mais recentes primeiro: "Como funciona" fica no topo.
    const at = now - i * 60_000;
    return {
      id,
      clientId: client.id,
      title: p.title,
      format: p.format,
      sourceHtml,
      imageMode: 'some',
      style: p.style,
      imageIds,
      slides,
      pagination: { style: 'dots', x: 50, y: 95, color: 'auto' },
      caption: captionFromSlides(slides, HASHTAGS),
      seed: id,
      createdAt: at,
      updatedAt: at,
    };
  });
  return { client, posts };
}
