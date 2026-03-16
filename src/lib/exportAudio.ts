const FFT_SIZE = 2048
const BIN_COUNT = FFT_SIZE / 2
const MIN_DECIBELS = -100
const MAX_DECIBELS = -30

type AudioContextConstructor = typeof AudioContext

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: AudioContextConstructor
}

interface BuildAnalyzerFramesOptions {
  file: File
  fps: number
  onProgress?: (completed: number, total: number) => void | Promise<void>
  shouldCancel?: () => boolean
}

export interface PreparedExportAudio {
  duration: number
  analyzerFrames: Uint8Array<ArrayBuffer>[]
}

class FFTProcessor {
  private readonly size: number
  private readonly bits: number
  private readonly bitReversal: Uint32Array
  private readonly cosTable: Float32Array
  private readonly sinTable: Float32Array
  private readonly real: Float32Array
  private readonly imag: Float32Array

  constructor(size: number) {
    this.size = size
    this.bits = Math.log2(size)
    this.bitReversal = new Uint32Array(size)
    this.cosTable = new Float32Array(size / 2)
    this.sinTable = new Float32Array(size / 2)
    this.real = new Float32Array(size)
    this.imag = new Float32Array(size)

    for (let index = 0; index < size; index += 1) {
      this.bitReversal[index] = reverseBits(index, this.bits)
    }

    for (let index = 0; index < size / 2; index += 1) {
      const angle = (-2 * Math.PI * index) / size
      this.cosTable[index] = Math.cos(angle)
      this.sinTable[index] = Math.sin(angle)
    }
  }

  computeMagnitude(windowedSamples: Float32Array, output: Float32Array) {
    for (let index = 0; index < this.size; index += 1) {
      const reversedIndex = this.bitReversal[index]
      this.real[index] = windowedSamples[reversedIndex]
      this.imag[index] = 0
    }

    for (let size = 2; size <= this.size; size <<= 1) {
      const halfSize = size / 2
      const tableStep = this.size / size

      for (let offset = 0; offset < this.size; offset += size) {
        for (let index = 0; index < halfSize; index += 1) {
          const tableIndex = index * tableStep
          const evenIndex = offset + index
          const oddIndex = evenIndex + halfSize

          const tempReal =
            this.real[oddIndex] * this.cosTable[tableIndex] -
            this.imag[oddIndex] * this.sinTable[tableIndex]
          const tempImag =
            this.real[oddIndex] * this.sinTable[tableIndex] +
            this.imag[oddIndex] * this.cosTable[tableIndex]

          this.real[oddIndex] = this.real[evenIndex] - tempReal
          this.imag[oddIndex] = this.imag[evenIndex] - tempImag
          this.real[evenIndex] += tempReal
          this.imag[evenIndex] += tempImag
        }
      }
    }

    for (let index = 0; index < BIN_COUNT; index += 1) {
      const real = this.real[index]
      const imag = this.imag[index]
      output[index] = Math.hypot(real, imag)
    }
  }
}

function reverseBits(value: number, bits: number) {
  let reversed = 0
  for (let index = 0; index < bits; index += 1) {
    reversed = (reversed << 1) | (value & 1)
    value >>= 1
  }
  return reversed
}

function createWindowFunction(size: number) {
  const windowValues = new Float32Array(size)
  for (let index = 0; index < size; index += 1) {
    windowValues[index] = 0.5 * (1 - Math.cos((2 * Math.PI * index) / (size - 1)))
  }
  return windowValues
}

function createMixdownBuffer(audioBuffer: AudioBuffer) {
  const mixed = new Float32Array(audioBuffer.length)
  const channels = audioBuffer.numberOfChannels

  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex)
    for (let sampleIndex = 0; sampleIndex < audioBuffer.length; sampleIndex += 1) {
      mixed[sampleIndex] += channelData[sampleIndex] / channels
    }
  }

  return mixed
}

function magnitudesToUint8(
  magnitudes: Float32Array,
  target: Uint8Array<ArrayBuffer>,
  fftSize: number,
) {
  for (let index = 0; index < BIN_COUNT; index += 1) {
    const normalizedMagnitude = magnitudes[index] / fftSize
    const decibels = 20 * Math.log10(normalizedMagnitude + 1e-12)
    const clamped = Math.min(MAX_DECIBELS, Math.max(MIN_DECIBELS, decibels))
    const byteValue =
      ((clamped - MIN_DECIBELS) / (MAX_DECIBELS - MIN_DECIBELS)) * 255
    target[index] = Math.round(byteValue)
  }
}

function createAudioContextForDecode() {
  const AudioContextCtor =
    window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext
  if (!AudioContextCtor) {
    throw new Error('Web Audio API is unavailable in this environment')
  }
  return new AudioContextCtor()
}

export async function prepareExportAudio({
  file,
  fps,
  onProgress,
  shouldCancel,
}: BuildAnalyzerFramesOptions): Promise<PreparedExportAudio> {
  const audioContext = createAudioContextForDecode()
  try {
    const fileBuffer = await file.arrayBuffer()
    if (shouldCancel?.()) {
      throw new Error('Export cancelled')
    }

    const audioBuffer = await audioContext.decodeAudioData(fileBuffer.slice(0))
    const duration = audioBuffer.duration
    const totalFrames = Math.max(1, Math.ceil(duration * fps))
    const analyzerFrames: Uint8Array<ArrayBuffer>[] = new Array(totalFrames)
    const mixed = createMixdownBuffer(audioBuffer)
    const fft = new FFTProcessor(FFT_SIZE)
    const windowValues = createWindowFunction(FFT_SIZE)
    const sampleWindow = new Float32Array(FFT_SIZE)
    const magnitudes = new Float32Array(BIN_COUNT)

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
      if (shouldCancel?.()) {
        throw new Error('Export cancelled')
      }

      const startSample = Math.floor((frameIndex / fps) * audioBuffer.sampleRate)
      for (let sampleIndex = 0; sampleIndex < FFT_SIZE; sampleIndex += 1) {
        const sourceIndex = startSample + sampleIndex
        const sampleValue =
          sourceIndex < mixed.length ? mixed[sourceIndex] : 0
        sampleWindow[sampleIndex] = sampleValue * windowValues[sampleIndex]
      }

      fft.computeMagnitude(sampleWindow, magnitudes)
      const analyzerData = new Uint8Array(BIN_COUNT) as Uint8Array<ArrayBuffer>
      magnitudesToUint8(magnitudes, analyzerData, FFT_SIZE)
      analyzerFrames[frameIndex] = analyzerData

      if (frameIndex % 8 === 0) {
        await onProgress?.(frameIndex + 1, totalFrames)
        await new Promise<void>((resolve) => {
          window.setTimeout(resolve, 0)
        })
      }
    }

    await onProgress?.(totalFrames, totalFrames)

    return {
      duration,
      analyzerFrames,
    }
  } finally {
    await audioContext.close().catch(() => undefined)
  }
}
