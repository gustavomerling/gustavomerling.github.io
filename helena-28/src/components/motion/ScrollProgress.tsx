import { motion, useScroll, useSpring } from 'motion/react'

/** Barrinha de glitter no topo que enche conforme a rolagem */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden />
}
