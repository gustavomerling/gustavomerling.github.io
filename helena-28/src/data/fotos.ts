// Fotos em src/assets/fotos (WebP, máx. 1080px, sem EXIF).
// As datas vieram do EXIF dos originais (DateTimeOriginal). Só uma tinha GPS;
// guardamos apenas a cidade, nunca coordenadas (o repositório é público).
const urls = import.meta.glob<string>('../assets/fotos/*.webp', { eager: true, import: 'default' })

export type Foto = {
  slug: string
  src: string
  /** AAAA-MM-DD */
  date: string
  caption: string
  /** Cidade, quando se sabe (GPS ou nome do arquivo) */
  place?: string
  /** Foto do casal (para respeitar os ~10% do Gustavo) */
  couple?: boolean
}

const LIST: Omit<Foto, 'src'>[] = [
  { slug: 'mocha', date: '2024-02-17', caption: 'a Mocha' },
  { slug: 'helena-e-o-nemo', date: '2024-02-20', caption: 'Helena e o Nemo' },
  { slug: 'helena-com-a-moca-do-freepik', date: '2024-04-11', caption: 'com a moça do Freepik' },
  { slug: 'helena-no-museu', date: '2024-04-12', caption: 'no museu' },
  { slug: 'bastet-nossa-gatinha', date: '2024-05-01', caption: 'chegou a Bastet' },
  { slug: 'bracos-de-helena-sujos-de-pintar-o-cabelo', date: '2024-06-10', caption: 'pintando o cabelo (e os braços)' },
  { slug: 'helena-e-eu-muito-chiques', date: '2024-09-15', caption: 'muito chiques', couple: true },
  { slug: 'helena-em-bc', date: '2024-12-07', caption: 'em BC', place: 'Balneário Camboriú' },
  { slug: 'helena-e-pelucias', date: '2024-12-08', caption: 'Helena e as pelúcias' },
  { slug: 'hamburger-de-hello-kitty-da-helena', date: '2024-12-27', caption: 'hambúrguer de Hello Kitty' },
  { slug: 'helena-e-uma-hello-kitty-gigante', date: '2024-12-27', caption: 'uma Hello Kitty gigante' },
  { slug: 'nosso-ultimo-dia-dos-namorados-com-pizza', date: '2025-06-12', caption: 'dia dos namorados com pizza', couple: true },
  { slug: 'mocha-e-bastet-no-aquecedor', date: '2025-08-01', caption: 'Mocha e Bastet no aquecedor' },
  { slug: 'helena-e-mocha', date: '2025-09-08', caption: 'Helena e Mocha' },
  { slug: 'helena-e-a-mocha-nossa-cachorrinha', date: '2025-09-14', caption: 'Helena e Mocha, parte 2' },
  { slug: 'helena-esperando-a-taylor-swift-no-metro', date: '2025-10-03', caption: 'esperando a Taylor no metrô' },
  { slug: 'drinks', date: '2025-10-04', caption: 'drinks' },
  { slug: 'ela-que-me-ensinou-a-andar-de-metro', date: '2025-10-05', caption: 'ela me ensinou a andar de metrô', couple: true },
  { slug: 'helena-sendo-fofa', date: '2025-10-16', caption: 'sendo fofa' },
  { slug: 'amamos-viajar-de-aviao', date: '2026-01-31', caption: 'amamos viajar de avião', couple: true },
  { slug: 'besteiras', date: '2026-01-31', caption: 'besteiras' },
  { slug: 'show-do-avenged-e-adaytoremember', date: '2026-01-31', caption: 'Avenged Sevenfold + A Day To Remember' },
  { slug: 'drink-no-cu-da-liberdade', date: '2026-02-01', caption: 'drink na Liberdade' },
  { slug: 'ice-tea-no-outback', date: '2026-02-07', caption: 'ice tea no Outback' },
  { slug: 'poke-que-ela-preparou', date: '2026-03-06', caption: 'o poke que ela preparou' },
  { slug: 'tomando-acai', date: '2026-06-13', caption: 'tomando açaí' },
  { slug: 'avengers-endgame-encore', date: '2026-09-25', caption: 'Ultimato de novo no cinema', place: 'Joinville' },
]

export const FOTOS: Foto[] = LIST.map((f) => {
  const src = urls[`../assets/fotos/${f.slug}.webp`]
  if (!src) throw new Error(`Foto não encontrada: ${f.slug}`)
  return { ...f, src }
}).sort((a, b) => a.date.localeCompare(b.date))

export function foto(slug: string): Foto {
  const f = FOTOS.find((x) => x.slug === slug)
  if (!f) throw new Error(`Foto não encontrada: ${slug}`)
  return f
}

/** "2024-02-17" → "17.02.2024" */
export function formatDate(date: string) {
  const [y, m, d] = date.split('-')
  return `${d}.${m}.${y}`
}
