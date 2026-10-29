import { SLOT_CSS, slotOf } from '../fx/palette'
import { inScale, SCALES } from '../music'

// Utilidades da interface: cores das notas, armazenamento local e tipos de aviso.

// Cor de cada nota pela classe de altura (dó, dó#, ré...): um arco-íris que dá a volta na oitava.
export function noteHue(note: number) {
  return ((note % 12) * 30 + 340) % 360
}

// Mesma cor que o bloco tem no canvas.
export function noteColor(note: number) {
  return SLOT_CSS[slotOf(note, false)]
}

// O foco está num campo de texto, select ou slider: atalhos de teclado não valem.
export function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && !!target.closest('input, select, textarea, [contenteditable="true"]')
}

// localStorage pode falhar (janela anônima, dados bloqueados): sempre com try/catch.
export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Sem armazenamento: a interface continua funcionando, só não lembra.
  }
}

export type ToastKind = 'info' | 'success' | 'error' | 'party'
export type ToastItem = { id: number; text: string; kind: ToastKind }

// Painéis da gaveta.
export type PanelId = 'compose' | 'sound' | 'tools' | 'file'

export const STORAGE_WELCOME = 'ball-drop-notes:welcome-dismissed'
export const STORAGE_VOLUME = 'ball-drop-notes:volume'

// Escala mais estreita (depois da cromática) que contém todas as notas; senão, cromática.
export function scaleForNotes(notes: number[]) {
  for (let i = 1; i < SCALES.length; i++) {
    if (notes.every((n) => inScale(n, i))) return i
  }
  return 0
}
