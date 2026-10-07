import qrCode from '../assets/qr-code.png'
import { Eyebrow, Ransom, Tape } from '../components/primitives'
import { SITE_URL } from '../lib/time'
import './QrCode.css'

/** QR code da LP, para compartilhar. Sem trava de data (dá para imprimir antes) */
export default function QrCode() {
  return (
    <main className="qr">
      <div className="qr__inner">
        <Eyebrow>Compartilhar</Eyebrow>
        <h1 className="qr__title">
          <Ransom text="HELENA 28" />
        </h1>

        <figure className="qr__card">
          <Tape position="top" tone="pink" />
          <img src={qrCode} alt={`QR code para ${SITE_URL}`} width={320} height={320} />
          <figcaption>{SITE_URL.replace('https://', '')}</figcaption>
        </figure>

        <div className="actions">
          <a className="btn btn--primary" href={qrCode} download="helena-28-qr-code.png">
            Baixar PNG
          </a>
          <a className="btn btn--secondary" href={SITE_URL}>
            Abrir a página
          </a>
        </div>
      </div>
    </main>
  )
}
