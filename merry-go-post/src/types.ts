export type ColorRole = 'primary' | 'secondary' | 'accent' | 'dark' | 'light';
/** Preto e branco absolutos: valem para toda marca, sem depender da paleta. */
export type FixedColor = 'black' | 'white';
/** Papel da paleta do cliente, preto/branco absolutos ou cor livre em hex. */
export type ColorRef = ColorRole | FixedColor | `#${string}`;

export type Palette = Record<ColorRole, string>;

export type FontRole = 'base' | 'highlight' | 'ultra';
export type Fonts = Record<FontRole, string>;

export type Format = '3x4' | '4x5' | '9x16';

export type SlideRole = 'cover' | 'content' | 'list' | 'quote' | 'closing';

export type PaginationStyle = 'none' | 'dots' | 'number' | 'progress';

export type ImageMode = 'none' | 'some' | 'all';

/** design = templates gráficos; social = formato de post (avatar, @…); mixed = os dois juntos. */
export type PostStyle = 'design' | 'social' | 'mixed';

export interface User {
  id: string;
  name: string;
  createdAt: number;
}

/** Perfil da rede social, usado pelos templates em formato de post. Números como texto ("12,5 mil"). */
export interface SocialProfile {
  avatar?: string;
  displayName: string;
  handle: string;
  posts: string;
  followers: string;
  following: string;
  verified: boolean;
}

export interface Client {
  id: string;
  userId: string;
  name: string;
  logos: { positive?: string; negative?: string };
  profile: SocialProfile;
  colors: Palette;
  fonts: Fonts;
  favoriteTemplates: string[];
  /** Hashtags padrão, adicionadas à legenda gerada. */
  hashtags: string;
  createdAt: number;
  updatedAt: number;
}

export interface ImageFilter {
  brightness: number;
  contrast: number;
  saturate: number;
  grayscale: number;
  sepia: number;
  blur: number;
  hueRotate: number;
  overlayColor: ColorRef;
  overlayOpacity: number;
}

export interface SlideImage {
  /** null = espaço vazio, renderizado como placeholder cinza. */
  imageId: string | null;
  zoom: number;
  /** Foco da imagem em % (object-position). */
  x: number;
  y: number;
  filter: ImageFilter;
  /** Fundo removido: a imagem é "contida" no espaço, sem fundo cinza. */
  cutout?: boolean;
  /** Imagem antes da remoção de fundo, para poder desfazer. */
  originalId?: string;
  flipX?: boolean;
}

export type TextKey = 'title' | 'body';

/** Ajuste do usuário sobre a caixa de texto padrão do template (tudo em % do slide). */
export interface BoxOverride {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  scale?: number;
  align?: 'left' | 'center' | 'right';
  color?: ColorRef;
  font?: FontRole;
  /** Fonte fora da marca (nome do Google Fonts); manda sobre `font`. */
  family?: string;
  lineHeight?: number;
  /** Em em. */
  letterSpacing?: number;
  uppercase?: boolean;
}

export interface IconElement {
  id: string;
  icon: string;
  /** Centro do ícone, em % do slide. */
  x: number;
  y: number;
  /** Tamanho em % da largura do slide. */
  size: number;
  rotate: number;
  color: ColorRef;
  fromTemplate?: boolean;
}

export interface SlideContent {
  title: string;
  body: string;
}

export interface Slide {
  id: string;
  role: SlideRole;
  templateId: string;
  content: SlideContent;
  boxes: Partial<Record<TextKey, BoxOverride>>;
  images: SlideImage[];
  elements: IconElement[];
  /** Cor de fundo no lugar da do template. */
  bg?: ColorRef;
  /** Camadas ocultas (ver LayerId). */
  hidden?: LayerId[];
  /** Definida = cor da paginação destravada neste slide. */
  paginationColor?: ColorRef | 'auto';
}

/** title | body | logo | pagination | decor | img:<índice> | icon:<id> */
export type LayerId = string;

export interface Pagination {
  style: PaginationStyle;
  /** Centro da paginação, em % do slide. */
  x: number;
  y: number;
  color: ColorRef | 'auto';
}

export interface Post {
  id: string;
  clientId: string;
  title: string;
  format: Format;
  sourceHtml: string;
  imageMode: ImageMode;
  style: PostStyle;
  imageIds: string[];
  slides: Slide[];
  pagination: Pagination;
  caption: string;
  /** Semente do sorteio de templates na aba Conteúdo ("Sortear de novo" troca). */
  seed?: string;
  /** Slides travados na aba Conteúdo: índice → template fixo. */
  pins?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

/** Marca do cliente aplicada na renderização dos slides. */
export interface Brand {
  colors: Palette;
  fonts: Fonts;
  logos: Client['logos'];
  profile: SocialProfile;
}
