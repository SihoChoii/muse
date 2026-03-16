import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import type { Preset } from '../types/Preset'
import type { VisualizerConfig } from '../types/visualizerConfig'
import { getFxSnapshot, useFxStore } from './useFxStore'

interface PresetStore {
  presets: Preset[]
  activePresetId: string | null
  setActivePresetId: (id: string | null) => void
  savePreset: (name: string, visualizerId: string, visualizerState: VisualizerConfig) => string
  updatePreset: (id: string, visualizerState: VisualizerConfig) => void
  deletePreset: (id: string) => void
  getPresetsForVisualizer: (visualizerId: string) => Preset[]
  loadPreset: (id: string) => VisualizerConfig | null
}

export const usePresetStore = create<PresetStore>()(
  persist(
    (set, get) => ({
      presets: [],
      activePresetId: null,

      setActivePresetId: (id) => set({ activePresetId: id }),

      savePreset: (name, visualizerId, visualizerState) => {
        const id = uuidv4()
        const newPreset: Preset = {
          id,
          name,
          visualizerId,
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          data: {
            visualizerConfig: visualizerState,
            globalEffects: getFxSnapshot(useFxStore.getState()),
            lighting: {},
            background: {},
          },
        }

        set((state) => ({
          presets: [...state.presets, newPreset],
          activePresetId: id,
        }))
        return id
      },

      updatePreset: (id, visualizerState) => {
        set((state) => ({
          presets: state.presets.map((preset) =>
            preset.id === id
              ? {
                  ...preset,
                  updatedAt: Date.now(),
                  data: {
                    ...preset.data,
                    visualizerConfig: visualizerState,
                    globalEffects: getFxSnapshot(useFxStore.getState()),
                  },
                }
              : preset,
          ),
        }))
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((preset) => preset.id !== id),
          activePresetId: state.activePresetId === id ? null : state.activePresetId
        }))
      },

      getPresetsForVisualizer: (visualizerId) =>
        get().presets.filter((preset) => preset.visualizerId === visualizerId),

      loadPreset: (id) => {
        const preset = get().presets.find((candidate) => candidate.id === id)
        if (!preset) {
          return null
        }

        useFxStore.setState(preset.data.globalEffects)
        set({ activePresetId: id })
        return preset.data.visualizerConfig
      },
    }),
    {
      name: 'muse-preset-storage',
    },
  ),
)
