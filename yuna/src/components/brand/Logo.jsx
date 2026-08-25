import { useId } from 'react'

// Os arquivos de marca são PNG com arte branca sobre fundo sólido. O filtro
// converte luminância em alpha e repinta a arte na cor pedida — assim o mesmo
// arquivo serve para fundo claro e escuro.
const ART = {
  horizontal: { file: 'brand/logo-horizontal.png', w: 1728, h: 972 },
  stacked: { file: 'brand/logo-stacked.png', w: 1728, h: 972 },
}

// A arte ocupa apenas a faixa central do PNG; recortamos o excedente
// (bounding box medido no arquivo original + folga).
const CROP = {
  horizontal: { x: 440, y: 336, w: 848, h: 300 },
  stacked: { x: 584, y: 214, w: 564, h: 506 },
}

export function Logo({
  variant = 'horizontal',
  color = '#efece5',
  className,
  label = 'Yuna Marketing & Comunicação',
  ...props
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const art = ART[variant] ?? ART.horizontal
  const crop = CROP[variant] ?? CROP.horizontal
  const filterId = `yuna-tint-${id}`

  return (
    <svg
      viewBox={`0 0 ${crop.w} ${crop.h}`}
      role="img"
      aria-label={label}
      className={className}
      {...props}
    >
      <defs>
        <filter id={filterId} x="0" y="0" width="100%" height="100%">
          <feColorMatrix type="luminanceToAlpha" result="lum" />
          <feComponentTransfer in="lum" result="mask">
            <feFuncA type="table" tableValues="0 0 0 0 0.3 0.7 1 1 1 1 1" />
          </feComponentTransfer>
          <feFlood floodColor={color} floodOpacity="1" result="tint" />
          <feComposite in="tint" in2="mask" operator="in" />
        </filter>
      </defs>
      <image
        href={`${import.meta.env.BASE_URL}${art.file}`}
        x={-crop.x}
        y={-crop.y}
        width={art.w}
        height={art.h}
        filter={`url(#${filterId})`}
      />
    </svg>
  )
}

// Marca reduzida para a sidebar recolhida e para favicons internos.
export function LogoMark({ color = '#efece5', className, ...props }) {
  return (
    <Logo variant="stacked" color={color} className={className} label="Yuna" {...props} />
  )
}

// Sobre fundo neutro a cor da arte muda com o tema. feFlood recebe cor
// literal, então trocamos de instância em vez de depender de custom property.
export function ThemedLogo({
  variant = 'horizontal',
  className,
  light = '#1f2a33',
  dark = '#eceae2',
  ...props
}) {
  return (
    <>
      <Logo
        variant={variant}
        color={light}
        className={`${className ?? ''} dark:hidden`}
        {...props}
      />
      <Logo
        variant={variant}
        color={dark}
        className={`${className ?? ''} hidden dark:block`}
        {...props}
      />
    </>
  )
}
