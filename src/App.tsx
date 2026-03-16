import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import { useAudioAnalyzer } from './audio/useAudioAnalyzer'
import { FilePicker } from './components/shell/FilePicker'
import { Playbar } from './components/shell/Playbar'
import { SplashScreen } from './components/shell/SplashScreen'
import { VisualizerSurfaceProvider } from './components/shell/VisualizerSurfaceContext'
import { VisualizerControlsSidebar } from './components/shell/VisualizerControlsSidebar'
import { VisualizerLibrary } from './components/shell/VisualizerLibrary'
import { useAudioStore } from './store/useAudioStore'
import { useExportStore } from './store/useExportStore'
import { usePresetStore } from './store/usePresetStore'
import {
  getVisualizerManifestById,
} from './visualizers/registry'
import { loadCdPresetConfig } from './visualizers/CdSpinner/store'

function App() {
  const activeVisualizerId = useAudioStore((state) => state.activeVisualizerId)
  const setActiveVisualizerId = useAudioStore(
    (state) => state.setActiveVisualizerId,
  )
  const exportPhase = useExportStore((state) => state.phase)
  const exportSettings = useExportStore((state) => state.settings)
  const [isLoading, setIsLoading] = useState(true)
  const activeVisualizer = activeVisualizerId
    ? getVisualizerManifestById(activeVisualizerId)
    : null
  const ActiveVisualizerComponent = useMemo(
    () =>
      activeVisualizer
        ? lazy(activeVisualizer.loadComponent)
        : null,
    [activeVisualizer],
  )
  const ActiveControlsComponent = useMemo(
    () =>
      activeVisualizer
        ? lazy(activeVisualizer.loadControls)
        : null,
    [activeVisualizer],
  )

  useAudioAnalyzer()

  const shouldRenderExportSurface =
    exportPhase === 'preparing' ||
    exportPhase === 'rendering' ||
    exportPhase === 'finalizing'

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2500)

    // Auto-load "Default" or "Base" preset on initial app boot
    const presets = usePresetStore.getState().getPresetsForVisualizer('cd-spinner')
    const defaultPreset = presets.find(p => p.name.toLowerCase() === 'default' || p.name.toLowerCase() === 'base')
    
    if (defaultPreset) {
      const config = usePresetStore.getState().loadPreset(defaultPreset.id)
      if (config) {
        loadCdPresetConfig(config)
      }
    }

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden relative font-sans antialiased selection:bg-primary/20">
      <AnimatePresence>
        {isLoading && <SplashScreen key="splash" />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!activeVisualizerId ? (
          <motion.main
            key="library"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex-1 relative z-10"
          >
            <VisualizerLibrary />
          </motion.main>
        ) : (
          <motion.main
            key="visualizer"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex-1 relative z-10 w-full h-full"
          >
            <div className="absolute top-6 left-6 z-50">
              <button
                onClick={() => setActiveVisualizerId(null)}
                className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all group"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Library</span>
              </button>
            </div>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <FilePicker className="shadow-2xl scale-90" />
            </div>

            {ActiveVisualizerComponent && ActiveControlsComponent && (
              <Suspense fallback={null}>
                <div className="absolute inset-0 w-full h-full">
                  <VisualizerSurfaceProvider value="interactive">
                    <ActiveVisualizerComponent />
                  </VisualizerSurfaceProvider>
                  <VisualizerControlsSidebar
                    ControlsComponent={ActiveControlsComponent}
                  />
                </div>
              </Suspense>
            )}

            {shouldRenderExportSurface && ActiveVisualizerComponent && (
              <div
                className="pointer-events-none fixed -left-[200vw] top-0 overflow-hidden opacity-0"
                style={{
                  width: `${exportSettings.width}px`,
                  height: `${exportSettings.height}px`,
                }}
              >
                <Suspense fallback={null}>
                  <VisualizerSurfaceProvider value="export">
                    <ActiveVisualizerComponent />
                  </VisualizerSurfaceProvider>
                </Suspense>
              </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>

      <div className="relative z-50">
        <Playbar />
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-background to-black pointer-events-none -z-10" />
    </div>
  )
}

export default App
