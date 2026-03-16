import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAudioStore } from '../../store/useAudioStore'
import { useCdStore } from './store'
import { useAudioReactor } from './useAudioReactor'

function useCanvasSize() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 300, height: 200 })

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) {
        return
      }

      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        setSize({ width: Math.floor(width), height: Math.floor(height) })
      }
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return { containerRef, canvasRef, size }
}

const MIN_LOG_HZ = 20
const MAX_LOG_HZ = 22050
const LOG_MIN_VAL = Math.log10(MIN_LOG_HZ)
const LOG_MAX_VAL = Math.log10(MAX_LOG_HZ)
const LOG_RANGE = LOG_MAX_VAL - LOG_MIN_VAL
const UI_FPS = 30
const HISTORY_LENGTH = 150

const ControlKnob = ({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (val: number) => void
  min: number
  max: number
  step: number
}) => (
  <div className="flex flex-col gap-1">
    <div className="flex justify-between items-center px-1">
      <span className="text-[10px] uppercase text-white/50 tracking-wider font-semibold">
        {label}
      </span>
      <span className="text-[10px] font-mono text-white/90">
        {value.toFixed(2)}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(parseFloat(event.target.value))}
      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-blue-400 transition-colors"
    />
  </div>
)

function freqToX(hz: number, width: number) {
  const safeHz = Math.max(MIN_LOG_HZ, Math.min(MAX_LOG_HZ, hz))
  const logHz = Math.log10(safeHz)
  const normalized = (logHz - LOG_MIN_VAL) / LOG_RANGE
  return normalized * width
}

function xToFreq(x: number, width: number) {
  const normalized = x / Math.max(width, 1)
  const logHz = normalized * LOG_RANGE + LOG_MIN_VAL
  return Math.pow(10, logHz)
}

function drawStaticBackdrop(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const context = canvas.getContext('2d')
  if (!context) {
    return
  }

  const halfHeight = height * 0.6
  const oscY = halfHeight
  const oscH = height - halfHeight

  context.clearRect(0, 0, width, height)

  context.fillStyle = '#09090b'
  context.fillRect(0, 0, width, halfHeight)

  context.strokeStyle = '#222'
  context.lineWidth = 1
  context.beginPath()
  ;[100, 1000, 10000].forEach((hz) => {
    const x = freqToX(hz, width)
    context.moveTo(x, 0)
    context.lineTo(x, halfHeight)
  })
  context.stroke()

  context.fillStyle = '#000'
  context.fillRect(0, oscY, width, oscH)

  context.strokeStyle = '#333'
  context.beginPath()
  context.moveTo(0, oscY)
  context.lineTo(width, oscY)
  context.stroke()
}

function createFrequencyColumnMap(width: number, binCount: number) {
  const sampleRate = 44100
  const hzPerBin = sampleRate / 2 / Math.max(binCount, 1)
  const startBins = new Int16Array(width)
  const endBins = new Int16Array(width)

  for (let x = 0; x < width; x += 1) {
    const startBin = Math.floor(xToFreq(x, width) / hzPerBin)
    const endBin = Math.ceil(xToFreq(x + 1, width) / hzPerBin)
    startBins[x] = Math.max(0, Math.min(startBin, binCount - 1))
    endBins[x] = Math.max(0, Math.min(endBin, binCount))
  }

  return { startBins, endBins }
}

