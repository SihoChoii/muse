import { useEffect, useRef } from 'react'
import { useAudioStore } from '../store/useAudioStore'

type AudioContextConstructor = typeof AudioContext

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: AudioContextConstructor
}

export const useAudioAnalyzer = () => {
  const currentTrack = useAudioStore((state) => state.currentTrack)
  const isPlaying = useAudioStore((state) => state.isPlaying)
  const volume = useAudioStore((state) => state.volume)
  const setAnalyzerData = useAudioStore((state) => state.setAnalyzerData)
  const setUiAnalyzerData = useAudioStore((state) => state.setUiAnalyzerData)
  const setIsPlaying = useAudioStore((state) => state.setIsPlaying)
  const setAudioElement = useAudioStore((state) => state.setAudioElement)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const rafIdRef = useRef<number | null>(null)
  const analyzerBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const lastUiSyncRef = useRef(0)

  useEffect(() => {
    if (!currentTrack) {
      setAnalyzerData(null)
      setUiAnalyzerData(null)
      return undefined
    }

    void audioContextRef.current?.close().catch(console.error)
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    const objectUrl = URL.createObjectURL(currentTrack)
    objectUrlRef.current = objectUrl

    const audio = new Audio(objectUrl)
    audioElementRef.current = audio
    setAudioElement(audio)
    audio.volume = volume
    audio.loop = false
    audio.onended = () => {
      setIsPlaying(false)
    }

    const AudioContextCtor =
      window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext
    if (!AudioContextCtor) {
      setAnalyzerData(null)
      setUiAnalyzerData(null)
      return () => {
        audio.pause()
        audio.removeAttribute('src')
        setAudioElement(null)
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
        }
      }
    }

    const audioContext = new AudioContextCtor()
    audioContextRef.current = audioContext

    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 2048
    analyserRef.current = analyser
    analyzerBufferRef.current = new Uint8Array(
      analyser.frequencyBinCount,
    ) as Uint8Array<ArrayBuffer>
    setAnalyzerData(analyzerBufferRef.current)

    try {
      const source = audioContext.createMediaElementSource(audio)
      audioSourceRef.current = source
      source.connect(analyser)
      analyser.connect(audioContext.destination)
    } catch (error) {
      console.error('Error creating MediaElementSource:', error)
    }

    setIsPlaying(true)

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      audio.pause()
      audio.removeAttribute('src')
      audioElementRef.current = null
      analyzerBufferRef.current = null
      setAnalyzerData(null)
      setUiAnalyzerData(null)
      setAudioElement(null)
      void audioContext.close().catch(console.error)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [
    currentTrack,
    setAnalyzerData,
    setAudioElement,
    setIsPlaying,
    setUiAnalyzerData,
    volume,
  ])

  useEffect(() => {
    const audio = audioElementRef.current
    const audioContext = audioContextRef.current
    if (!audio) {
      return
    }

    if (isPlaying) {
      if (audioContext?.state === 'suspended') {
        void audioContext.resume()
      }

      void audio.play().catch((error) => console.error('Play failed:', error))

      const updateLoop = () => {
        const analyser = analyserRef.current
        const buffer = analyzerBufferRef.current
        if (!analyser || !buffer) {
          return
        }

        analyser.getByteFrequencyData(buffer)
        const now = performance.now()
        if (now - lastUiSyncRef.current >= 1000 / 30) {
          lastUiSyncRef.current = now
          setUiAnalyzerData(buffer.slice())
        }
        rafIdRef.current = requestAnimationFrame(updateLoop)
      }

      if (rafIdRef.current === null) {
        updateLoop()
      }
      return
    }

    audio.pause()
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
  }, [isPlaying, setUiAnalyzerData])

  useEffect(() => {
    if (audioElementRef.current) {
      audioElementRef.current.volume = volume
    }
  }, [volume])
}
