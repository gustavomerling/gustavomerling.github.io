import { Children, type CSSProperties, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { revealVariants, type RevealVariant } from './variants'

type RevealProps = {
  children: ReactNode
  variant?: RevealVariant
  /** Atraso em segundos */
  delay?: number
  /** Quanto do elemento precisa aparecer para animar (0 a 1) */
  amount?: number
  className?: string
  style?: CSSProperties
}

/** Anima o conteúdo uma vez, quando ele entra na tela */
export function Reveal({ children, variant = 'up', delay = 0, amount = 0.25, className, style }: RevealProps) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={revealVariants(variant)}
      custom={delay}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  )
}

type RevealGroupProps = {
  children: ReactNode
  variant?: RevealVariant
  /** Intervalo entre um filho e o próximo (s) */
  stagger?: number
  className?: string
  style?: CSSProperties
}

/** Como o Reveal, mas cada filho entra em sequência (cascata) */
export function RevealGroup({ children, variant = 'up', stagger = 0.09, className, style }: RevealGroupProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger } } }}
    >
      {Children.map(children, (child) =>
        child ? (
          <motion.div className="reveal-item" variants={revealVariants(variant)} custom={0}>
            {child}
          </motion.div>
        ) : null,
      )}
    </motion.div>
  )
}
