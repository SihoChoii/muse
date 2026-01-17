import { create } from 'zustand';

interface AudioState {
    isPlaying: boolean;
    currentTrack: File | null;
    analyzerData: Uint8Array | null;
    volume: number;
    activeVisualizerId: string | null;

    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTrack: (track: File | null) => void;
    setAnalyzerData: (data: Uint8Array) => void;
    setVolume: (volume: number) => void;
    setActiveVisualizerId: (id: string | null) => void;

    // Video Export State
    isExporting: boolean;
    exportProgress: number;
    setIsExporting: (isExporting: boolean) => void;
    setExportProgress: (progress: number | ((prev: number) => number)) => void;

    // Playback Ref
    audioElement: HTMLAudioElement | null;
    setAudioElement: (element: HTMLAudioElement | null) => void;
}


export const useAudioStore = create<AudioState>((set) => ({
    isPlaying: false,
    currentTrack: null,
    analyzerData: null,
    volume: 1,
    activeVisualizerId: null,

    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentTrack: (currentTrack) => set({ currentTrack }),
    setAnalyzerData: (analyzerData) => set({ analyzerData }),
    setVolume: (volume) => set({ volume }),
    setActiveVisualizerId: (activeVisualizerId) => set({ activeVisualizerId }),

    isExporting: false,
    exportProgress: 0,
    setIsExporting: (isExporting) => set({ isExporting }),
    // Allow functional updates for progress
    setExportProgress: (progress) => set((state) => ({
        exportProgress: typeof progress === 'function' ? progress(state.exportProgress) : progress
    })),

    audioElement: null,
    setAudioElement: (audioElement) => set({ audioElement }),
}));
