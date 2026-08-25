import { useMemo } from 'react'

import { CLIENT_SCOPE } from '@/lib/mock-data'
import { can } from '@/lib/permissions'
import { useAuthStore } from '@/store/useAuthStore'
import { useDataStore } from '@/store/useDataStore'

// O papel "cliente" só vê a própria conta. Os papéis internos veem a carteira
// inteira da agência.
export function useScope() {
  const role = useAuthStore((s) => s.role)
  const allClients = useDataStore((s) => s.clients)
  const allPosts = useDataStore((s) => s.posts)

  return useMemo(() => {
    const global = can(role, 'verTodosClientes')
    const clients = global ? allClients : allClients.filter((c) => c.id === CLIENT_SCOPE)
    const ids = new Set(clients.map((c) => c.id))
    const posts = allPosts.filter((p) => ids.has(p.clientId))

    return {
      role,
      global,
      clients,
      posts,
      clientById: (id) => allClients.find((c) => c.id === id),
      scopedClient: global ? null : clients[0],
    }
  }, [role, allClients, allPosts])
}
