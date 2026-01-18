import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Disc3, ArrowUpFromLine, Disc } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { cn } from '../../lib/utils';

interface LoadButtonProps {
    className?: string;
}

export function LoadButton({ className }: LoadButtonProps) {
    const { currentTrack, setCurrentTrack, setIsPlaying, setAnalyzerData, setAudioElement } = useAudioStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    // Internal state to track if we believe we are loaded, 
    // though we should rely on currentTrack from store.
    const isLoaded = !!currentTrack;

    // Animation Controls
    const controls = useAnimation();

    // Create a motion value for rotation to handle physics-like inertia manually if needed,
    // or use controls.start with transitions.
    // For "inertia" feel:
    // Hover -> animate to rotate 360 * N with easeIn. 
    // HoverOut -> animate to current + small amount with easeOut.

    // Simpler approach for "Gentle Spin":
    // We can use a rotational velocity.

    useEffect(() => {
        if (isLoaded) {
            // Continuous spin when loaded
            controls.start({
                rotate: 360,
                transition: {
                    repeat: Infinity,
                    ease: "linear",
                    duration: 4 // Slow continuous spin
                }
            });
        } else {
            // Not loaded: stop spinning or handle hover state via separate logic
            // But if we were spinning, we want to stop.
            // If dragging/hovering logic handles it, we let that take over.
            // If we just unloaded, we might want to reset.
            controls.stop();
            controls.set({ rotate: 0 }); // Reset for cleanliness
        }
    }, [isLoaded, controls]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentTrack) {
                // Logic for cleaning up if component unmounts? 
                // No, we want music to keep playing usually, but the requirement says "Eject click: Unload audio". 
            }
        };
    }, []);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCurrentTrack(file);
            setIsPlaying(true);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent clicking through to scene elements if necessary

        if (isLoaded) {
            // Eject Logic
            // Stop playback
            const audio = document.querySelector('audio');
            if (audio) {
                audio.pause();
                audio.src = '';
            }

            setIsPlaying(false);
            setCurrentTrack(null);
            setAnalyzerData(new Uint8Array(0));
            setAudioElement(null);

            // Clear file input so same file can be selected again
            if (inputRef.current) inputRef.current.value = '';
        } else {
            // Load Logic
            inputRef.current?.click();
        }
    };

    return (
        <div className={cn("relative flex items-center justify-center", className)}>
            <input
                ref={inputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* Interactive Container */}
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
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                {/* Glow Effect (Loaded) */}
                {isLoaded && (
                    <motion.div
                        className="absolute inset-0 rounded-full blur-xl bg-cyan-500/30"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                )}

                {/* Circular Text (Default State) */}
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

                {/* Icon Container */}
                <div className="relative z-10 p-4 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 shadow-xl">
                    {/* 
                        Logic for Icon State:
                        - Not Loaded: Disc Icon. Spins on Hover.
                        - Loaded: Disc Icon (Spinning Gradient) -> changes to Eject on Hover/Interaction?
                        Wait, requirement says: "Load text/icon is replaced by (or reveals) an Eject Icon."
                        
                        Let's try:
                        - Always show Disc Icon spinning in background or center.
                        - If Active: Disc is Blue Gradient.
                        - On Hover (if Active): Show Eject Icon.
                     */}

                    {isLoaded ? (
                        // LOADED STATE
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            {/* Background Spinner */}
                            <motion.div
                                className="absolute inset-0 rounded-full border-2 border-t-cyan-400 border-r-cyan-400 border-b-transparent border-l-transparent"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            {/* Icon Swap */}
                            <div className="relative z-10 transition-opacity">
                                {isHovered ? (
                                    <ArrowUpFromLine className="w-6 h-6 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                                ) : (
                                    <Disc3 className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                                )}
                            </div>
                        </div>
                    ) : (
                        // DEFAULT STATE
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
