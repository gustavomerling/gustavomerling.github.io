import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Download,
  Eye,
  Grid3x3,
  ImageMinus,
  Layers,
  LayoutTemplate,
  Lock,
  Moon,
  MousePointer2,
  Palette,
  RefreshCw,
  Scissors,
  Shuffle,
  Sparkles,
  Star,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ThemeToggle } from '../components/AppHeader';
import { MerryLogo, MerryMark, MerryWordmark } from '../components/MerryLogo';
import { Button, cx } from '../components/ui';
import { DEMO_IMAGES } from '../lib/demoImages';
import { ensureFonts } from '../lib/fonts';
import { buildSlides } from '../lib/generate';
import { plainToHtml } from '../lib/richtext';
import { navigate } from '../lib/router';
import { splitText } from '../lib/split';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { useDb } from '../store/db';
import type { Brand, Pagination } from '../types';

/** Marca de demonstração: mesma cara divertida do app, usada no hero e no playground. */
const DEMO_BRAND: Brand = {
  colors: { primary: '#7c3aed', secondary: '#ede9fe', accent: '#f59e0b', dark: '#1e1b4b', light: '#ffffff' },
  fonts: { base: 'Inter', highlight: 'Grandstander', ultra: 'Bebas Neue' },
  logos: {},
  profile: { displayName: 'Merry Go Post', handle: 'merrygopost', posts: '128', followers: '12,5 mil', following: '310', verified: true },
};

const DEMO_PAGINATION: Pagination = { style: 'dots', x: 50, y: 95, color: 'auto' };

const HERO_TEXT = `SLIDE 1 imagem
Seu texto vira **carrossel** num giro
SLIDE 2
Cole o texto
Do Docs, do Word ou do bloco de notas. O negrito vem junto.
SLIDE 3 imagem
A gente divide
Cada parágrafo vira um slide, ou marque você mesmo com SLIDE 1, SLIDE 2…
SLIDE 4
Ajuste o que quiser
- Troque o template
- Arraste e redimensione
- Filtros nas imagens
SLIDE 5 imagem
"Imaginação no feed, sem sofrer no editor."
SLIDE 6
Exporte e poste ==agora==`;

/** Exemplos do playground; "Outro exemplo" passa para o próximo. */
const SAMPLES = [
  `5 ideias de post para sua padaria

Mostre os bastidores
Ninguém resiste a um pão saindo do forno às 5h da manhã.

Apresente a equipe
Pessoas compram de pessoas. Conte quem faz o seu **pão de queijo**.

Dicas que ajudam
- Como guardar o pão por mais tempo
- O melhor café para cada fornada
- Receitas com pão amanhecido

Salve este post e ==compartilhe== com um amigo padeiro!`,
  `SLIDE 1 imagem
3 mitos sobre **treino** que você ainda acredita
SLIDE 2
Mito 1: suar muito queima mais
Suor é só o corpo se resfriando. Não mede esforço nem resultado.
SLIDE 3
Mito 2: treinar todo dia é melhor
O músculo cresce no descanso. Pausa também é treino.
SLIDE 4 imagem
Mito 3: abdominal tira barriga
Gordura localizada não existe: o que funciona é treino completo e alimentação.
SLIDE 5
Marque aquele amigo que ==ainda acredita==!`,
  `Roteiro de 3 dias em **Lisboa**

Dia 1: Alfama
Comece cedo pelo miradouro e termine a noite com fado.

Dia 2: Belém
Pastéis, Torre e o Mosteiro dos Jerónimos, nessa ordem.

Dia 3: Sintra
Reserve o dia inteiro: são palácios de conto de fadas.

Salve para a sua ==próxima viagem==!`,
  `"Guardar dinheiro não é sobre ganhar muito."

Como montar sua reserva
- Separe 10% no dia do pagamento
- Deixe em uma conta só para isso
- Só mexa em emergência de verdade

Comece hoje, mesmo que seja com **R$ 20**.`,
];

/** Gira a lista de imagens para cada exemplo ter ilustrações diferentes. */
const rotated = (k: number) => [...DEMO_IMAGES.slice(k % DEMO_IMAGES.length), ...DEMO_IMAGES.slice(0, k % DEMO_IMAGES.length)];

