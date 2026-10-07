import { gifUrl, type Gif } from '../data/gifs'
import { Tape } from './primitives'
import './GifCard.css'

type GifCardProps = {
  gif: Gif
  rotate?: number
  className?: string
}

/** GIF da Taylor numa moldura de "telão", com fita e crédito do GIPHY */
export function GifCard({ gif, rotate = 0, className }: GifCardProps) {
  return (
    <figure className={['gif-card', className].filter(Boolean).join(' ')} style={rotate ? { rotate: `${rotate}deg` } : undefined}>
      <Tape position="top" tone="pink" />
      <img src={gifUrl(gif.id)} alt={gif.alt} loading="lazy" decoding="async" />
      <figcaption>
        <span className="gif-card__caption">{gif.caption}</span>
        <span className="gif-card__credit">via GIPHY · @taylorswift</span>
      </figcaption>
    </figure>
  )
}
