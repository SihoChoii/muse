import { create } from 'zustand'

export type BackgroundType = 'color' | 'image' | 'transparent'
export type ExportFormat = 'mp4' | 'webm'
export type RenderMode = 'basic' | 'quality' | 'raytraced'

export interface RotationSpeed {
  x: number
  y: number
  z: number
}

export interface PositionState {
  x: number
  y: number
}

export interface RotationState {
  x: number
  y: number
  z: number
}

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}

export interface BackgroundState {
  type: BackgroundType
  value: string
}

export interface MaterialParams {
  thickness: number
  color: string
  metalness: number
  roughness: number
  clearcoat: number
  clearcoatRoughness: number
  iridescence: number
  transmission: number
  ior: number
  thicknessVolume: number
  geometryResolution: number
}

export interface JewelCaseParams {
  visible: boolean
  rotation: [number, number, number]
  scale: number
  color: string
  transmission: number
  opacity: number
  ior: number
  thickness: number
}

export interface AudioReactiveSettings {
  frequencyRange: [number, number]
  threshold: number
  attack: number
  release: number
  gain: number
  scaleSensitivity: number
  rotationSensitivity: number
}

interface RotationUpdate extends Partial<RotationState> {
  axis?: keyof RotationState
  value?: number
  id: number
}

interface CdState {
  rotationSpeed: RotationSpeed
  position: PositionState
  scale: number
  camera: CameraState
  audioReactiveSettings: AudioReactiveSettings
  coverArt: string | null
  background: BackgroundState
  renderMode: RenderMode
  materialParams: MaterialParams
  jewelCaseParams: JewelCaseParams
  rotationUpdate: RotationUpdate | null
  onFrameRotation: ((x: number, y: number, z: number) => void) | null
  setRotation: (axis: keyof RotationState, value: number) => void
  setRotations: (rot: Partial<RotationState>) => void
  setOnFrameRotation: (
    callback: ((x: number, y: number, z: number) => void) | null,
  ) => void
  resetRotationSpeed: () => void
  resetPosition: () => void
  resetScale: () => void
  resetAudioReactiveSettings: () => void
  setRotationSpeed: (axis: keyof RotationSpeed, value: number) => void
  setPosition: (axis: keyof PositionState, value: number) => void
  setScale: (value: number) => void
  setCamera: (position: CameraState['position'], target: CameraState['target']) => void
  setAudioReactiveSettings: (settings: Partial<AudioReactiveSettings>) => void
  setCoverArt: (url: string | null) => void
  setBackground: (type: BackgroundType, value?: string) => void
  setRenderMode: (mode: RenderMode) => void
  setMaterialParams: (params: Partial<MaterialParams>) => void
  setJewelCaseParams: (params: Partial<JewelCaseParams>) => void
}

export interface CdPresetConfig {
  rotation?: Partial<RotationState>
  rotationSpeed?: Partial<RotationSpeed>
  position?: Partial<PositionState>
  scale?: number
  coverArt?: string | null
  background?: BackgroundState
  renderMode?: RenderMode
  materialParams?: Partial<MaterialParams>
  jewelCaseParams?: Partial<JewelCaseParams>
  audioReactiveSettings?: Partial<AudioReactiveSettings>
  camera?: CameraState
}

const DEFAULT_REACTIVE_SETTINGS: AudioReactiveSettings = {
  frequencyRange: [20, 150],
  threshold: 0.1,
  attack: 0.3,
  release: 0.5,
  gain: 1.5,
  scaleSensitivity: 0.2,
  rotationSensitivity: 0.1,
}

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
}

const DEFAULT_JEWEL_CASE_PARAMS: JewelCaseParams = {
  visible: true,
  rotation: [0, 0, 0],
  scale: 1.0,
  color: '#ffffff',
  transmission: 1.0,
  opacity: 1.0,
  ior: 1.5,
  thickness: 0.5,
}

