import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useAudioAnalyzer } from "./audio/useAudioAnalyzer";
import { useVideoRenderer } from "./hooks/useVideoRenderer";
import { FilePicker } from "./components/shell/FilePicker";
import { Playbar } from "./components/shell/Playbar";
import { VisualizerLibrary } from "./components/shell/VisualizerLibrary";
import { VisualizerControlsSidebar } from "./components/shell/VisualizerControlsSidebar";
import { useAudioStore } from "./store/useAudioStore";
import { getVisualizerById } from "./visualizers/registry";

import { useState, useEffect } from "react";
import { SplashScreen } from "./components/shell/SplashScreen";

function App() {
  const { activeVisualizerId, setActiveVisualizerId } = useAudioStore();
  const activeModule = activeVisualizerId ? getVisualizerById(activeVisualizerId) : null;
  const [isLoading, setIsLoading] = useState(true);

  // Initialize audio engine
  useAudioAnalyzer();
  // Initialize video renderer background service
  useVideoRenderer();

  useEffect(() => {
    // Simulate loading time for resources/three.js initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col overflow-hidden relative font-sans antialiased selection:bg-primary/20">

      <AnimatePresence>
        {isLoading && <SplashScreen key="splash" />}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!activeVisualizerId ? (
          /* ==================== LIBRARY VIEW ==================== */
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
          /* ==================== ACTIVE VISUALIZER VIEW ==================== */
          <motion.main
            key="visualizer"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex-1 relative z-10 w-full h-full"
          >
            {/* Back Button */}
            <div className="absolute top-6 left-6 z-50">
              <button
                onClick={() => setActiveVisualizerId(null)}
                className="flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all group"
              >
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Library</span>
              </button>
            </div>

            {/* Quick File Picker */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <FilePicker className="shadow-2xl scale-90" />
            </div>

            {/* 3D Scene */}
            {activeModule && (
              <div className="absolute inset-0 w-full h-full">
                <activeModule.component />
                <VisualizerControlsSidebar ControlsComponent={activeModule.controls} />
              </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>

      {/* Global Playbar */}
      <div className="relative z-50">
        <Playbar />
      </div>

      {/* Background Ambience (Optional) */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-black pointer-events-none -z-10" />
    </div>
  );
}

export default App;
