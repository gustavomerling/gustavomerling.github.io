import amazon from '../assets/logos/amazon.svg'
import eventim from '../assets/logos/eventim.webp'
import ingresso from '../assets/logos/ingresso.webp'
import mercadolivre from '../assets/logos/mercadolivre.webp'
import pinterest from '../assets/logos/pinterest.webp'
import shopee from '../assets/logos/shopee.svg'
import { Section } from '../components/layout'
import { RevealGroup } from '../components/motion/Reveal'
import './LinksSection.css'

type Link = {
  name: string
  href: string
  /** Logo salvo em src/assets/logos; sem ele, vira um selo com `badge` */
  logo?: string
  badge?: string
  joke: string
}

// Para a Helena, viciada em comprinhas (e compronas)
const LINKS: Link[] = [
  { name: 'Amazon', href: 'https://www.amazon.com.br/', logo: amazon, joke: 'chega amanhã' },
  { name: 'Mercado Livre', href: 'https://www.mercadolivre.com.br/', logo: mercadolivre, joke: 'frete grátis (às vezes)' },
  { name: 'Shopee', href: 'https://shopee.com.br/', logo: shopee, joke: 'chega em 40 dias' },
  { name: 'Taylor Swift Store', href: 'https://taylorswift.lnk.to/store', badge: 'TS', joke: 'só mais um vinil' },
  { name: 'Ingresso.com', href: 'https://www.ingresso.com/', logo: ingresso, joke: 'sessão da meia-noite' },
  { name: 'Eventim', href: 'https://www.eventim.com.br/', logo: eventim, joke: 'show da Hayley (de novo)' },
  { name: 'Pinterest', href: 'https://br.pinterest.com/', logo: pinterest, joke: 'mais uma pasta' },
]

export function LinksSection() {
  return (
    <Section
      id="links"
      tone="pink"
      center
      eyebrow="Links úteis"
      title={
        <>
          Para as comprinhas <span className="accent">(e compronas)</span>
        </>
      }
    >
      <RevealGroup className="links-uteis" variant="pop" stagger={0.06}>
        {LINKS.map((l) => (
          <a key={l.name} className="links-uteis__item" href={l.href} target="_blank" rel="noopener noreferrer">
            <span className="links-uteis__logo">
              {l.logo ? <img src={l.logo} alt="" width={40} height={40} /> : <span className="links-uteis__badge">{l.badge}</span>}
            </span>
            <span className="links-uteis__name">{l.name}</span>
            <span className="links-uteis__joke">{l.joke}</span>
          </a>
        ))}
      </RevealGroup>
    </Section>
  )
}
