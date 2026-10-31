import { useEffect, useState } from 'react'

export function readAdminMode(): boolean {
  if (typeof window === 'undefined') return false
  const hash = window.location.hash.replace(/^#/, '')
  const queryIndex = hash.indexOf('?')
  if (queryIndex === -1) return false
  return new URLSearchParams(hash.slice(queryIndex + 1)).get('admin') === '1'
}

export function useAdminMode(): boolean {
  const [isAdmin, setIsAdmin] = useState(readAdminMode)

  useEffect(() => {
    const onChange = () => setIsAdmin(readAdminMode())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return isAdmin
}
