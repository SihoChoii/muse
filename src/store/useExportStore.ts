import type { ReactNode } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CompressionMode,
  ExportSettings,
  RenderCompletionKind,
  RenderProfile,
  ResolutionPreset,
} from '../types/export'
import type { ExportFormat } from '../visualizers/CdSpinner/store'

const RESOLUTION_PRESETS: Record<
  Exclude<ResolutionPreset, 'custom'>,
  { width: number; height: number }
> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4k': { width: 3840, height: 2160 },
}

export interface ExportTimelineState {
  frameIndex: number
  totalFrames: number
  fps: number
  timeSeconds: number
  deltaSeconds: number
  analyzerData: Uint8Array<ArrayBuffer> | null
}

export type ExportPhase = 'idle' | 'preparing' | 'rendering' | 'finalizing' | 'done' | 'error'

export interface ExportMetrics {
  progress: number
  phaseProgress: number
  phaseLabel: string
  elapsedMs: number
  etaMs: number | null
  framesRendered: number
  totalFrames: number
}

interface ExportSurfaceController {
  canvas: HTMLCanvasElement
  invalidate: () => void
}

interface ExportResult {
  completionKind: RenderCompletionKind | null
  outputPath: string | null
  error: string | null
}

interface ExportState {
  settings: ExportSettings
  phase: ExportPhase
  metrics: ExportMetrics
  timeline: ExportTimelineState | null
  isCancelling: boolean
  result: ExportResult
  surface: ExportSurfaceController | null
  setPhase: (phase: ExportPhase) => void
  setFormat: (format: ExportFormat) => void
  setProfile: (profile: RenderProfile) => void
  setCompression: (compression: CompressionMode) => void
  setResolutionPreset: (preset: ResolutionPreset) => void
  setDimensions: (width: number, height: number) => void
  setTransparent: (transparent: boolean) => void
  setIncludeAudio: (includeAudio: boolean) => void
  setFps: (fps: number) => void
  startJob: () => void
  updateMetrics: (metrics: Partial<ExportMetrics>) => void
  setTimeline: (timeline: ExportTimelineState | null) => void
  setResult: (result: Partial<ExportResult>) => void
  completeJob: (result: {
    completionKind: RenderCompletionKind
    outputPath?: string | null
    framesRendered: number
    totalFrames: number
  }) => void
  failJob: (error: string) => void
  requestCancel: () => void
  resetJob: () => void
  registerSurface: (surface: ExportSurfaceController | null) => void
}

const DEFAULT_SETTINGS: ExportSettings = {
  format: 'mp4',
  profile: 'quality',
  compression: 'lossless',
  resolutionPreset: '1080p',
  width: 1920,
  height: 1080,
  transparent: false,
  includeAudio: true,
  fps: 60,
}

const DEFAULT_METRICS: ExportMetrics = {
  progress: 0,
  phaseProgress: 0,
  phaseLabel: 'Idle',
  elapsedMs: 0,
  etaMs: null,
  framesRendered: 0,
  totalFrames: 0,
}

function sanitizeDimension(value: number) {
  const safeValue = Math.max(2, Math.round(value))
  return safeValue % 2 === 0 ? safeValue : safeValue + 1
}

function normalizeSettings(settings: ExportSettings): ExportSettings {
  const format = settings.format === 'webm' ? 'webm' : 'mp4'
  const resolutionPreset = settings.resolutionPreset
  const presetResolution =
    resolutionPreset === 'custom' ? null : RESOLUTION_PRESETS[resolutionPreset]
  const width = presetResolution
    ? presetResolution.width
    : sanitizeDimension(settings.width)
  const height = presetResolution
    ? presetResolution.height
    : sanitizeDimension(settings.height)

  return {
    ...settings,
    format,
    resolutionPreset,
    width,
    height,
    transparent: format === 'webm' ? settings.transparent : false,
    includeAudio: settings.includeAudio,
    fps: Math.max(1, Math.round(settings.fps)),
  }
}

function withPartialMetrics(
  current: ExportMetrics,
  next: Partial<ExportMetrics>,
): ExportMetrics {
  return {
    ...current,
    ...next,
  }
}

