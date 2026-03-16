import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { ArrowUpFromLine, Disc, Disc3 } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { cn } from '../../lib/utils'
import { useAudioStore } from '../../store/useAudioStore'
import { useExportStore } from '../../store/useExportStore'

interface LoadButtonProps {
    className?: string;
}

export function LoadButton({ className }: LoadButtonProps) {
    const exportPhase = useExportStore((state) => state.phase)
    const resetExport = useExportStore((state) => state.resetJob)
    const {
        currentTrack,
        audioElement,
        setCurrentTrack,
        setIsPlaying,
        setAnalyzerData,
        setUiAnalyzerData,
        setAudioElement,
    } = useAudioStore(useShallow((state) => ({
        currentTrack: state.currentTrack,
        audioElement: state.audioElement,
        setCurrentTrack: state.setCurrentTrack,
        setIsPlaying: state.setIsPlaying,
        setAnalyzerData: state.setAnalyzerData,
        setUiAnalyzerData: state.setUiAnalyzerData,
        setAudioElement: state.setAudioElement,
    })))
    const inputRef = useRef<HTMLInputElement>(null)
    const [isHovered, setIsHovered] = useState(false)
    const isLoaded = Boolean(currentTrack)
    const isExporting =
        exportPhase === 'preparing' ||
        exportPhase === 'rendering' ||
        exportPhase === 'finalizing'
    const controls = useAnimation()

    useEffect(() => {
        if (isLoaded) {
            controls.start({
                rotate: 360,
                transition: {
                    repeat: Infinity,
                    ease: "linear",
                    duration: 4
                }
            })
        } else {
            controls.stop()
            controls.set({ rotate: 0 })
        }
    }, [controls, isLoaded])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            resetExport();
            setCurrentTrack(e.target.files[0]);
            setIsPlaying(true);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation()

        if (isExporting) {
            return
        }

        if (isLoaded) {
            if (audioElement) {
                audioElement.pause()
                audioElement.removeAttribute('src')
            }

            setIsPlaying(false)
            setCurrentTrack(null)
            setAnalyzerData(null)
            setUiAnalyzerData(null)
            setAudioElement(null)
            resetExport()
            if (inputRef.current) {
                inputRef.current.value = ''
            }
        } else {
            inputRef.current?.click()
        }
    }

    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
            />

            <motion.button
                onClick={handleClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "relative group pointer-events-auto flex items-center justify-center",
                    "w-32 h-32 rounded-full", // Hit area
                    "focus:outline-none transition-colors duration-500",
                    isLoaded ? "bg-cyan-500/10" : "bg-transparent hover:bg-white/5" // Subtle background interact
                )}
                whileHover={isExporting ? undefined : { scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                {isLoaded && (
                    <motion.div
                        className="absolute inset-0 rounded-full blur-xl bg-cyan-500/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}

                {!isLoaded && (
                    <motion.div
                        className="absolute inset-0"
                        animate={{ rotate: isHovered ? 360 : 0 }}
                        transition={{
                            duration: isHovered ? 8 : 0.5,
                            ease: isHovered ? "linear" : "easeOut",
                            repeat: isHovered ? Infinity : 0
                        }}
                    >
                        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                            <path
                                id="curve"
                                d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                                fill="transparent"
                            />
                            <text className="fill-white/70 text-[10px] uppercase font-bold tracking-widest pointer-events-none select-none">
                                <textPath xlinkHref="#curve" startOffset="0%">
                                    Load Audio • Load Audio • Load Audio •
                                </textPath>
                            </text>
                        </svg>
                    </motion.div>
                )}

                <div className="relative z-10 p-4 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 shadow-xl">
                    {isLoaded ? (
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <div className="relative z-10 transition-opacity">
                                {isHovered ? (
                                    <ArrowUpFromLine className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                                ) : (
                                    <Disc3 className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                )}
                            </div>
                        </div>
                    ) : (
                        <motion.div
                            animate={{ rotate: isHovered ? 360 : 0 }}
                            transition={{
                                duration: 2,
                                ease: isHovered ? "easeIn" : "easeOut",
                                repeat: isHovered ? Infinity : 0
                            }}
                        >
                            <Disc className="w-8 h-8 text-white/80" strokeWidth={1.5} />
                        </motion.div>
                    )}
                </div>
            </motion.button>
        </div>
    );
}
