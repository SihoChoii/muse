import { useAudioStore } from '../../store/useAudioStore';
import { visualizers } from '../../visualizers/registry';
import { motion } from 'framer-motion';
import { PlayCircle } from 'lucide-react';
import { LoadButton } from './LoadButton';

export function VisualizerLibrary() {
    const { setActiveVisualizerId } = useAudioStore();

    return (
        <div className="h-full w-full overflow-y-auto p-8 bg-black bg-noise text-white">
            <div className="max-w-7xl mx-auto space-y-8">
                <header className="space-y-2 mb-12">
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
                        Library
                    </h1>
                    <div className="flex items-center justify-between">
                        <p className="text-white/50">Select a visualizer to launch.</p>
                        <div className="relative z-50">
                            <LoadButton className="w-24 h-24" />
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {visualizers.map((viz) => (
                        <motion.div
                            key={viz.id}
                            whileHover={{ y: -5, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative aspect-square rounded-xl overflow-visible bg-white/5 border border-white/10 hover:border-white/30 transition-all cursor-pointer glow-dither"
                            onClick={() => setActiveVisualizerId(viz.id)}
                        >
                            <div className="absolute inset-0 rounded-xl overflow-hidden">
                                {/* Thumbnail */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                {viz.thumbnail && (
                                    <>
                                        {viz.thumbnail.endsWith('.mp4') || viz.thumbnail.endsWith('.webm') ? (
                                            <video
                                                src={viz.thumbnail}
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <img
                                                src={viz.thumbnail}
                                                alt={viz.name}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        )}
                                    </>
                                )}

                                {/* Content */}
                                <div className="absolute inset-x-0 bottom-0 p-4 z-20">
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">
                                        {viz.name}
                                    </h3>
                                    {viz.description && (
                                        <p className="text-xs text-white/60 line-clamp-2">
                                            {viz.description}
                                        </p>
                                    )}
                                </div>

                                {/* Hover Icon */}
                                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white shadow-xl">
                                        <PlayCircle size={32} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Coming Soon Placeholders */}
                    {[1, 2, 3].map((i) => (
                        <div
                            key={`placeholder-${i}`}
                            className="aspect-square rounded-xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-white/20 p-4 text-center border-dashed"
                        >
                            <span className="text-sm font-medium">More Coming Soon</span>
                        </div>
                    ))}
                </div>
            </div >
        </div >
    );
}