const slidesFrom = (text: string, seed: string, imageIds: string[]) =>
  buildSlides({ style: 'design', drafts: splitText(plainToHtml(text)), mode: 'some', imageIds, favorites: [], seed });

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function LandingScreen() {
  const loggedIn = useDb((s) => !!s.currentUserId && s.users.some((u) => u.id === s.currentUserId));
  const start = () => navigate(loggedIn ? '/clients' : '/entrar');
  useEffect(() => ensureFonts(Object.values(DEMO_BRAND.fonts)), []);

  return (
    <div className="min-h-full overflow-x-clip bg-white text-zinc-900">
      <LandingNav loggedIn={loggedIn} onStart={start} />
      <Hero onStart={start} />
      <HowItWorks />
      <Playground />
      <Features />
      <CheatSheet />
      <Faq />
      <FinalCta onStart={start} />
      <footer className="border-t border-zinc-100 py-8 text-center text-xs text-zinc-500">
        <MerryLogo size={20} motion="hover" className="mb-2 justify-center" />
        <p>Feito para quem cria carrosséis todo dia. Seus dados ficam só no seu navegador.</p>
      </footer>
    </div>
  );
}

// ——— Entrada ao rolar (estilo AOS) ———

type RevealVariant = 'up' | 'zoom' | 'left' | 'right' | 'tilt';

/** Revela o conteúdo quando ele entra na tela (uma vez). Sem animação se o sistema pedir menos movimento. */
function Reveal({ children, variant = 'up', delay = 0, className }: { children: ReactNode; variant?: RevealVariant; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={cx('reveal', `reveal-${variant}`, shown && 'reveal-in', className)} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/** Parte do título no peso pesado e na cor do sistema (os h2 têm dois pesos). */
const Heavy = ({ children }: { children: ReactNode }) => <span className="font-black text-brand-700">{children}</span>;

// ——— Navegação: link da seção visível + sublinhado que desliza entre eles ———

const NAV_LINKS: [string, string][] = [
  ['como-funciona', 'Como funciona'],
  ['experimente', 'Experimente'],
  ['recursos', 'Recursos'],
  ['faq', 'Dúvidas'],
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    // A seção ativa é a que cruza a faixa do meio da tela.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    const onScroll = () => {
      if (window.scrollY < 300) setActive(null);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids]);
  return active;
}

