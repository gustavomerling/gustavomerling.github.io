import { useMemo, useState, type ReactNode } from 'react'
import { SettingsContext, loadSettings, saveSettings, type Settings } from './settings.ts'

/** Holds the player's settings and remembers them in the browser. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(loadSettings)

  const value = useMemo(
    () => ({
      settings,
      update: (patch: Partial<Settings>) => {
        setSettings((current) => {
          const next = { ...current, ...patch }
          saveSettings(next)
          return next
        })
      },
    }),
    [settings],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
