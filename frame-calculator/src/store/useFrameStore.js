import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SIZES, WOOD_TYPES, GLASS_TYPES, COLOR_PRESETS, GRADIENT_PRESETS } from '../config/frameOptions'

const pick = (list) => list[Math.floor(Math.random() * list.length)]

const createDefaultFrame = () => ({
  id: Date.now(),
  name: '',
  size: pick(SIZES).value,
  frameThickness: Math.floor(Math.random() * 19) + 2,
  woodType: pick(WOOD_TYPES).value,
  glassType: pick(GLASS_TYPES).value,
  quantity: 1,
  frameBackground: pick([...COLOR_PRESETS, ...GRADIENT_PRESETS]),
  simulationBackground: pick([...COLOR_PRESETS, ...GRADIENT_PRESETS]),
})

export const useFrameStore = create(
  persist(
    (set, get) => ({
      frames: [],
      selectedFrameId: null,

      addFrame: () => {
        const newFrame = createDefaultFrame()
        set({ frames: [...get().frames, newFrame], selectedFrameId: newFrame.id })
      },

      updateFrame: (updates) => {
        const { frames, selectedFrameId } = get()
        set({
          frames: frames.map((f) =>
            f.id === selectedFrameId ? { ...f, ...updates } : f
          ),
        })
      },

      updateFrameById: (id, updates) => {
        const { frames } = get()
        set({
          frames: frames.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })
      },

      duplicateFrame: (id) => {
        const { frames } = get()
        const index = frames.findIndex((f) => f.id === id)
        if (index === -1) return
        const source = frames[index]
        const clone = { ...source, id: Date.now(), name: source.name ? `${source.name} (cópia)` : '' }
        const updated = [...frames]
        updated.splice(index + 1, 0, clone)
        set({ frames: updated, selectedFrameId: clone.id })
      },

      deleteFrame: (id) => {
        const { frames, selectedFrameId } = get()
        const filtered = frames.filter((f) => f.id !== id)
        set({
          frames: filtered,
          selectedFrameId: selectedFrameId === id ? (filtered[0]?.id ?? null) : selectedFrameId,
        })
      },

      selectFrame: (id) => set({ selectedFrameId: id }),

      clearFrames: () => set({ frames: [], selectedFrameId: null }),
    }),
    {
      name: 'frame-calculator-storage',
    }
  )
)
