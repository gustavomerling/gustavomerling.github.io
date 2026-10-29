import { useEffect, useState, type CSSProperties } from 'react';

/**
 * Marca do Merry Go Post: cavalinho de carrossel (fluent-emoji-high-contrast:carousel-horse,
 * MIT, Microsoft, via Iconify) + logotipo em Grandstander 300 / 900.
 * As letras ficam paradas numa onda; na abertura, o cavalinho entra girando e as letras caem
 * uma a uma até encaixar.
 * O ícone usa a cor do sistema (--brand), então muda junto com a primária do cliente.
 */
export const HORSE_PATHS = [
  'M5.48 8.01a.48.48 0 1 1-.96 0a.48.48 0 0 1 .96 0',
  'M17 22.33v7.68h-2v-6.538l-2.728 6.138a2.37 2.37 0 0 1-4.326-1.936l2.517-5.668H8.41l.1.22a3.47 3.47 0 0 1 .045 2.684a3.26 3.26 0 0 1-1.791 1.821a3.4 3.4 0 0 1-1.33.269a3.36 3.36 0 0 1-3.072-2L.391 20.558A3.948 3.948 0 0 1 4 15.01h.033v-.04h-.058a3.97 3.97 0 0 1-3.6-5.656l.164-.354l.061-.122l1.08-2.272a3.493 3.493 0 0 1 1.459-5.291A2 2 0 0 1 5 .01c.393 0 .785.059 1.161.174C6.424.062 6.711 0 7 0a4 4 0 0 1 2.711 1.063a4.03 4.03 0 0 1 3.276 3.442A4.03 4.03 0 0 1 15 7.445V2.01h2V9h3.3a7.7 7.7 0 0 1 3.352.766A4.03 4.03 0 0 1 26 9.01h.073a5.023 5.023 0 0 1 4.911 5v2.344a4 4 0 0 1-1.3 6.282a4 4 0 0 1-.33 1.935l-1.982 4.467A3.39 3.39 0 0 1 23 30.752a3.3 3.3 0 0 1-.865-.525a2.39 2.39 0 0 1-2.683.599a2.28 2.28 0 0 1-1.257-1.277a2.47 2.47 0 0 1 .031-1.915l.88-1.979A3.69 3.69 0 0 1 17 22.33M7 2v2.01a3.03 3.03 0 0 0-2.7 1.71l-.118.246L2.4 9.7l-.045.1l-.163.364A1.97 1.97 0 0 0 5.23 12.52l.77-.652v2.442c-.002.942.231 1.87.678 2.7H4a1.95 1.95 0 0 0-1.78 2.74l1.97 4.44a1.36 1.36 0 0 0 1.244.81c.19 0 .38-.037.556-.11a1.387 1.387 0 0 0 .69-1.85l-1.347-3.03H11.4v-.008q.15.01.3.008h8.29v1.32a2.68 2.68 0 0 0 2.68 2.68h2.286l-1.877 4.222a1.4 1.4 0 0 0 .681.668a1.39 1.39 0 0 0 1.8-.7l1.97-4.44a1.956 1.956 0 0 0-1.54-2.736V20.01l-.03-.01H26v-.984v.036v-.042h-.01v-2.03H25v-2.238a2 2 0 0 1-.916-2.306A5.68 5.68 0 0 0 20.3 11h-.31v3.92c0 .6-.48 1.09-1.08 1.09h-5.82c-.6 0-1.09-.49-1.09-1.09v-2.165l-.002-.002a2.02 2.02 0 0 1-.764-2.733q-.106.01-.214.011a2.02 2.02 0 0 1-1.729-.974a3.02 3.02 0 0 0 .769-2.017c0-.921-.411-1.747-1.06-2.302V4c0-1.1-.9-2-2-2',
];

/**
 * 'intro' = abertura uma vez; 'hover' = pulinho ao passar o mouse; 'both' = os dois; 'none' = parado.
 */
export type LogoMotion = 'intro' | 'hover' | 'both' | 'none';

/** Duração da abertura (cavalinho + letras escalonadas) antes de tirar a classe. */
const INTRO_MS = 1800;

/**
 * A classe de abertura sai depois que ela termina: senão, ao tirar o mouse,
 * o navegador voltaria para a animação de abertura e a repetiria.
 */
function useMotionClass(m: LogoMotion) {
  const wantsIntro = m === 'intro' || m === 'both';
  const [intro, setIntro] = useState(wantsIntro);
  useEffect(() => {
    if (!wantsIntro) return;
    const t = setTimeout(() => setIntro(false), INTRO_MS);
    return () => clearTimeout(t);
  }, [wantsIntro]);
  return [intro && 'mgp-intro', (m === 'hover' || m === 'both') && 'mgp-hover'].filter(Boolean).join(' ');
}

export function MerryMark({ size = 28, className, motion = 'none' }: { size?: number; className?: string; motion?: LogoMotion }) {
  const motionClass = useMotionClass(motion);
  return (
    <span className={`inline-block ${motionClass} ${className ?? ''}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" className="mgp-horse block" aria-hidden>
        {HORSE_PATHS.map((d) => (
          <path key={d.slice(0, 12)} d={d} fill="var(--brand)" />
        ))}
      </svg>
    </span>
  );
}

/** Carregada no index.html (300 e 900); o fallback arredondado segura enquanto carrega. */
const FONT = "'Grandstander', ui-rounded, 'Nunito', system-ui, sans-serif";

/** Letras em onda: cada uma fica um pouco acima/abaixo e girada; --i escalona a entrada na abertura. */
function Wave({ text, offset }: { text: string; offset: number }) {
  return (
    <>
      {[...text].map((ch, i) => {
        const k = i + offset;
        const t = Math.sin(k * 1.15);
        const style = {
          '--y0': `${(-t * 0.11).toFixed(3)}em`,
          '--r0': `${(t * 6).toFixed(1)}deg`,
          '--i': k,
        } as CSSProperties;
        return (
          <span key={k} className="mgp-letter" style={style}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </>
  );
}

export function MerryWordmark({ style, className, motion = 'none' }: { style?: CSSProperties; className?: string; motion?: LogoMotion }) {
  const motionClass = useMotionClass(motion);
  return (
    <span
      className={`inline-block whitespace-nowrap leading-none text-zinc-900 ${motionClass} ${className ?? ''}`}
      style={{ fontFamily: FONT, ...style }}
      aria-label="merry go post"
    >
      <span aria-hidden style={{ fontWeight: 300 }}>
        <Wave text="merry go " offset={0} />
      </span>
      <span aria-hidden className="text-brand-700" style={{ fontWeight: 900 }}>
        <Wave text="post" offset={9} />
      </span>
    </span>
  );
}

export function MerryLogo({ size = 28, className, motion = 'none' }: { size?: number; className?: string; motion?: LogoMotion }) {
  const motionClass = useMotionClass(motion);
  return (
    <span className={`inline-flex items-center gap-2 ${motionClass} ${className ?? ''}`}>
      <MerryMark size={size} />
      <MerryWordmark style={{ fontSize: size * 0.82 }} />
    </span>
  );
}

/** O ícone como SVG solto, para o favicon. */
export const logoSvg = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${HORSE_PATHS.map((d) => `<path fill="${color}" d="${d}"/>`).join('')}</svg>`;
