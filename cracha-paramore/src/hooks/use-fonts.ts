import { useEffect, useState } from 'react'

const FONT_SPECS = [
  '400 16px "Bebas Neue"',
  '400 16px "Inter"',
  '500 16px "Inter"',
  '600 16px "Inter"',
  '700 16px "Inter"',
  '800 16px "Inter"',
  '500 16px "Space Grotesk"',
  '600 16px "Space Grotesk"',
  '700 16px "Space Grotesk"',
]

let fontsPromise: Promise<void> | null = null

export function ensureFontsReady(): Promise<void> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      if (typeof document === 'undefined' || !('fonts' in document)) return
      await Promise.all(FONT_SPECS.map((font) => document.fonts.load(font)))
      await document.fonts.ready
    })()
  }
  return fontsPromise
}

export function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    ensureFontsReady().then(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  return ready
}