export const useCdStore = create<CdState>((set) => ({
  rotationSpeed: { x: 0, y: 0.01, z: 0 },
  position: { x: 0, y: 0 },
  scale: 1,
  camera: {
    position: [0, 5, 8],
    target: [0, 0, 0],
  },
  audioReactiveSettings: DEFAULT_REACTIVE_SETTINGS,
  coverArt: null,
  background: {
    type: 'color',
    value: '#000000',
  },
  renderMode: 'quality',
  materialParams: DEFAULT_MATERIAL_PARAMS,
  jewelCaseParams: DEFAULT_JEWEL_CASE_PARAMS,
  rotationUpdate: null,
  onFrameRotation: null,

  setRotationSpeed: (axis, value) =>
    set((state) => ({ rotationSpeed: { ...state.rotationSpeed, [axis]: value } })),
  setPosition: (axis, value) =>
    set((state) => ({ position: { ...state.position, [axis]: value } })),
  setScale: (value) => set({ scale: value }),
  setCamera: (position, target) => set({ camera: { position, target } }),
  setAudioReactiveSettings: (settings) =>
    set((state) => ({
      audioReactiveSettings: { ...state.audioReactiveSettings, ...settings },
    })),
  setCoverArt: (url) => set({ coverArt: url }),
  setBackground: (type, value) =>
    set((state) => ({
      background: {
        type,
        value: value ?? state.background.value,
      },
    })),
  setRenderMode: (mode) => set({ renderMode: mode }),
  setMaterialParams: (params) =>
    set((state) => ({
      materialParams: { ...state.materialParams, ...params },
    })),
  setJewelCaseParams: (params) =>
    set((state) => ({
      jewelCaseParams: { ...state.jewelCaseParams, ...params },
    })),
  setRotation: (axis, value) =>
    set({ rotationUpdate: { axis, value, id: Math.random() } }),
  setRotations: (rot) => set({ rotationUpdate: { ...rot, id: Math.random() } }),
  setOnFrameRotation: (callback) => set({ onFrameRotation: callback }),
  resetRotationSpeed: () => set({ rotationSpeed: { x: 0, y: 0.01, z: 0 } }),
  resetPosition: () => set({ position: { x: 0, y: 0 } }),
  resetScale: () => set({ scale: 1 }),
  resetAudioReactiveSettings: () =>
    set({ audioReactiveSettings: DEFAULT_REACTIVE_SETTINGS }),
}))

export const loadCdPresetConfig = (config?: CdPresetConfig | null) => {
  if (!config) {
    return
  }

  const store = useCdStore.getState()

  if (config.rotation) {
    store.setRotations(config.rotation)
  }
  if (config.rotationSpeed) {
    if (typeof config.rotationSpeed.x === 'number') {
      store.setRotationSpeed('x', config.rotationSpeed.x)
    }
    if (typeof config.rotationSpeed.y === 'number') {
      store.setRotationSpeed('y', config.rotationSpeed.y)
    }
    if (typeof config.rotationSpeed.z === 'number') {
      store.setRotationSpeed('z', config.rotationSpeed.z)
    }
  }
  if (config.position) {
    if (typeof config.position.x === 'number') {
      store.setPosition('x', config.position.x)
    }
    if (typeof config.position.y === 'number') {
      store.setPosition('y', config.position.y)
    }
  }
  if (typeof config.scale === 'number') {
    store.setScale(config.scale)
  }

  if (config.coverArt !== undefined) {
    store.setCoverArt(config.coverArt)
  }
  if (config.background?.type) {
    store.setBackground(config.background.type, config.background.value)
  }
  if (config.renderMode) {
    store.setRenderMode(config.renderMode)
  }
  if (config.materialParams) {
    store.setMaterialParams(config.materialParams)
  }
  if (config.jewelCaseParams) {
    store.setJewelCaseParams(config.jewelCaseParams)
  }
  if (config.audioReactiveSettings) {
    store.setAudioReactiveSettings(config.audioReactiveSettings)
  }
  if (config.camera) {
    store.setCamera(config.camera.position, config.camera.target)
  }
}
