import { create } from 'zustand'

export type ElectronFile = File

interface AudioState {
  isPlaying: boolean
  currentTrack: ElectronFile | null
  analyzerData: Uint8Array<ArrayBufferLike> | null
  uiAnalyzerData: Uint8Array<ArrayBufferLike> | null
  volume: number
  activeVisualizerId: string | null

  setIsPlaying: (isPlaying: boolean) => void
  setCurrentTrack: (track: ElectronFile | null) => void
  setAnalyzerData: (data: Uint8Array<ArrayBufferLike> | null) => void
  setUiAnalyzerData: (data: Uint8Array<ArrayBufferLike> | null) => void
  setVolume: (volume: number) => void
  setActiveVisualizerId: (id: string | null) => void

  audioElement: HTMLAudioElement | null
  setAudioElement: (element: HTMLAudioElement | null) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  isPlaying: false,
  currentTrack: null,
  analyzerData: null,
  uiAnalyzerData: null,
  volume: 1,
  activeVisualizerId: null,

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTrack: (currentTrack) => set({ currentTrack }),
  setAnalyzerData: (analyzerData) => set({ analyzerData }),
  setUiAnalyzerData: (uiAnalyzerData) => set({ uiAnalyzerData }),
  setVolume: (volume) => set({ volume }),
  setActiveVisualizerId: (activeVisualizerId) => set({ activeVisualizerId }),

  audioElement: null,
  setAudioElement: (audioElement) => set({ audioElement }),
}))