function LandingNav({ loggedIn, onStart }: { loggedIn: boolean; onStart: () => void }) {
  const ids = useMemo(() => NAV_LINKS.map(([id]) => id), []);
  const active = useActiveSection(ids);
  const [hover, setHover] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bar, setBar] = useState({ left: 0, width: 0, visible: false });
  const target = hover ?? active;

  useLayoutEffect(() => {
    const measure = () => {
      const el = target ? linkRefs.current[target] : null;
      const nav = navRef.current;
      if (!el || !nav) return setBar((b) => ({ ...b, visible: false }));
      const r = el.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      setBar({ left: r.left - n.left, width: r.width, visible: true });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [target]);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center" title="Voltar ao topo">
          <MerryLogo size={28} motion="both" className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        </button>
        <nav ref={navRef} className="relative hidden items-center gap-1 text-sm md:flex" onMouseLeave={() => setHover(null)}>
          {NAV_LINKS.map(([id, label]) => (
            <button
              key={id}
              ref={(el) => void (linkRefs.current[id] = el)}
              type="button"
              onClick={() => scrollTo(id)}
              onMouseEnter={() => setHover(id)}
              className={cx('rounded-md px-2.5 py-1.5 transition-colors', active === id ? 'font-medium text-zinc-900' : 'text-zinc-500 hover:text-zinc-900')}
            >
              {label}
            </button>
          ))}
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-[13px] h-[3px] rounded-full bg-brand-600 transition-all duration-300 ease-[cubic-bezier(.3,1.4,.5,1)]"
            style={{ left: bar.left + 6, width: Math.max(0, bar.width - 12), opacity: bar.visible ? 1 : 0 }}
          />
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {!loggedIn && (
            <Button variant="ghost" onClick={() => navigate('/entrar')} className="hidden sm:inline-flex">
              Entrar
            </Button>
          )}
          <Button variant="primary" onClick={onStart}>
            {loggedIn ? (
              'Abrir o app'
            ) : (
              <span>
                Começar<span className="hidden sm:inline"> grátis</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

// ——— Hero: um carrossel de verdade, com toldo, mastro e plataforma ———

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <div className="canopy-stripes" />
      <div className="canopy-edge" />
      <Sparkle className="left-[8%] top-24 text-amber-400" size={22} />
      <Sparkle className="right-[10%] top-40 text-brand-500" size={16} />
      <Sparkle className="bottom-16 left-[45%] text-pink-400" size={14} />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr]">
        <Reveal variant="left">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Sparkles size={13} /> Do texto ao carrossel em segundos
          </span>
          <h1 className="font-fun text-balance text-5xl font-light leading-[1.02] tracking-tight sm:text-6xl">
            Dê uma volta no{' '}
            <span className="relative inline-block font-black text-brand-700">
              carrossel
              <svg viewBox="0 0 200 16" className="absolute -bottom-2 left-0 w-full text-amber-400" aria-hidden>
                <path d="M2 10 Q 25 2 50 10 T 100 10 T 150 10 T 198 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>{' '}
            mais fácil do seu <span className="font-black">feed!</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600">
            Cole o texto, solte as imagens e o <strong className="font-semibold text-zinc-800">Merry Go Post</strong> monta os slides com a cara do seu cliente. Você só
            ajusta o que quiser e exporta.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={onStart} className="h-12 px-6 text-base">
              Criar meu primeiro carrossel <ArrowRight size={18} />
            </Button>
            <Button onClick={() => scrollTo('experimente')} className="h-12 px-5 text-base">
              Testar aqui mesmo
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
            <Lock size={13} /> Sem cadastro em servidor: tudo fica no seu navegador.
          </p>
        </Reveal>
        <Reveal variant="zoom" delay={150}>
          <CarouselRide />
        </Reveal>
      </div>
    </section>
  );
}

function Sparkle({ className, size }: { className: string; size: number }) {
  return <Star size={size} fill="currentColor" strokeWidth={0} className={cx('pointer-events-none absolute opacity-70', className)} aria-hidden />;
}

/** Quantos passos (com sinal) levam o slide `target` para a frente pelo caminho mais curto. */
function shortestTurn(step: number, target: number, n: number) {
  const front = ((step % n) + n) % n;
  let d = (target - front + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

/**
 * Anel 3D de slides: gira sozinho a cada poucos segundos, pausa com o mouse em cima,
 * e dá para arrastar (como um Swiper) ou clicar num slide para trazê-lo à frente.
 */
function CarouselRide() {
  const slides = useMemo(() => slidesFrom(HERO_TEXT, 'hero', DEMO_IMAGES), []);
  const [step, setStep] = useState(0);
  const [hovering, setHovering] = useState(false);
  /** Graus arrastados no gesto atual (null = sem arrasto). */
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<{ x: number; moved: boolean; target: number | null } | null>(null);
  const n = slides.length;
  const angle = 360 / n;
  const cardW = 190;
  const radius = Math.round(cardW / 2 / Math.tan(Math.PI / n)) + 46;

  useEffect(() => {
    if (hovering || drag !== null || reducedMotion()) return;
    const t = setInterval(() => setStep((s) => s + 1), 2800);
    return () => clearInterval(t);
  }, [hovering, drag]);

  const endGesture = (commit: boolean) => {
    const g = gesture.current;
    const offset = drag ?? 0;
    gesture.current = null;
    setDrag(null);
    if (!g || !commit) return;
    if (g.moved) setStep((s) => s - Math.round(offset / angle));
    else if (g.target !== null) setStep((s) => s + shortestTurn(s, g.target!, n));
  };

  return (
    <div className="relative mx-auto w-full max-w-[520px] select-none" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      {/* Toldo */}
      <svg viewBox="0 0 400 90" className="relative z-10 mx-auto w-[78%]" aria-hidden>
        <defs>
          <clipPath id="lp-canopy">
            <path d="M200 6 L392 66 L8 66 Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#lp-canopy)">
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d={`M200 6 L${i * 34 - 4} 70 L${i * 34 + 30} 70 Z`} fill={i % 2 ? 'var(--color-brand-200)' : 'var(--brand)'} />
          ))}
        </g>
        {/* Borda recortada: meias-luas abaixo da base, alternando as cores das listras. */}
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d={`M${8 + i * 32} 66 a16 16 0 0 0 32 0 Z`} fill={i % 2 ? 'var(--color-brand-200)' : 'var(--brand)'} />
        ))}
        <rect x="6" y="62" width="388" height="6" rx="3" fill="var(--brand)" />
        <circle cx="200" cy="7" r="7" fill="#fbbf24" />
      </svg>
      {/* Mastro */}
      <div className="absolute left-1/2 top-[60px] h-[330px] w-1.5 -translate-x-1/2 rounded-full bg-brand-200" />
      {/* Anel (arrastável) */}
      <div
        className={cx('relative h-[300px] touch-pan-y', drag !== null ? 'cursor-grabbing' : 'cursor-grab')}
        style={{ perspective: 1100 }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const card = (e.target as HTMLElement).closest('[data-index]');
          gesture.current = { x: e.clientX, moved: false, target: card ? Number(card.getAttribute('data-index')) : null };
          setDrag(0);
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          const dx = e.clientX - g.x;
          if (Math.abs(dx) > 5) g.moved = true;
          setDrag(dx * 0.35);
        }}
        onPointerUp={() => endGesture(true)}
        onPointerCancel={() => endGesture(false)}
      >
        <div
          className={cx('absolute left-1/2 top-4', drag === null && 'transition-transform duration-1000 ease-[cubic-bezier(.5,0,.2,1)]')}
          style={{ width: cardW, marginLeft: -cardW / 2, transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px) rotateY(${-step * angle + (drag ?? 0)}deg)` }}
        >
          {slides.map((s, i) => (
            <div
              key={s.id}
              data-index={i}
              className="absolute left-0 top-0 overflow-hidden rounded-xl shadow-xl shadow-black/15 ring-1 ring-black/5"
              style={{ width: cardW, transform: `rotateY(${i * angle}deg) translateZ(${radius}px)`, backfaceVisibility: 'hidden' }}
              aria-label={`Slide ${i + 1}`}
            >
              <ScaledSlide format="4x5" width={cardW}>
                <SlideView slide={s} index={i} total={n} format="4x5" brand={DEMO_BRAND} pagination={DEMO_PAGINATION} />
              </ScaledSlide>
            </div>
          ))}
        </div>
      </div>
      {/* Plataforma */}
      <div className="relative z-10 mx-auto -mt-2 h-5 w-[86%] rounded-[50%] bg-brand-200" />
      <div className="mx-auto mt-1 h-3 w-[70%] rounded-[50%] bg-black/5 blur-sm" />
      <div className="mt-4 flex items-center justify-center gap-2">
        <Button size="sm" variant="ghost" title="Anterior" icon={<ChevronLeft size={16} />} onClick={() => setStep((s) => s - 1)} />
        <span className="text-xs text-zinc-400">arraste para girar · slides reais, gerados pelo app</span>
        <Button size="sm" variant="ghost" title="Próximo" icon={<ChevronRight size={16} />} onClick={() => setStep((s) => s + 1)} />
      </div>
    </div>
  );
}

// ——— Como funciona ———

const STEPS: { icon: LucideIcon; title: string; text: string; color: string }[] = [
  { icon: Palette, title: 'Cadastre a marca', text: 'Logo, cinco cores, três fontes do Google e o perfil social do cliente. Uma vez só.', color: 'bg-pink-100 text-pink-600' },
  { icon: ClipboardPaste, title: 'Cole o texto', text: 'Do Docs, Word ou de onde for. Os slides aparecem enquanto você digita.', color: 'bg-amber-100 text-amber-600' },
  { icon: MousePointer2, title: 'Ajuste no editor', text: 'Troque templates, arraste caixas, enquadre imagens, adicione ícones.', color: 'bg-sky-100 text-sky-600' },
  { icon: Download, title: 'Exporte e poste', text: 'PNGs em 1080 px num .zip, com legenda e hashtags prontas para copiar.', color: 'bg-emerald-100 text-emerald-600' },
];

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{eyebrow}</div>
      <h2 className="font-fun text-balance text-4xl font-light tracking-tight sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-balance text-zinc-600">{children}</p>}
    </Reveal>
  );
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-zinc-50 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Como funciona"
          title={
            <>
              Quatro voltas <Heavy>e pronto</Heavy>
            </>
          }
        >
          Do texto cru ao carrossel na identidade do cliente, sem abrir ferramenta de design.
        </SectionHeading>
        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className={cx(i % 2 === 1 && 'lg:translate-y-6')}>
              <Reveal variant="tilt" delay={i * 110}>
                <div className="relative rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <span className="font-fun absolute right-5 top-4 text-5xl font-black text-zinc-100">{i + 1}</span>
                  <span className={cx('relative mb-5 grid h-12 w-12 place-items-center rounded-2xl', s.color)}>
                    <s.icon size={22} />
                  </span>
                  <h3 className="relative mb-2 font-semibold">{s.title}</h3>
                  <p className="relative text-sm leading-relaxed text-zinc-600">{s.text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ——— Playground: o mesmo motor do app, ao vivo ———

function Playground() {
  const [sample, setSample] = useState(0);
  const [text, setText] = useState(SAMPLES[0]);
  const [seed, setSeed] = useState(1);
  // Duas ilustrações por exemplo; sem marcação "imagem", metade dos slides recebe imagem.
  const slides = useMemo(() => slidesFrom(text, `play-${seed}`, rotated(sample + seed).slice(0, 2)), [text, seed, sample]);

  const nextSample = () => {
    const k = (sample + 1) % SAMPLES.length;
    setSample(k);
    setText(SAMPLES[k]);
    setSeed((s) => s + 1);
  };

  return (
    <section id="experimente" className="scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Experimente"
          title={
            <>
              Escreva aqui. <Heavy>Veja girar ali.</Heavy>
            </>
          }
        >
          Este é o mesmo motor do app: edite o texto e os slides se reorganizam na hora. Linha curta vira título, lista vira slide de lista.
        </SectionHeading>
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <Reveal variant="left">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-700">Seu texto</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" icon={<Shuffle size={14} />} onClick={nextSample}>
                    Outro exemplo
                  </Button>
                  <Button size="sm" variant="ghost" title="Outro layout para o mesmo texto" icon={<RefreshCw size={14} />} onClick={() => setSeed((s) => s + 1)} />
                </div>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={16}
                className="w-full resize-none rounded-2xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-[13px] leading-relaxed outline-none focus:border-brand-500 focus:bg-white"
              />
              <p className="mt-2 text-xs text-zinc-500">Dica: **negrito** vira destaque, ==marcado== vira ultradestaque e "SLIDE 2 imagem" pede uma imagem.</p>
            </div>
          </Reveal>
          <Reveal variant="right" delay={120}>
            <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-amber-50 p-5">
              <div className="mb-3 text-sm text-zinc-600">
                <strong className="text-zinc-900">{slides.length} slides</strong> · formato 4:5
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slides.slice(0, 9).map((s, i) => (
                  <div
                    key={`${seed}-${i}`}
                    className="overflow-hidden rounded-lg shadow-md ring-1 ring-black/5 transition hover:-rotate-1 hover:scale-[1.02] animate-[lp-pop_.45s_cubic-bezier(.3,1.4,.6,1)_both]"
                    style={{ animationDelay: `${i * 50}ms` } as CSSProperties}
                  >
                    <ScaledSlide format="4x5">
                      <SlideView slide={s} index={i} total={slides.length} format="4x5" brand={DEMO_BRAND} pagination={DEMO_PAGINATION} />
                    </ScaledSlide>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ——— Recursos ———

const FEATURES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Scissors, title: 'Divisão automática', text: 'Parágrafos viram slides; a capa e o fechamento são reconhecidos sozinhos.' },
  { icon: LayoutTemplate, title: '23 templates', text: 'Design gráfico ou formato de post, ou os dois misturados no mesmo carrossel.' },
  { icon: RefreshCw, title: 'Regerar slide', text: 'Não gostou? Um clique troca o layout mantendo texto e imagens.' },
  { icon: ImageMinus, title: 'Remover fundo', text: 'Recorte a pessoa ou o produto direto no navegador e solte no meio do slide.' },
  { icon: Layers, title: 'Camadas', text: 'Veja, oculte e selecione cada elemento do slide, como em um editor de verdade.' },
  { icon: Grid3x3, title: 'Grade e guias', text: 'Encaixe com linhas-guia, margem segura e áreas do Stories.' },
  { icon: Undo2, title: 'Desfazer sem medo', text: 'Ctrl+Z e Ctrl+Shift+Z em tudo o que você mexer no editor.' },
  { icon: Eye, title: 'Prévia do Instagram', text: 'Veja como fica no feed, com perfil, legenda e o deslizar entre slides.' },
  { icon: Moon, title: 'Claro ou escuro', text: 'E a interface ganha a cor do cliente que você está editando.' },
];

function Features() {
  return (
    <section id="recursos" className="scroll-mt-20 bg-zinc-50 py-24">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Recursos"
          title={
            <>
              Tudo o que gira em torno <Heavy>de um carrossel</Heavy>
            </>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90}>
              <div className="group flex h-full gap-4 rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-brand-200">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:rotate-6">
                  <f.icon size={19} />
                </span>
                <div>
                  <h3 className="mb-1 font-semibold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-600">{f.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ——— Colinha da marcação ———

const SYNTAX: [string, string][] = [
  ['SLIDE 1', 'começa um novo slide'],
  ['SLIDE 2 imagem', 'slide com espaço para imagem'],
  ['---', 'também quebra o slide'],
  ['**texto**', 'destaque (fonte de destaque, cor do cliente)'],
  ['==texto==', 'ultradestaque (marca-texto)'],
  ['- item', 'vira slide de lista'],
  ['"citação"', 'vira slide de citação'],
];

function CheatSheet() {
  return (
    <section className="py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2">
        <Reveal variant="left">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Colinha</div>
          <h2 className="font-fun text-balance text-4xl font-light tracking-tight sm:text-5xl">
            Escreva do seu jeito. <Heavy>Ou mande no carrossel.</Heavy>
          </h2>
          <p className="mt-4 text-zinc-600">Sem marcação nenhuma já funciona. Quando quiser controlar cada slide, use estas palavrinhas mágicas no texto.</p>
        </Reveal>
        <Reveal variant="right" delay={120}>
          <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
            <div className="canopy-stripes" />
            <div className="canopy-edge" />
            <dl className="divide-y divide-zinc-100 px-5 pb-3 pt-2">
              {SYNTAX.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-2.5">
                  <dt>
                    <code className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[13px] text-zinc-800">{k}</code>
                  </dt>
                  <dd className="text-right text-sm text-zinc-600">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ——— Dúvidas ———

const FAQ: [string, string][] = [
  ['Preciso pagar ou criar conta em algum servidor?', 'Não. A "conta" é só um perfil neste navegador. Nada sai do seu computador.'],
  ['Onde ficam meus clientes, posts e imagens?', 'No armazenamento do seu navegador. Pelo menu da conta você baixa um backup completo e restaura em outro computador.'],
  ['Quais formatos posso exportar?', 'Slides em 3:4, 4:5 ou 9:16, exportados como PNG com 1080 px de largura, todos num .zip ou um de cada vez.'],
  ['Funciona sem internet?', 'O editor funciona; as fontes do Google, a busca de ícones e a remoção de fundo precisam de conexão no primeiro uso.'],
  ['Consigo usar a identidade do meu cliente?', 'Sim: logos positivo e negativo, cinco cores, três fontes e o perfil social. Todo template se adapta sozinho.'],
];

function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-zinc-50 py-24">
      <div className="mx-auto max-w-3xl px-4">
        <SectionHeading
          eyebrow="Dúvidas"
          title={
            <>
              Perguntas antes de <Heavy>subir no cavalinho</Heavy>
            </>
          }
        />
        <div className="space-y-3">
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 70}>
              <details className="group rounded-2xl border border-zinc-200 bg-white px-5 py-4 open:shadow-sm">
                <summary className="flex list-none items-center justify-between gap-4 font-medium">
                  {q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ——— Chamada final ———

function FinalCta({ onStart }: { onStart: () => void }) {
  return (
    <section className="py-24">
      <Reveal variant="zoom" className="mx-auto max-w-4xl px-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-brand-600 text-center text-brand-fg shadow-xl shadow-brand-600/20">
          <div className="h-[18px] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_28px,transparent_28px_56px)]" />
          <Sparkle className="left-10 top-14 text-amber-300" size={20} />
          <Sparkle className="bottom-12 right-14 text-[#fff]" size={14} />
          <div className="mgp-hover px-6 pb-14 pt-10">
            <MerryMark size={64} className="mb-3 [&_path]:fill-current" />
            <h2 className="font-fun text-balance text-4xl font-light tracking-tight sm:text-5xl">
              Bora dar a <span className="font-black">primeira volta?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md opacity-90">Leva menos de um minuto para cadastrar o cliente e ver o primeiro carrossel girando.</p>
            <button
              type="button"
              onClick={onStart}
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[#fff] px-6 font-semibold text-[#1e1b4b] shadow-lg transition hover:scale-[1.03]"
            >
              Começar agora <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="mgp-hover mt-6 text-center">
          <MerryWordmark className="text-2xl opacity-60" />
        </div>
      </Reveal>
    </section>
  );
}
