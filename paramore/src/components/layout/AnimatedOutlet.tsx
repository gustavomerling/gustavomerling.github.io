import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

interface Snapshot {
  path: string
  node: ReactNode
}

export default function AnimatedOutlet() {
  const location = useLocation()
  const outlet = useOutlet()
  const [snapshot, setSnapshot] = useState<Snapshot>({
    path: location.pathname,
    node: outlet,
  })

  if (snapshot.path !== location.pathname) {
    setSnapshot({ path: location.pathname, node: outlet })
  }

  const isAlbum = snapshot.path.startsWith('/discos')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [snapshot.path])

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={snapshot.path}
        className="overflow-x-clip"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: isAlbum ? 0.4 : 0.25, ease: 'easeOut' }}
      >
        {snapshot.node}
      </motion.div>
    </AnimatePresence>
  )
}