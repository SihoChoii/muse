import { create } from 'zustand';

export type BackgroundType = 'color' | 'image' | 'transparent';
export type ExportFormat = 'mp4' | 'webm';

export interface AudioReactiveSettings {
    frequencyRange: [number, number]; // Min/Max Hz
    threshold: number; // 0-1
    attack: number; // 0-1
    release: number; // 0-1
    gain: number; // Multiplier

    // Effect Strength
    scaleSensitivity: number; // 0-1 (e.g. 0.2)
    rotationSensitivity: number; // 0-1 (e.g. 0.1)
}

interface CdState {
    rotationSpeed: { x: number; y: number; z: number };
    position: { x: number; y: number };
    scale: number;

    // Audio Reactivity
    audioReactiveSettings: AudioReactiveSettings;

    // Visual Customization
    coverArt: string | null;
    background: {
        type: BackgroundType;
        value: string; // Color hex or Image URL
    };

    // Export Settings
    exportSettings: {
        format: ExportFormat;
        transparent: boolean;
    };

    // Rotation Control (Bridge between UI and 3D Scene)
    rotationUpdate: { axis: 'x' | 'y' | 'z'; value: number; id: number } | null;
    onFrameRotation: ((x: number, y: number, z: number) => void) | null;
    setRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
    setOnFrameRotation: (callback: ((x: number, y: number, z: number) => void) | null) => void;

    // Resets
    resetRotationSpeed: () => void;
    resetPosition: () => void;
    resetScale: () => void;
    resetAudioReactiveSettings: () => void;

    setRotationSpeed: (axis: 'x' | 'y' | 'z', value: number) => void;
    setPosition: (axis: 'x' | 'y', value: number) => void;
    setScale: (value: number) => void;

    setAudioReactiveSettings: (settings: Partial<AudioReactiveSettings>) => void;

    setCoverArt: (url: string | null) => void;
    setBackground: (type: BackgroundType, value?: string) => void;
    setExportSettings: (settings: Partial<CdState['exportSettings']>) => void;
}

const DEFAULT_REACTIVE_SETTINGS: AudioReactiveSettings = {
    frequencyRange: [20, 150], // Bass
    threshold: 0.1,
    attack: 0.3,
    release: 0.5,
    gain: 1.5,
    scaleSensitivity: 0.2,
    rotationSensitivity: 0.1,
};

export const useCdStore = create<CdState>((set) => ({
    rotationSpeed: { x: 0, y: 0.01, z: 0 },
    position: { x: 0, y: 0 },
    scale: 1,

    audioReactiveSettings: DEFAULT_REACTIVE_SETTINGS,

    coverArt: null,
    background: {
        type: 'color',
        value: '#000000'
    },
    exportSettings: {
        format: 'mp4',
        transparent: false
    },

    rotationUpdate: null,
    onFrameRotation: null,

    setRotationSpeed: (axis, value) =>
        set((state) => ({ rotationSpeed: { ...state.rotationSpeed, [axis]: value } })),

    setPosition: (axis, value) =>
        set((state) => ({ position: { ...state.position, [axis]: value } })),

    setScale: (value) => set({ scale: value }),

    setAudioReactiveSettings: (settings) =>
        set((state) => ({
            audioReactiveSettings: { ...state.audioReactiveSettings, ...settings }
        })),

    setCoverArt: (url) => set({ coverArt: url }),

    setBackground: (type, value) =>
        set((state) => ({
            background: {
                type,
                value: value ?? state.background.value
            }
        })),

    setExportSettings: (settings) =>
        set((state) => ({
            exportSettings: { ...state.exportSettings, ...settings }
        })),

    setRotation: (axis, value) => set({ rotationUpdate: { axis, value, id: Math.random() } }),
    setOnFrameRotation: (callback) => set({ onFrameRotation: callback }),

    resetRotationSpeed: () => set({ rotationSpeed: { x: 0, y: 0.01, z: 0 } }),
    resetPosition: () => set({ position: { x: 0, y: 0 } }),
    resetScale: () => set({ scale: 1 }),
    resetAudioReactiveSettings: () => set({ audioReactiveSettings: DEFAULT_REACTIVE_SETTINGS }),
}));
