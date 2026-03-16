import type {
  AudioReactiveSettings,
  BackgroundState,
  CameraState,
  JewelCaseParams,
  MaterialParams,
  PositionState,
  RotationSpeed,
  RotationState,
} from '../visualizers/CdSpinner/store'
import type { FxSnapshot } from '../store/useFxStore'

export interface CdVisualizerConfig {
  rotationSpeed: RotationSpeed
  position: PositionState
  scale: number
  coverArt: string | null
  background: BackgroundState
  renderMode: 'basic' | 'quality' | 'raytraced'
  materialParams: MaterialParams
  jewelCaseParams: JewelCaseParams
  audioReactiveSettings: AudioReactiveSettings
  camera: CameraState
  rotation: RotationState
}

export type VisualizerConfig = CdVisualizerConfig

export interface PresetData {
  visualizerConfig: VisualizerConfig
  globalEffects: FxSnapshot
  lighting: Record<string, never>
  background: Record<string, never>
}
