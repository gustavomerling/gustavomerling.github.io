import { useEffect } from 'react'
import AOS from 'aos'
import Hero from '@/components/home/Hero'
import Marquee from '@/components/home/Marquee'
import FeaturedAlbums from '@/components/home/FeaturedAlbums'
import NewsPreview from '@/components/home/NewsPreview'

export default function Home() {
  useEffect(() => {
    AOS.init({
      once: true,
      duration: 650,
      easing: 'ease-out-cubic',
      offset: 40,
      disable: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    })
  }, [])

  return (
    <>
      <Hero />
      <Marquee />
      <FeaturedAlbums />
      <NewsPreview />
      <Marquee reverse />
      <BandFooter />
    </>
  )
}

function BandFooter() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 text-center sm:px-6">
      <p className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
        PARAMORE<span className="text-accent">.</span>
      </p>
      <p className="mt-3 text-sm text-content-muted">
        Do sofá vermelho de 2004 aos estádios — a história continua.
      </p>
      <a
        href="https://paramore.net/"
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-semibold text-content-inverse shadow-glow transition-colors hover:bg-accent-hover"
      >
        Site oficial
      </a>
    </section>
  )
}