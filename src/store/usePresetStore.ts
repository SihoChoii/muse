import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Preset } from '../types/Preset';
import { useFxStore } from './useFxStore';


interface PresetStore {
    presets: Preset[];

    // Actions
    savePreset: (name: string, visualizerId: string, visualizerState: any) => void;
    updatePreset: (id: string, visualizerState: any) => void;
    deletePreset: (id: string) => void;
    getPresetsForVisualizer: (visualizerId: string) => Preset[];
    loadPreset: (id: string) => any | null; // Returns the visualizer-specific config
}

export const usePresetStore = create<PresetStore>()(
    persist(
        (set, get) => ({
            presets: [],

            savePreset: (name, visualizerId, visualizerState) => {
                // Capture Global State
                const globalEffects = useFxStore.getState();

                // We only want to save the actual values, not the actions/functions from the store
                // Assuming useFxStore state structure matches what we want to restore.
                // We'll filter out functions to be safe, though JSON.stringify in persist usually handles this,
                // it's better to be explicit if the store has actions mixed in top-level.
                // For now, we'll assume the store state is clean or just grab relevant parts if needed.
                // But useFxStore likely has actions. Let's do a shallow clone and remove functions.

                const cleanGlobalEffects = JSON.parse(JSON.stringify(globalEffects));

                const newPreset: Preset = {
                    id: uuidv4(),
                    name,
                    visualizerId,
                    version: 1,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    data: {
                        visualizerConfig: visualizerState,
                        globalEffects: cleanGlobalEffects,
                        lighting: {}, // Placeholder for future
                        background: {} // Placeholder for future
                    }
                };

                set((state) => ({
                    presets: [...state.presets, newPreset]
                }));
            },

            updatePreset: (id, visualizerState) => {
                const globalEffects = useFxStore.getState();
                const cleanGlobalEffects = JSON.parse(JSON.stringify(globalEffects));

                set((state) => ({
                    presets: state.presets.map(p =>
                        p.id === id
                            ? {
                                ...p,
                                updatedAt: Date.now(),
                                data: {
                                    ...p.data,
                                    visualizerConfig: visualizerState,
                                    globalEffects: cleanGlobalEffects
                                }
                            }
                            : p
                    )
                }));
            },

            deletePreset: (id) => {
                set((state) => ({
                    presets: state.presets.filter((p) => p.id !== id)
                }));
            },

            getPresetsForVisualizer: (visualizerId) => {
                return get().presets.filter((p) => p.visualizerId === visualizerId);
            },

            loadPreset: (id) => {
                const preset = get().presets.find((p) => p.id === id);
                if (!preset) return null;

                // Restore Global Effects
                // We need to merge carefully. 
                // useFxStore might have setters. We shouldn't overwrite setters.
                // We'll use useFxStore.setState() which merges logic usually, but deep merge might be safer for nested config.

                if (preset.data.globalEffects) {
                    // We can't just setState(preset.data.globalEffects) if the structure is complex 
                    // and we want to preserve partials, but usually for a preset "restore", 
                    // we want exactly what was saved.
                    // However, useFxStore likely has `setBloom`, `setGlitch` etc methods which shouldn't be overwritten.
                    // `setState` in zustand merges at top level.
                    // Let's use lodash merge to be robust if we need to merge INTO existing state,
                    // but `setState` is usually sufficient for top-level keys.
                    // If `globalEffects` contains the entire state including the keys for effects...

                    // Actually, the cleanest way with Zustand is setState(state => ({ ...state, ...newData }))
                    useFxStore.setState(preset.data.globalEffects);
                }

                // Return the visualizer specific config so the specific component can use it
                return preset.data.visualizerConfig;
            }
        }),
        {
            name: 'muse-preset-storage',
        }
    )
);
