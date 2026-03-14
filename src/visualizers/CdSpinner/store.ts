import { create } from 'zustand';

export type BackgroundType = 'color' | 'image' | 'transparent';
export type ExportFormat = 'mp4' | 'webm';
export type RenderMode = 'basic' | 'quality' | 'raytraced';

export interface MaterialParams {
    thickness: number; // Geometry depth
    color: string;
    metalness: number;
    roughness: number;
    clearcoat: number;
    clearcoatRoughness: number;
    iridescence: number;
    transmission: number;
    ior: number;
    thicknessVolume: number;
    geometryResolution: number; // Curve segments for 3D model detail
}

export interface JewelCaseParams {
    visible: boolean;
    rotation: [number, number, number];
    scale: number;
    color: string;
    transmission: number;
    opacity: number;
    ior: number;
    thickness: number;
}

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

    // Camera State (Persisted)
    camera: {
        position: [number, number, number];
        target: [number, number, number];
    };

    // Audio Reactivity
    audioReactiveSettings: AudioReactiveSettings;

    // Visual Customization
    coverArt: string | null;
    background: {
        type: BackgroundType;
        value: string; // Color hex or Image URL
    };
    renderMode: RenderMode;
    materialParams: MaterialParams;
    jewelCaseParams: JewelCaseParams;

    // Export Settings
    exportSettings: {
        format: ExportFormat;
        transparent: boolean;
    };

    // Rotation Control (Bridge between UI and 3D Scene)
    rotationUpdate: { axis?: 'x' | 'y' | 'z'; value?: number; x?: number; y?: number; z?: number; id: number } | null;
    onFrameRotation: ((x: number, y: number, z: number) => void) | null;
    setRotation: (axis: 'x' | 'y' | 'z', value: number) => void;
    setRotations: (rot: { x?: number, y?: number, z?: number }) => void;
    setOnFrameRotation: (callback: ((x: number, y: number, z: number) => void) | null) => void;

    // Resets
    resetRotationSpeed: () => void;
    resetPosition: () => void;
    resetScale: () => void;
    resetAudioReactiveSettings: () => void;

    setRotationSpeed: (axis: 'x' | 'y' | 'z', value: number) => void;
    setPosition: (axis: 'x' | 'y', value: number) => void;
    setScale: (value: number) => void;
    setCamera: (position: [number, number, number], target: [number, number, number]) => void;

    setAudioReactiveSettings: (settings: Partial<AudioReactiveSettings>) => void;

    setCoverArt: (url: string | null) => void;
    setBackground: (type: BackgroundType, value?: string) => void;
    setRenderMode: (mode: RenderMode) => void;
    setMaterialParams: (params: Partial<MaterialParams>) => void;
    setJewelCaseParams: (params: Partial<JewelCaseParams>) => void;
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

const DEFAULT_MATERIAL_PARAMS: MaterialParams = {
    thickness: 0.05,
    color: '#ffffff',
    metalness: 1.0,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    iridescence: 1.0,
    transmission: 1.0,
    ior: 1.5,
    thicknessVolume: 0.5,
    geometryResolution: 64,
};

const DEFAULT_JEWEL_CASE_PARAMS: JewelCaseParams = {
    visible: true,
    rotation: [0, 0, 0],
    scale: 1.0,
    color: '#ffffff',
    transmission: 1.0,
    opacity: 1.0,
    ior: 1.5,
    thickness: 0.5,
};

export const useCdStore = create<CdState>((set) => ({
    rotationSpeed: { x: 0, y: 0.01, z: 0 },
    position: { x: 0, y: 0 },
    scale: 1,
    camera: {
        position: [0, 5, 8],
        target: [0, 0, 0]
    },

    audioReactiveSettings: DEFAULT_REACTIVE_SETTINGS,

    coverArt: null,
    background: {
        type: 'color',
        value: '#000000'
    },
    renderMode: 'quality', // Default to quality for standard PBR
    materialParams: DEFAULT_MATERIAL_PARAMS,
    jewelCaseParams: DEFAULT_JEWEL_CASE_PARAMS,
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

    setCamera: (position, target) => set((state) => ({ camera: { position, target } })),

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

    setRenderMode: (mode) => set({ renderMode: mode }),

    setMaterialParams: (params) =>
        set((state) => ({
            materialParams: { ...state.materialParams, ...params }
        })),

    setJewelCaseParams: (params) =>
        set((state) => ({
            jewelCaseParams: { ...state.jewelCaseParams, ...params }
        })),

    setExportSettings: (settings) =>
        set((state) => ({
            exportSettings: { ...state.exportSettings, ...settings }
        })),

    setRotation: (axis, value) => set({ rotationUpdate: { axis, value, id: Math.random() } }),
    setRotations: (rot) => set({ rotationUpdate: { ...rot, id: Math.random() } }),
    setOnFrameRotation: (callback) => set({ onFrameRotation: callback }),

    resetRotationSpeed: () => set({ rotationSpeed: { x: 0, y: 0.01, z: 0 } }),
    resetPosition: () => set({ position: { x: 0, y: 0 } }),
    resetScale: () => set({ scale: 1 }),
    resetAudioReactiveSettings: () => set({ audioReactiveSettings: DEFAULT_REACTIVE_SETTINGS }),
}));
