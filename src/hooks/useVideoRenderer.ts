import { useCallback } from 'react'
import { prepareExportAudio } from '../lib/exportAudio'
import { useAudioStore } from '../store/useAudioStore'
import { formatEtaLabel, useExportStore } from '../store/useExportStore'
import type { FrameEncoding, RenderFinishResult } from '../types/export'

type ExportSurface = NonNullable<ReturnType<typeof useExportStore.getState>['surface']>

function captureFrame(
  canvas: HTMLCanvasElement,
  encoding: FrameEncoding,
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('Unable to capture frame from export surface'))
          return
        }

        try {
          resolve(await blob.arrayBuffer())
        } catch (error) {
          reject(error)
        }
      },
      encoding === 'png' ? 'image/png' : 'image/jpeg',
      encoding === 'png' ? undefined : 0.92,
    )
  })
}

function waitForBrowserPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

async function waitForSurface(timeoutMs = 5000) {
  const existing = useExportStore.getState().surface
  if (existing) {
    return existing
  }

  return new Promise<ExportSurface>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      unsubscribe()
      reject(new Error('Timed out while waiting for the export surface'))
    }, timeoutMs)

    const unsubscribe = useExportStore.subscribe((state) => {
      if (state.surface) {
        window.clearTimeout(timeoutId)
        unsubscribe()
        resolve(state.surface)
      }
    })
  })
}

function getFrameEncoding() {
  const { settings } = useExportStore.getState()
  return settings.transparent || settings.compression === 'lossless'
    ? 'png'
    : 'jpeg'
}

