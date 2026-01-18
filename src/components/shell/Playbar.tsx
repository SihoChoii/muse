import React, { useState } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { Play, Pause, Volume2, VolumeX, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Playbar: React.FC = () => {
    const { isPlaying, setIsPlaying, currentTrack, volume, setVolume, audioElement } = useAudioStore();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Format time as MM:SS
    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Sync with audio element
    React.useEffect(() => {
        if (!audioElement) return;

        const updateTime = () => setCurrentTime(audioElement.currentTime);
        const updateDuration = () => setDuration(audioElement.duration);

        // Initial values
        setDuration(audioElement.duration || 0);
        setCurrentTime(audioElement.currentTime || 0);

        audioElement.addEventListener('timeupdate', updateTime);
        audioElement.addEventListener('loadedmetadata', updateDuration);

        return () => {
            audioElement.removeEventListener('timeupdate', updateTime);
            audioElement.removeEventListener('loadedmetadata', updateDuration);
        };
    }, [audioElement]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioElement) {
            audioElement.currentTime = time;
        }
    };

    if (!currentTrack) return null;

    return (
        /* Floating Container at Bottom Center */
        <motion.div
            layout
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2"
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 bg-background/50 backdrop-blur-md hover:bg-background/80 rounded-full border border-white/10 text-muted-foreground hover:text-foreground transition-all shadow-sm"
                title={isCollapsed ? "Expand Player" : "Collapse Player"}
            >
                {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {/* Playbar Content */}
            <AnimatePresence mode="wait">
                {!isCollapsed ? (
                    <motion.div
                        key="expanded"
                        initial={{ height: 0, opacity: 0, scale: 0.95 }}
                        animate={{ height: 'auto', opacity: 1, scale: 1 }}
                        exit={{ height: 0, opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-2 min-w-[500px]"
                    >
                        {/* Upper Row: Controls & Info */}
                        <div className="flex items-center justify-between w-full gap-6">
                            {/* Track Info */}
                            <div className="flex flex-col min-w-[120px] max-w-[200px]">
                                <span className="text-sm font-semibold truncate text-foreground">{currentTrack.name}</span>
                                <span className="text-xs text-muted-foreground">Local File</span>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center flex-1">
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="p-3 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-lg"
                                >
                                    {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current pl-0.5" />}
                                </button>
                            </div>

                            {/* Volume */}
                            <div className="flex items-center gap-3 w-[140px]">
                                <button onClick={() => setVolume(volume === 0 ? 1 : 0)} className="text-muted-foreground hover:text-foreground">
                                    {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                            </div>
                        </div>

                        {/* Lower Row: Scrubber */}
                        <div className="flex items-center gap-3 w-full px-1">
                            <span className="text-xs text-muted-foreground w-10 text-right font-mono">{formatTime(currentTime)}</span>
                            <input
                                type="range"
                                min="0"
                                max={duration || 0}
                                step="0.1"
                                value={currentTime}
                                onChange={handleSeek}
                                className="flex-1 h-1 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary hover:h-1.5 transition-all"
                            />
                            <span className="text-xs text-muted-foreground w-10 text-left font-mono">{formatTime(duration)}</span>
                        </div>
                    </motion.div>
                ) : (
                    /* Collapsed State (Mini Player) */
                    <motion.div
                        key="collapsed"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-2 flex items-center gap-4 px-4"
                    >
                        <span className="text-xs font-medium max-w-[150px] truncate">{currentTrack.name}</span>
                        <div className="h-4 w-[1px] bg-white/10" />
                        <span className="text-xs font-mono text-muted-foreground">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="p-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
                        >
                            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" className="ml-0.5" />}
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