export function ReactivityPanel() {
  const { containerRef, canvasRef, size } = useCanvasSize()
  const { uiAnalyzerData, isPlaying } = useAudioStore(
    useShallow((state) => ({
      uiAnalyzerData: state.uiAnalyzerData,
      isPlaying: state.isPlaying,
    })),
  )
  const { audioReactiveSettings, setAudioReactiveSettings } = useCdStore(
    useShallow((state) => ({
      audioReactiveSettings: state.audioReactiveSettings,
      setAudioReactiveSettings: state.setAudioReactiveSettings,
    })),
  )
  const signal = useAudioReactor(uiAnalyzerData, audioReactiveSettings)

  const historyRef = useRef<{ raw: number[]; processed: number[] }>({
    raw: new Array(HISTORY_LENGTH).fill(0),
    processed: new Array(HISTORY_LENGTH).fill(0),
  })
  const staticBackdropRef = useRef<HTMLCanvasElement | null>(null)
  const lastDrawTimestampRef = useRef(0)

  const [dragging, setDragging] = useState<
    'move' | 'resize-left' | 'resize-right' | null
  >(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialRange, setInitialRange] = useState<[number, number]>([0, 0])

  const frequencyColumnMap = useMemo(
    () =>
      createFrequencyColumnMap(size.width, uiAnalyzerData?.length ?? 1024),
    [size.width, uiAnalyzerData?.length],
  )

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    drawStaticBackdrop(canvas, size.width, size.height)
    staticBackdropRef.current = canvas
  }, [size.height, size.width])

  useEffect(() => {
    const history = historyRef.current
    let rawAverage = 0

    if (uiAnalyzerData) {
      const binCount = uiAnalyzerData.length
      const hzPerBin = 44100 / 2 / Math.max(binCount, 1)
      const [minHz, maxHz] = audioReactiveSettings.frequencyRange
      const startBin = Math.floor(minHz / hzPerBin)
      const endBin = Math.ceil(maxHz / hzPerBin)
      const safeStart = Math.max(0, Math.min(startBin, binCount - 1))
      const safeEnd = Math.max(0, Math.min(endBin, binCount - 1))

      let sum = 0
      for (let index = safeStart; index <= Math.max(safeStart, safeEnd); index += 1) {
        sum += uiAnalyzerData[index]
      }

      const count = Math.max(safeStart, safeEnd) - safeStart + 1
      rawAverage = count > 0 ? (sum / count / 255) * audioReactiveSettings.gain : 0
    }

    history.raw.push(rawAverage)
    history.raw.shift()
    history.processed.push(signal)
    history.processed.shift()
  }, [audioReactiveSettings, signal, uiAnalyzerData])

  useEffect(() => {
    const canvas = canvasRef.current
    const backdrop = staticBackdropRef.current
    if (!canvas || !backdrop) {
      return
    }

    const now = performance.now()
    if (
      uiAnalyzerData &&
      lastDrawTimestampRef.current !== 0 &&
      now - lastDrawTimestampRef.current < 1000 / UI_FPS
    ) {
      return
    }
    lastDrawTimestampRef.current = now

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const { width, height } = size
    const halfHeight = height * 0.6
    const oscY = halfHeight
    const oscH = height - halfHeight

    context.clearRect(0, 0, width, height)
    context.drawImage(backdrop, 0, 0)

    if (uiAnalyzerData) {
      context.beginPath()
      context.moveTo(0, halfHeight)

      for (let x = 0; x < width; x += 1) {
        const startBin = frequencyColumnMap.startBins[x]
        const endBin = Math.max(startBin + 1, frequencyColumnMap.endBins[x])
        let maxValue = 0

        for (let bin = startBin; bin < endBin; bin += 1) {
          maxValue = Math.max(maxValue, uiAnalyzerData[bin] ?? 0)
        }

        const columnHeight = (maxValue / 255) * (halfHeight - 10)
        context.lineTo(x, halfHeight - columnHeight)
      }

      context.lineTo(width, halfHeight)
      context.fillStyle = '#3f3f46'
      context.fill()
    }

    const [minHz, maxHz] = audioReactiveSettings.frequencyRange
    const xMin = freqToX(minHz, width)
    const xMax = freqToX(maxHz, width)
    const xCenter = freqToX(Math.sqrt(minHz * maxHz), width)

    const gradient = context.createLinearGradient(xMin, 0, xMax, 0)
    gradient.addColorStop(0, 'rgba(234, 179, 8, 0.0)')
    gradient.addColorStop(0.2, 'rgba(234, 179, 8, 0.2)')
    gradient.addColorStop(0.8, 'rgba(234, 179, 8, 0.2)')
    gradient.addColorStop(1, 'rgba(234, 179, 8, 0.0)')

    context.fillStyle = gradient
    context.fillRect(xMin, 0, xMax - xMin, halfHeight)

    context.strokeStyle = '#eab308'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(0, halfHeight)
    context.bezierCurveTo(xMin * 0.8, halfHeight, xMin, halfHeight, xMin, 10)
    context.lineTo(xMax, 10)
    context.bezierCurveTo(
      xMax,
      halfHeight,
      xMax + (width - xMax) * 0.2,
      halfHeight,
      width,
      halfHeight,
    )
    context.stroke()

    context.fillStyle = 'rgba(255, 255, 255, 0.5)'
    context.fillRect(xMin - 2, 10, 4, halfHeight - 10)
    context.fillRect(xMax - 2, 10, 4, halfHeight - 10)

    context.beginPath()
    context.arc(xCenter, halfHeight / 2, 6, 0, Math.PI * 2)
    context.fillStyle = '#eab308'
    context.fill()
    context.strokeStyle = '#ffffff'
    context.lineWidth = 2
    context.stroke()

    context.fillStyle = '#eab308'
    context.font = '10px monospace'
    context.textAlign = 'center'
    context.fillText(
      `${Math.round(minHz)} - ${Math.round(maxHz)} Hz`,
      xCenter,
      halfHeight / 2 - 12,
    )

    const mapY = (value: number) => {
      const clamped = Math.min(1.2, Math.max(0, value))
      const visual = Math.pow(clamped, 0.5)
      return height - 5 - visual * (oscH - 10)
    }

    const history = historyRef.current
    const pointCount = history.raw.length
    const stepX = width / Math.max(pointCount - 1, 1)

    context.strokeStyle = '#555'
    context.setLineDash([4, 4])
    context.beginPath()
    const thresholdY = mapY(audioReactiveSettings.threshold)
    context.moveTo(0, thresholdY)
    context.lineTo(width, thresholdY)
    context.stroke()
    context.setLineDash([])

    context.strokeStyle = '#444'
    context.lineWidth = 1
    context.beginPath()
    for (let index = 0; index < pointCount; index += 1) {
      const x = index * stepX
      const y = mapY(history.raw[index])
      if (index === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }
    context.stroke()

    context.strokeStyle = signal > 0.01 ? '#eab308' : '#854d0e'
    context.lineWidth = 2
    context.beginPath()
    for (let index = 0; index < pointCount; index += 1) {
      const x = index * stepX
      const y = mapY(history.processed[index])
      if (index === 0) {
        context.moveTo(x, y)
      } else {
        context.lineTo(x, y)
      }
    }
    context.stroke()

    context.fillStyle = '#eab308'
    context.textAlign = 'left'
    context.fillText(`OUT: ${signal.toFixed(2)}`, 6, oscY + oscH - 6)
  }, [
    audioReactiveSettings,
    canvasRef,
    frequencyColumnMap,
    signal,
    size,
    uiAnalyzerData,
  ])

  const handleMouseDown = (event: ReactMouseEvent) => {
    if (!canvasRef.current || !size.width) {
      return
    }

    const rect = canvasRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (y > size.height * 0.6) {
      return
    }

    const [minHz, maxHz] = audioReactiveSettings.frequencyRange
    const xMin = freqToX(minHz, size.width)
    const xMax = freqToX(maxHz, size.width)
    const xCenter = freqToX(Math.sqrt(minHz * maxHz), size.width)
    const hitTolerance = 10

    if (Math.abs(x - xMin) < hitTolerance) {
      setDragging('resize-left')
    } else if (Math.abs(x - xMax) < hitTolerance) {
      setDragging('resize-right')
    } else if (Math.abs(x - xCenter) < 20) {
      setDragging('move')
    } else {
      const clickedHz = xToFreq(x, size.width)
      const ratio = maxHz / minHz
      const newMin = clickedHz / Math.sqrt(ratio)
      const newMax = clickedHz * Math.sqrt(ratio)
      setAudioReactiveSettings({ frequencyRange: [newMin, newMax] })
      setDragging('move')
    }

    setDragStart({ x: event.clientX, y: event.clientY })
    setInitialRange(audioReactiveSettings.frequencyRange)
  }

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragging || !size.width || !canvasRef.current) {
        return
      }

      const rect = canvasRef.current.getBoundingClientRect()
      const currentX = event.clientX - rect.left
      const currentHz = xToFreq(currentX, size.width)
      const deltaX = event.clientX - dragStart.x
      const [startMin, startMax] = initialRange

      if (dragging === 'move') {
        const startCenterHz = Math.sqrt(startMin * startMax)
        const startCenterX = freqToX(startCenterHz, size.width)
        const newCenterX = startCenterX + deltaX
        const newCenterHz = xToFreq(newCenterX, size.width)
        const ratio = startMax / startMin

        let newMin = newCenterHz / Math.sqrt(ratio)
        let newMax = newCenterHz * Math.sqrt(ratio)

        if (newMin < MIN_LOG_HZ) {
          newMin = MIN_LOG_HZ
          newMax = newMin * ratio
        }
        if (newMax > MAX_LOG_HZ) {
          newMax = MAX_LOG_HZ
          newMin = newMax / ratio
        }

        setAudioReactiveSettings({ frequencyRange: [newMin, newMax] })
        return
      }

      const [currentMin, currentMax] = audioReactiveSettings.frequencyRange

      if (dragging === 'resize-left') {
        let newMin = currentHz
        if (newMin < MIN_LOG_HZ) {
          newMin = MIN_LOG_HZ
        }
        if (newMin > currentMax * 0.9) {
          newMin = currentMax * 0.9
        }
        setAudioReactiveSettings({ frequencyRange: [newMin, currentMax] })
        return
      }

      let newMax = currentHz
      if (newMax > MAX_LOG_HZ) {
        newMax = MAX_LOG_HZ
      }
      if (newMax < currentMin * 1.1) {
        newMax = currentMin * 1.1
      }
      setAudioReactiveSettings({ frequencyRange: [currentMin, newMax] })
    },
    [
      audioReactiveSettings.frequencyRange,
      canvasRef,
      dragStart.x,
      dragging,
      initialRange,
      setAudioReactiveSettings,
      size.width,
    ],
  )

  const handleWheel = (event: React.WheelEvent) => {
    const [currentMin, currentMax] = audioReactiveSettings.frequencyRange
    const centerHz = Math.sqrt(currentMin * currentMax)
    const ratio = currentMax / currentMin
    const factor = 1 + event.deltaY * 0.001

    let newRatio = ratio * factor
    if (newRatio < 1.01) {
      newRatio = 1.01
    }
    if (newRatio > 1000) {
      newRatio = 1000
    }

    let newMin = centerHz / Math.sqrt(newRatio)
    let newMax = centerHz * Math.sqrt(newRatio)

    if (newMin < MIN_LOG_HZ) {
      newMin = MIN_LOG_HZ
    }
    if (newMax > MAX_LOG_HZ) {
      newMax = MAX_LOG_HZ
    }

    setAudioReactiveSettings({ frequencyRange: [newMin, newMax] })
  }

  useEffect(() => {
    if (!dragging) {
      return
    }

    const handleMouseUp = () => setDragging(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, handleMouseMove])

  return (
    <div className="space-y-4">
      <div
        ref={containerRef}
        className="relative h-48 w-full border border-white/10 rounded-lg overflow-hidden bg-black shadow-lg"
      >
        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
          {!isPlaying && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] text-white/50 backdrop-blur-sm pointer-events-none">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
              No audio playing
            </div>
          )}
          <div className="text-[10px] text-white/30 font-mono pointer-events-none">
            Scroll to adjust Width
          </div>
        </div>
        <canvas
          ref={canvasRef}
          width={size.width}
          height={size.height}
          className="block cursor-crosshair touch-none select-none"
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
        <ControlKnob
          label="Threshold"
          value={audioReactiveSettings.threshold}
          onChange={(value) => setAudioReactiveSettings({ threshold: value })}
          min={0}
          max={1}
          step={0.01}
        />
        <ControlKnob
          label="Gain"
          value={audioReactiveSettings.gain}
          onChange={(value) => setAudioReactiveSettings({ gain: value })}
          min={0.5}
          max={5}
          step={0.1}
        />
        <ControlKnob
          label="Attack"
          value={audioReactiveSettings.attack}
          onChange={(value) => setAudioReactiveSettings({ attack: value })}
          min={0.01}
          max={1}
          step={0.01}
        />
        <ControlKnob
          label="Release"
          value={audioReactiveSettings.release}
          onChange={(value) => setAudioReactiveSettings({ release: value })}
          min={0.01}
          max={1}
          step={0.01}
        />
        <div className="col-span-2 h-px bg-white/5 my-1" />
        <ControlKnob
          label="Scale Impact"
          value={audioReactiveSettings.scaleSensitivity ?? 0.2}
          onChange={(value) =>
            setAudioReactiveSettings({ scaleSensitivity: value })
          }
          min={0}
          max={1}
          step={0.01}
        />
        <ControlKnob
          label="Speed Impact"
          value={audioReactiveSettings.rotationSensitivity ?? 0.1}
          onChange={(value) =>
            setAudioReactiveSettings({ rotationSensitivity: value })
          }
          min={0}
          max={1}
          step={0.01}
        />
      </div>
    </div>
  )
}
