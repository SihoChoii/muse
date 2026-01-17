import { create } from 'zustand';

interface BloomState {
    enabled: boolean;
    intensity: number;
    threshold: number;
    reactive: boolean;
}

interface GlitchState {
    enabled: boolean;
    strength: number;
    reactive: boolean;
}

interface PixelationState {
    enabled: boolean;
    granularity: number;
}

interface ChromaticAberrationState {
    enabled: boolean;
    offset: number;
    reactive: boolean;
}

interface ColorGradeState {
    mode: 'normal' | 'bw' | 'sepia' | 'cyberpunk';
}

interface DitherState {
    enabled: boolean;
    strength: number;
}

interface FxStore {
    bloom: BloomState;
    glitch: GlitchState;
    pixelation: PixelationState;
    colorGrade: ColorGradeState;
    chromaticAberration: ChromaticAberrationState;
    dither: DitherState;

    setBloom: (updates: Partial<BloomState>) => void;
    setGlitch: (updates: Partial<GlitchState>) => void;
    setPixelation: (updates: Partial<PixelationState>) => void;
    setColorGrade: (updates: Partial<ColorGradeState>) => void;
    setChromaticAberration: (updates: Partial<ChromaticAberrationState>) => void;
    setDither: (updates: Partial<DitherState>) => void;
}

export const useFxStore = create<FxStore>((set) => ({
    bloom: {
        enabled: false,
        intensity: 1.5,
        threshold: 0.5,
        reactive: true,
    },
    glitch: {
        enabled: false,
        strength: 0.1,
        reactive: true,
    },
    pixelation: {
        enabled: false,
        granularity: 5,
    },
    colorGrade: {
        mode: 'normal',
    },
    chromaticAberration: {
        enabled: false,
        offset: 0.05,
        reactive: true,
    },
    dither: {
        enabled: false,
        strength: 0.2, // Default subtle grain
    },

    setBloom: (updates) =>
        set((state) => ({ bloom: { ...state.bloom, ...updates } })),
    setGlitch: (updates) =>
        set((state) => ({ glitch: { ...state.glitch, ...updates } })),
    setPixelation: (updates) =>
        set((state) => ({ pixelation: { ...state.pixelation, ...updates } })),
    setColorGrade: (updates) =>
        set((state) => ({ colorGrade: { ...state.colorGrade, ...updates } })),
    setChromaticAberration: (updates) =>
        set((state) => ({
            chromaticAberration: { ...state.chromaticAberration, ...updates },
        })),
    setDither: (updates) =>
        set((state) => ({ dither: { ...state.dither, ...updates } })),
}));
