/**
 * Ilustrações em SVG para os exemplos da landing (offline e sem licença de terceiros).
 * Entram nos slides como "imageId": useImageUrl aceita data: URLs direto.
 */
const svg = (body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000">${body}</svg>`)}`;

const STARS = [
  [90, 120, 3], [210, 80, 2], [330, 170, 3], [470, 60, 2], [640, 130, 3], [720, 260, 2], [120, 300, 2], [260, 390, 3],
  [540, 330, 2], [680, 450, 3], [80, 520, 2], [380, 520, 2], [600, 600, 2], [180, 640, 3], [720, 700, 2], [420, 720, 3],
]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${r === 3 ? 0.95 : 0.6}"/>`)
  .join('');

export const DEMO_IMAGES = [
  // Colinas ao entardecer
  svg(`<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbcfe8"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs>
    <rect width="800" height="1000" fill="url(#s)"/>
    <circle cx="560" cy="330" r="120" fill="#fff7ed"/>
    <g fill="#fff" opacity=".85"><ellipse cx="190" cy="220" rx="110" ry="34"/><ellipse cx="250" cy="200" rx="70" ry="40"/><ellipse cx="640" cy="160" rx="90" ry="26"/></g>
    <path d="M0 640 Q200 520 400 620 T800 580 V1000 H0Z" fill="#c4b5fd"/>
    <path d="M0 760 Q220 640 460 740 T800 700 V1000 H0Z" fill="#8b5cf6"/>
    <path d="M0 880 Q260 790 520 870 T800 850 V1000 H0Z" fill="#5b21b6"/>`),
  // Bolhas de cor
  svg(`<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter></defs>
    <rect width="800" height="1000" fill="#4c1d95"/>
    <g filter="url(#b)"><circle cx="220" cy="260" r="230" fill="#f472b6"/><circle cx="610" cy="440" r="250" fill="#f59e0b"/><circle cx="300" cy="780" r="270" fill="#38bdf8"/></g>`),
  // Noite estrelada com lua
  svg(`<defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="1" stop-color="#6d28d9"/></linearGradient>
    <mask id="m"><rect width="800" height="1000" fill="#fff"/><circle cx="600" cy="230" r="95" fill="#000"/></mask></defs>
    <rect width="800" height="1000" fill="url(#n)"/>${STARS}
    <circle cx="560" cy="260" r="110" fill="#fde68a" mask="url(#m)"/>
    <path d="M0 860 Q200 780 400 840 T800 820 V1000 H0Z" fill="#1e1b4b" opacity=".8"/>`),
  // Ondas
  svg(`<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bae6fd"/><stop offset="1" stop-color="#5eead4"/></linearGradient></defs>
    <rect width="800" height="1000" fill="url(#w)"/>
    <circle cx="230" cy="300" r="110" fill="#fef3c7"/>
    <path d="M0 600 Q100 560 200 600 T400 600 T600 600 T800 600 V1000 H0Z" fill="#0ea5e9" opacity=".55"/>
    <path d="M0 700 Q100 660 200 700 T400 700 T600 700 T800 700 V1000 H0Z" fill="#0284c7" opacity=".7"/>
    <path d="M0 820 Q100 780 200 820 T400 820 T600 820 T800 820 V1000 H0Z" fill="#075985"/>`),
];

/** Imagens que não estão no IndexedDB (exemplos): o próprio valor já é a URL. */
export const isDirectImage = (id: string) => /^(data:|https?:|blob:)/.test(id);
