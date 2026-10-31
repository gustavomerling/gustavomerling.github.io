import { useEffect, useState } from 'react'
import { BADGE_VARIANTS, type BadgeVariant } from '@/lib/badge'

export function readBadgeVariant(): BadgeVariant {
  if (typeof window === 'undefined') return 1
  const hash = window.location.hash.replace(/^#/, '')
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return 1
  const value = Number(new URLSearchParams(hash.slice(queryIndex + 1)).get('v'))
  return (BADGE_VARIANTS as readonly number[]).includes(value) ? (value as BadgeVariant) : 1
}

export function useBadgeVariant(): BadgeVariant {
  const [variant, setVariant] = useState(readBadgeVariant)

  useEffect(() => {
    const onChange = () => setVariant(readBadgeVariant())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return variant
}
