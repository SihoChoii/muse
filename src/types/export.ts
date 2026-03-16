import type { ExportFormat } from '../visualizers/CdSpinner/store'

export type FrameEncoding = 'jpeg' | 'png'
export type RenderProfile = 'fast' | 'quality'
export type CompressionMode = 'lossless' | 'lossy'
export type ResolutionPreset = '720p' | '1080p' | '1440p' | '4k' | 'custom'
export type RenderCompletionKind = 'complete' | 'partial' | 'discarded'

export interface ExportSettings {
  format: ExportFormat
  profile: RenderProfile
  compression: CompressionMode
  resolutionPreset: ResolutionPreset
  width: number
  height: number
  transparent: boolean
  includeAudio: boolean
  fps: number
}

export interface RenderStartRequest {
  audioPath: string | null
  fps: number
  format: ExportFormat
  transparent: boolean
  includeAudio: boolean
  width: number
  height: number
  profile: RenderProfile
  compression: CompressionMode
}

export interface RenderStartSuccessResult {
  success: true
  cancelled: false
  outputPath: string
}

export interface RenderCancelledResult {
  success: false
  cancelled: true
}

export interface RenderFailureResult {
  success: false
  cancelled: false
  error: string
}

export type RenderStartResult =
  | RenderStartSuccessResult
  | RenderCancelledResult
  | RenderFailureResult

export interface RenderFramePayload {
  data: ArrayBuffer
  encoding: FrameEncoding
  repeat?: number
}

export interface RenderCommandResult {
  success: boolean
  error?: string
}

export interface RenderFinishRequest {
  cancelled: boolean
}

export interface RenderFinishSuccessResult {
  success: true
  completionKind: RenderCompletionKind
  outputPath?: string
}

export interface RenderFinishFailureResult {
  success: false
  error?: string
}

export type RenderFinishResult =
  | RenderFinishSuccessResult
  | RenderFinishFailureResult

export interface MuseBridge {
  startRender: (request: RenderStartRequest) => Promise<RenderStartResult>
  sendFrame: (payload: RenderFramePayload) => Promise<RenderCommandResult>
  finishRender: (request: RenderFinishRequest) => Promise<RenderFinishResult>
  openPath: (targetPath: string) => Promise<boolean>
  showItemInFolder: (targetPath: string) => Promise<boolean>
}
