import { formatDate, type Foto } from '../data/fotos'
import { Polaroid } from './cards'

type FotoPolaroidProps = {
  foto: Foto
  rotate?: number
  /** Mostra a data (e a cidade, se houver) num carimbo sobre a foto */
  stamp?: boolean
}

/** Polaroid com uma foto real de src/data/fotos */
export function FotoPolaroid({ foto, rotate, stamp }: FotoPolaroidProps) {
  return (
    <div className="foto-polaroid">
      <Polaroid caption={foto.caption} rotate={rotate}>
        <img src={foto.src} alt={foto.caption} loading="lazy" decoding="async" />
      </Polaroid>
      {stamp && (
        <span className="foto-polaroid__stamp">
          {formatDate(foto.date)}
          {foto.place && ` · ${foto.place}`}
        </span>
      )}
    </div>
  )
}
