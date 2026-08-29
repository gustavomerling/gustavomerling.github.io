import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Logo from '@/components/Logo'
import FloatingAlbums from '@/components/home/FloatingAlbums'

const REVEAL = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' as const },
  }),
}

const STATS = [
  ['2004', 'Franklin, Tennessee'],
  ['6', 'álbuns de estúdio'],
  ['3', 'Grammys'],
  ['20+', 'anos de estrada'],
]

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pb-dots absolute inset-0 opacity-50" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% -8%, var(--color-accent-subtle), transparent)',
        }}
        aria-hidden="true"
      />
      <p
        className="pb-text-outline pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[16vw] font-extrabold leading-none opacity-70"
        aria-hidden="true"
      >
        PARAMORE
      </p>

      <div className="relative mx-auto max-w-[var(--container-max)] px-4 pb-16 pt-20 sm:px-6 lg:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <motion.div
              initial="hidden"
              animate="show"
              custom={0}
              variants={REVEAL}
              className="flex items-center gap-3"
            >
              <span className="h-px w-10 bg-accent" aria-hidden="true" />
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-content-muted">
                A banda honesta de rock desde 2004
              </p>
            </motion.div>

            <h1 className="mt-8 font-display font-extrabold tracking-tight text-content-primary">
              <motion.span initial="hidden" animate="show" custom={1} variants={REVEAL} className="block text-6xl sm:text-7xl xl:text-[5.5rem] leading-[0.95]">
                PARAMORE
              </motion.span>
              <motion.span initial="hidden" animate="show" custom={2} variants={REVEAL} className="block text-accent">
                BRASIL
              </motion.span>
            </h1>

            <motion.p
              initial="hidden"
              animate="show"
              custom={3}
              variants={REVEAL}
              className="mt-6 max-w-xl text-lg leading-relaxed text-content-secondary"
            >
              Do sofá vermelho de Franklin aos estádios: seis álbuns, duas
              décadas e uma banda que se reinventa a cada era — mergulhe na
              história, nas letras e nos sons da Paramore.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="show"
              custom={4}
              variants={REVEAL}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/discografia"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-content-inverse shadow-glow transition-colors hover:bg-accent-hover"
              >
                Explorar a discografia
              </Link>
              <Link
                to="/noticias"
                className="group inline-flex items-center gap-1 rounded-full border border-line-1 bg-surface-1/60 px-6 py-3 text-sm font-semibold text-content-secondary backdrop-blur transition-colors hover:bg-surface-2 hover:text-content-primary"
              >
                Últimas notícias
                <ArrowRight className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </motion.div>

            <motion.dl
              initial="hidden"
              animate="show"
              custom={5}
              variants={REVEAL}
              className="mt-12 grid grid-cols-2 gap-6 border-t border-line-1 pt-8 sm:grid-cols-4"
            >
              {STATS.map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
                    {value}
                  </dt>
                  <dd className="mt-1 text-xs text-content-muted">{label}</dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <FloatingAlbums />
        </div>

        <div className="mt-16 hidden items-center justify-center gap-2 lg:flex" aria-hidden="true">
          <span className="font-mono text-[10px] uppercase tracking-widest text-content-muted">
            role
          </span>
          <Logo className="h-4 w-8 text-accent" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-content-muted">
            a página
          </span>
        </div>
      </div>
    </section>
  )
}