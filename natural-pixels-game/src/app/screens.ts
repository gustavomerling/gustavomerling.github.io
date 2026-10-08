export const SCREENS = ['splash', 'menu', 'game'] as const

export type Screen = (typeof SCREENS)[number]

export type Navigate = (screen: Screen) => void
