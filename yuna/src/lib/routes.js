// Rótulos usados pelos breadcrumbs. Segmentos não mapeados caem no fallback
// (id de registro, por exemplo) e recebem o rótulo informado pela página.
export const SEGMENT_LABELS = {
  app: 'Plataforma',
  calendario: 'Calendário',
  conteudo: 'Conteúdo',
  aprovacoes: 'Aprovações',
  clientes: 'Clientes',
  equipe: 'Equipe',
  configuracoes: 'Configurações',
  'design-system': 'Design system',
  novo: 'Novo',
}

export function buildCrumbs(pathname, extra = {}) {
  const parts = pathname.split('/').filter(Boolean)
  const crumbs = []
  let acc = ''

  parts.forEach((part) => {
    acc += `/${part}`
    crumbs.push({
      to: acc,
      label: extra[part] ?? SEGMENT_LABELS[part] ?? decodeURIComponent(part),
    })
  })

  if (crumbs.length === 1 && crumbs[0].label === 'Plataforma') {
    crumbs.push({ to: '/app', label: 'Visão geral' })
  }

  return crumbs
}
