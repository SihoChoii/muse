import { create } from 'zustand'

export interface BloomState {
  enabled: boolean
  intensity: number
  threshold: number
  reactive: boolean
}

export interface GlitchState {
  enabled: boolean
  strength: number
  reactive: boolean
}

export interface PixelationState {
  enabled: boolean
  granularity: number
}

export type ColorGradeMode = 'normal' | 'bw' | 'sepia' | 'cyberpunk'

export interface ChromaticAberrationState {
  enabled: boolean
  offset: number
  reactive: boolean
}

export interface ColorGradeState {
  mode: ColorGradeMode
}

export interface DitherState {
  enabled: boolean
  strength: number
}

export interface FxSnapshot {
  bloom: BloomState
  glitch: GlitchState
  pixelation: PixelationState
  colorGrade: ColorGradeState
  chromaticAberration: ChromaticAberrationState
  dither: DitherState
}

interface FxStore extends FxSnapshot {
  setBloom: (updates: Partial<BloomState>) => void
  setGlitch: (updates: Partial<GlitchState>) => void
  setPixelation: (updates: Partial<PixelationState>) => void
  setColorGrade: (updates: Partial<ColorGradeState>) => void
  setChromaticAberration: (updates: Partial<ChromaticAberrationState>) => void
  setDither: (updates: Partial<DitherState>) => void
}

export function getFxSnapshot(state: FxSnapshot): FxSnapshot {
  return {
    bloom: { ...state.bloom },
    glitch: { ...state.glitch },
    pixelation: { ...state.pixelation },
    colorGrade: { ...state.colorGrade },
    chromaticAberration: { ...state.chromaticAberration },
    dither: { ...state.dither },
  }
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
    strength: 0.2,
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
}))