export function useVideoRenderer() {
  const settings = useExportStore((state) => state.settings)
  const phase = useExportStore((state) => state.phase)
  const metrics = useExportStore((state) => state.metrics)
  const result = useExportStore((state) => state.result)
  const isCancelling = useExportStore((state) => state.isCancelling)
  const startJob = useExportStore((state) => state.startJob)
  const setPhase = useExportStore((state) => state.setPhase)
  const updateMetrics = useExportStore((state) => state.updateMetrics)
  const setTimeline = useExportStore((state) => state.setTimeline)
  const setResult = useExportStore((state) => state.setResult)
  const completeJob = useExportStore((state) => state.completeJob)
  const failJob = useExportStore((state) => state.failJob)
  const requestCancel = useExportStore((state) => state.requestCancel)
  const resetJob = useExportStore((state) => state.resetJob)

  const startExport = useCallback(async () => {
    if (phase === 'preparing' || phase === 'rendering' || phase === 'finalizing') {
      return
    }

    const muse = window.muse
    if (!muse) {
      failJob('Muse export bridge is unavailable in this environment')
      return
    }

    const { currentTrack } = useAudioStore.getState()
    if (!currentTrack) {
      failJob('Load a track before starting export')
      return
    }

    startJob()

    const prepareStartedAt = performance.now()
    let startRenderSucceeded = false
    let finishRequested = false
    let framesRendered = 0
    let totalFrames = 0

    const finalizeRender = async (
      cancelled: boolean,
    ): Promise<RenderFinishResult | null> => {
      if (!muse || !startRenderSucceeded || finishRequested) {
        return null
      }

      finishRequested = true
      setPhase('finalizing')
      setTimeline(null)
      updateMetrics({
        phaseLabel: cancelled ? 'Finalizing stopped render' : 'Finalizing render',
        phaseProgress: 100,
        progress:
          totalFrames > 0
            ? Math.max(
                (framesRendered / totalFrames) * 100,
                15 + (framesRendered / totalFrames) * 80,
              )
            : 0,
        etaMs: null,
        framesRendered,
        totalFrames,
      })

      return muse.finishRender({ cancelled })
    }

    try {
      const preparedAudio = await prepareExportAudio({
        file: currentTrack,
        fps: settings.fps,
        shouldCancel: () => useExportStore.getState().isCancelling,
        onProgress: async (completed, total) => {
          const elapsedMs = performance.now() - prepareStartedAt
          const completionRatio = total === 0 ? 0 : completed / total
          const etaMs =
            completionRatio > 0
              ? (elapsedMs / completionRatio) * (1 - completionRatio)
              : null

          updateMetrics({
            phaseLabel: 'Preparing audio',
            phaseProgress: completionRatio * 100,
            progress: completionRatio * 15,
            elapsedMs,
            etaMs,
            totalFrames: total,
          })
        },
      })

      if (useExportStore.getState().isCancelling) {
        setTimeline(null)
        completeJob({
          completionKind: 'discarded',
          framesRendered: 0,
          totalFrames: useExportStore.getState().metrics.totalFrames,
        })
        return
      }

      totalFrames = Math.max(
        1,
        Math.ceil(preparedAudio.duration * settings.fps),
      )
      const surface = await waitForSurface()
      const startResult = await muse.startRender({
        audioPath: settings.includeAudio ? currentTrack.path ?? null : null,
        fps: settings.fps,
        format: settings.format,
        transparent: settings.format === 'webm' && settings.transparent,
        includeAudio: settings.includeAudio,
        width: settings.width,
        height: settings.height,
        profile: settings.profile,
        compression: settings.compression,
      })

      if (!startResult.success) {
        if (startResult.cancelled) {
          resetJob()
          return
        }
        throw new Error(startResult.error ?? 'Unable to start export')
      }

      startRenderSucceeded = true
      setResult({
        outputPath: startResult.outputPath,
        error: null,
      })
      setPhase('rendering')

      const renderStartedAt = performance.now()
      const frameEncoding = getFrameEncoding()

      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
        const cancelRequested = useExportStore.getState().isCancelling
        if (cancelRequested) {
          break
        }

        const elapsedMs = performance.now() - renderStartedAt
        const completedFrames = framesRendered
        const completionRatio =
          totalFrames === 0 ? 0 : completedFrames / totalFrames
        const etaMs =
          completedFrames > 0
            ? (elapsedMs / completedFrames) * (totalFrames - completedFrames)
            : null

        updateMetrics({
          phaseLabel: cancelRequested ? 'Stopping render' : 'Rendering frames',
          progress: 15 + completionRatio * 80,
          phaseProgress: completionRatio * 100,
          elapsedMs,
          etaMs,
          framesRendered: completedFrames,
          totalFrames,
        })

        setTimeline({
          frameIndex,
          totalFrames,
          fps: settings.fps,
          timeSeconds: Math.min(frameIndex / settings.fps, preparedAudio.duration),
          deltaSeconds: 1 / settings.fps,
          analyzerData: preparedAudio.analyzerFrames[frameIndex] ?? null,
        })

        surface.invalidate()
        await waitForBrowserPaint()

        const frameData = await captureFrame(surface.canvas, frameEncoding)
        const frameResult = await muse.sendFrame({
          data: frameData,
          encoding: frameEncoding,
        })

        if (!frameResult.success) {
          throw new Error(frameResult.error ?? 'Unable to write export frame')
        }

        framesRendered += 1
        updateMetrics({
          phaseLabel: 'Rendering frames',
          progress: 15 + (framesRendered / totalFrames) * 80,
          phaseProgress: (framesRendered / totalFrames) * 100,
          elapsedMs: performance.now() - renderStartedAt,
          etaMs:
            framesRendered > 0
              ? ((performance.now() - renderStartedAt) / framesRendered) *
                (totalFrames - framesRendered)
              : null,
          framesRendered,
          totalFrames,
        })
      }

      const wasCancelled = useExportStore.getState().isCancelling
      const finishResult = await finalizeRender(wasCancelled)
      if (!finishResult) {
        throw new Error('Unable to finalize export')
      }
      if (!finishResult.success) {
        throw new Error(finishResult.error ?? 'Unable to finalize export')
      }

      completeJob({
        completionKind: finishResult.completionKind,
        outputPath:
          finishResult.completionKind === 'discarded'
            ? null
            : finishResult.outputPath ?? startResult.outputPath,
        framesRendered,
        totalFrames,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to render export'
      if (message === 'Export cancelled') {
        setTimeline(null)
        completeJob({
          completionKind: 'discarded',
          framesRendered: 0,
          totalFrames: useExportStore.getState().metrics.totalFrames,
        })
        return
      }

      if (startRenderSucceeded && !finishRequested) {
        const cancelling = useExportStore.getState().isCancelling
        const finishResult = await finalizeRender(true)
        if (cancelling && finishResult?.success) {
          completeJob({
            completionKind: finishResult.completionKind,
            outputPath:
              finishResult.completionKind === 'discarded'
                ? null
                : finishResult.outputPath ?? result.outputPath,
            framesRendered,
            totalFrames,
          })
          return
        }
      }

      setTimeline(null)
      failJob(message)
    }
  }, [
    completeJob,
    failJob,
    phase,
    result.outputPath,
    setPhase,
    setResult,
    setTimeline,
    settings.compression,
    settings.format,
    settings.fps,
    settings.height,
    settings.includeAudio,
    settings.profile,
    settings.transparent,
    settings.width,
    startJob,
    updateMetrics,
  ])

  const stopExport = useCallback(() => {
    requestCancel()
  }, [requestCancel])

  const openOutputPath = useCallback(async () => {
    if (!result.outputPath || !window.muse) {
      return false
    }
    return window.muse.openPath(result.outputPath)
  }, [result.outputPath])

  const showOutputInFolder = useCallback(async () => {
    if (!result.outputPath || !window.muse) {
      return false
    }
    return window.muse.showItemInFolder(result.outputPath)
  }, [result.outputPath])

  return {
    phase,
    metrics,
    result,
    isRendering:
      phase === 'preparing' || phase === 'rendering' || phase === 'finalizing',
    isCancelling,
    etaLabel: formatEtaLabel(metrics.etaMs),
    startExport,
    stopExport,
    resetExport: resetJob,
    openOutputPath,
    showOutputInFolder,
  }
}
