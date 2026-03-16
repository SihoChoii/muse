import fs from 'node:fs'
import { PassThrough } from 'node:stream'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import type {
  CompressionMode,
  RenderCompletionKind,
  RenderProfile,
} from '../src/types/export'
import type { ExportFormat } from '../src/visualizers/CdSpinner/store'

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

interface VideoWriterStartOptions {
  outputPath: string
  audioPath: string | null
  fps: number
  format: ExportFormat
  transparent: boolean
  includeAudio: boolean
  profile: RenderProfile
  compression: CompressionMode
}

export class VideoWriter {
  private command: ffmpeg.FfmpegCommand | null = null
  private imageStream: PassThrough | null = null
  private finishPromise: Promise<void> | null = null
  private finishPromiseResolve: (() => void) | null = null
  private finishPromiseReject: ((error: Error) => void) | null = null
  private runtimeError: Error | null = null
  private started = false
  private outputPath: string | null = null
  private hasWrittenFrames = false

  async start({
    outputPath,
    audioPath,
    fps = 60,
    format,
    transparent,
    includeAudio,
    profile,
    compression,
  }: VideoWriterStartOptions): Promise<void> {
    if (this.command || this.imageStream) {
      throw new Error('A render is already in progress')
    }

    this.imageStream = new PassThrough()
    this.runtimeError = null
    this.started = false
    this.outputPath = outputPath
    this.hasWrittenFrames = false
    this.finishPromise = new Promise((resolve, reject) => {
      this.finishPromiseResolve = resolve
      this.finishPromiseReject = reject
    })

    const inputCodec = transparent ? 'png' : 'mjpeg'
    let command = ffmpeg()
      .input(this.imageStream)
      .inputOptions([`-r ${fps}`, '-f image2pipe', `-vcodec ${inputCodec}`])

    const shouldIncludeAudio = includeAudio && audioPath && fs.existsSync(audioPath)

    if (shouldIncludeAudio) {
      command = command.input(audioPath)
    }

    const outputOptions: string[] = []
    if (format === 'webm') {
      outputOptions.push('-c:v libvpx-vp9', '-auto-alt-ref 0')
      outputOptions.push(transparent ? '-pix_fmt yuva420p' : '-pix_fmt yuv420p')
      if (compression === 'lossless') {
        outputOptions.push('-lossless 1', '-deadline best', '-cpu-used 0')
      } else {
        outputOptions.push(
          profile === 'quality' ? '-deadline best' : '-deadline good',
          profile === 'quality' ? '-cpu-used 1' : '-cpu-used 4',
          '-crf 30',
          '-b:v 0',
        )
      }
      if (shouldIncludeAudio) {
        outputOptions.push('-c:a libopus')
      }
    } else {
      outputOptions.push('-c:v libx264', '-pix_fmt yuv420p', '-movflags +faststart')
      if (compression === 'lossless') {
        outputOptions.push('-preset slow', '-qp 0')
      } else {
        outputOptions.push(
          profile === 'quality' ? '-preset slow' : '-preset veryfast',
          profile === 'quality' ? '-crf 17' : '-crf 23',
        )
      }
      if (shouldIncludeAudio) {
        outputOptions.push('-c:a aac')
      }
    }

    this.command = command.output(outputPath).outputOptions(outputOptions)

    const startPromise = new Promise<void>((resolve, reject) => {
      this.command
        ?.once('start', () => {
          this.started = true
          resolve()
        })
        .once('error', (error) => {
          const normalizedError =
            error instanceof Error ? error : new Error('Unknown FFmpeg error')
          this.runtimeError = normalizedError
          if (this.started) {
            this.finishPromiseReject?.(normalizedError)
          } else {
            reject(normalizedError)
          }
          this.cleanup()
        })
        .once('end', () => {
          this.finishPromiseResolve?.()
          this.cleanup()
        })
    })

    this.command.run()
    await startPromise
  }

  writeFrame(data: Buffer, repeat: number): void {
    if (this.runtimeError) {
      throw this.runtimeError
    }

    if (!this.imageStream || this.imageStream.destroyed) {
      throw new Error('No active render stream')
    }

    for (let index = 0; index < repeat; index += 1) {
      this.imageStream.write(data)
    }
    this.hasWrittenFrames = true
  }

  async finish({
    cancelled,
  }: {
    cancelled: boolean
  }): Promise<{ completionKind: RenderCompletionKind; outputPath?: string }> {
    const command = this.command
    const imageStream = this.imageStream
    const finishPromise = this.finishPromise
    const outputPath = this.outputPath
    const hasWrittenFrames = this.hasWrittenFrames

    if (!command || !imageStream || !finishPromise) {
      this.cleanup()
      return { completionKind: cancelled ? 'discarded' : 'complete', outputPath: outputPath ?? undefined }
    }

    if (cancelled && !hasWrittenFrames) {
      imageStream.end()
      await finishPromise.catch(() => undefined)
      if (outputPath && fs.existsSync(outputPath)) {
        await fs.promises.unlink(outputPath).catch(() => undefined)
      }
      this.cleanup()
      return { completionKind: 'discarded' }
    }

    if (this.runtimeError) {
      const error = this.runtimeError
      this.cleanup()
      throw error
    }

    imageStream.end()
    await finishPromise
    return {
      completionKind: cancelled ? 'partial' : 'complete',
      outputPath: outputPath ?? undefined,
    }
  }

  private cleanup(): void {
    this.command = null
    this.imageStream = null
    this.finishPromise = null
    this.finishPromiseResolve = null
    this.finishPromiseReject = null
    this.started = false
    this.outputPath = null
    this.hasWrittenFrames = false
    this.runtimeError = null
  }
}
