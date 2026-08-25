import {
  Building2,
  Palette,
  CalendarDays,
  CheckCheck,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Users,
} from 'lucide-react'

// Navegação e capacidades por papel. Tudo simulado no cliente.
const NAV = [
  {
    to: '/app',
    label: 'Visão geral',
    icon: LayoutDashboard,
    roles: ['admin', 'operacao', 'comercial', 'cliente'],
  },
  {
    to: '/app/calendario',
    label: 'Calendário',
    icon: CalendarDays,
    roles: ['admin', 'operacao', 'comercial', 'cliente'],
  },
  {
    to: '/app/conteudo',
    label: 'Conteúdo',
    icon: LayoutGrid,
    roles: ['admin', 'operacao', 'cliente'],
  },
  {
    to: '/app/aprovacoes',
    label: 'Aprovações',
    icon: CheckCheck,
    roles: ['admin', 'operacao', 'cliente'],
    badge: 'pendentes',
  },
  {
    to: '/app/clientes',
    label: 'Clientes',
    icon: Building2,
    roles: ['admin', 'operacao', 'comercial'],
  },
  {
    to: '/app/equipe',
    label: 'Equipe',
    icon: Users,
    roles: ['admin', 'comercial'],
  },
  {
    to: '/app/design-system',
    label: 'Design system',
    icon: Palette,
    roles: ['admin', 'operacao', 'comercial'],
  },
  {
    to: '/app/configuracoes',
    label: 'Configurações',
    icon: Settings,
    roles: ['admin', 'operacao', 'comercial', 'cliente'],
  },
]

export function navForRole(role) {
  return NAV.filter((item) => item.roles.includes(role))
}

const ABILITIES = {
  admin: {
    verTodosClientes: true,
    criarConteudo: true,
    editarConteudo: true,
    publicar: true,
    aprovarComoCliente: false,
    gerenciarClientes: true,
    verFaturamento: true,
  },
  operacao: {
    verTodosClientes: true,
    criarConteudo: true,
    editarConteudo: true,
    publicar: true,
    aprovarComoCliente: false,
    gerenciarClientes: false,
    verFaturamento: false,
  },
  comercial: {
    verTodosClientes: true,
    criarConteudo: false,
    editarConteudo: false,
    publicar: false,
    aprovarComoCliente: false,
    gerenciarClientes: true,
    verFaturamento: true,
  },
  cliente: {
    verTodosClientes: false,
    criarConteudo: false,
    editarConteudo: false,
    publicar: false,
    aprovarComoCliente: true,
    gerenciarClientes: false,
    verFaturamento: false,
  },
}

export function can(role, ability) {
  return Boolean(ABILITIES[role]?.[ability])
}

export function abilitiesFor(role) {
  return ABILITIES[role] ?? ABILITIES.cliente
}