export const useExportStore = create<ExportState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      phase: 'idle',
      metrics: DEFAULT_METRICS,
      timeline: null,
      isCancelling: false,
      result: {
        completionKind: null,
        outputPath: null,
        error: null,
      },
      surface: null,
      setPhase: (phase) => set({ phase }),
      setFormat: (format) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            format,
          }),
        })),
      setProfile: (profile) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            profile,
          }),
        })),
      setCompression: (compression) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            compression,
          }),
        })),
      setResolutionPreset: (resolutionPreset) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            resolutionPreset,
          }),
        })),
      setDimensions: (width, height) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            resolutionPreset: 'custom',
            width,
            height,
          }),
        })),
      setTransparent: (transparent) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            transparent,
          }),
        })),
      setIncludeAudio: (includeAudio) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            includeAudio,
          }),
        })),
      setFps: (fps) =>
        set((state) => ({
          settings: normalizeSettings({
            ...state.settings,
            fps,
          }),
        })),
      startJob: () =>
        set({
          phase: 'preparing',
          metrics: {
            ...DEFAULT_METRICS,
            phaseLabel: 'Preparing audio',
          },
          timeline: null,
          isCancelling: false,
          surface: null,
          result: {
            completionKind: null,
            outputPath: null,
            error: null,
          },
        }),
      updateMetrics: (metrics) =>
        set((state) => ({
          metrics: withPartialMetrics(state.metrics, metrics),
        })),
      setTimeline: (timeline) => set({ timeline }),
      setResult: (result) =>
        set((state) => ({
          result: {
            ...state.result,
            ...result,
          },
        })),
      completeJob: ({ completionKind, outputPath, framesRendered, totalFrames }) =>
        set((state) => ({
          phase: 'done',
          isCancelling: false,
          surface: null,
          metrics: {
            ...state.metrics,
            progress:
              totalFrames > 0 ? (framesRendered / totalFrames) * 100 : 0,
            phaseProgress: 100,
            phaseLabel:
              completionKind === 'complete'
                ? 'Render complete'
                : completionKind === 'partial'
                  ? 'Render stopped and finalized'
                  : 'Render cancelled',
            etaMs: 0,
            framesRendered,
            totalFrames,
          },
          timeline: null,
          result: {
            completionKind,
            outputPath: outputPath ?? null,
            error: null,
          },
        })),
      failJob: (error) =>
        set((state) => ({
          phase: 'error',
          isCancelling: false,
          timeline: null,
          surface: null,
          result: {
            completionKind: null,
            outputPath: null,
            error,
          },
          metrics: {
            ...state.metrics,
            phaseLabel: 'Render failed',
          },
        })),
      requestCancel: () =>
        set((state) => ({
          isCancelling: true,
          metrics: {
            ...state.metrics,
            phaseLabel:
              state.phase === 'finalizing' ? 'Finalizing render' : 'Stopping render',
          },
        })),
      resetJob: () =>
        set({
          phase: 'idle',
          metrics: DEFAULT_METRICS,
          timeline: null,
          isCancelling: false,
          surface: null,
          result: {
            completionKind: null,
            outputPath: null,
            error: null,
          },
        }),
      registerSurface: (surface) => set({ surface }),
    }),
    {
      name: 'muse-export-storage',
      partialize: (state) => ({
        settings: state.settings,
      }),
      merge: (persistedState, currentState) => {
        const baseState = currentState as ExportState
        const persistedSettings =
          persistedState &&
          typeof persistedState === 'object' &&
          'settings' in persistedState
            ? (persistedState as { settings?: ExportSettings }).settings
            : undefined

        return {
          ...baseState,
          settings: normalizeSettings(
            persistedSettings
              ? {
                  ...DEFAULT_SETTINGS,
                  ...persistedSettings,
                }
              : DEFAULT_SETTINGS,
          ),
        }
      },
    },
  ),
)

export function formatEtaLabel(etaMs: number | null): ReactNode {
  if (etaMs === null || Number.isNaN(etaMs)) {
    return 'Calculating'
  }

  const totalSeconds = Math.max(0, Math.round(etaMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${seconds}s`
}

export function getResolutionLabel(
  resolutionPreset: ResolutionPreset,
  width: number,
  height: number,
) {
  if (resolutionPreset === 'custom') {
    return `${width} x ${height}`
  }

  return `${width} x ${height}`
}
