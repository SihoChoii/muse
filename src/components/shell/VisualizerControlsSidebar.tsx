import { useState } from 'react';
import { Settings2, ChevronUp, Sliders, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FxPanel } from './FxPanel';
import { cn } from '../../lib/utils';

interface VisualizerControlsSidebarProps {
    ControlsComponent: React.ComponentType;
}

export function VisualizerControlsSidebar({ ControlsComponent }: VisualizerControlsSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'visuals' | 'fx'>('visuals');

    // If no controls component, don't render anything
    if (!ControlsComponent) return null;

    return (
        <>
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed top-4 right-4 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/10 transition-colors border border-white/10"
                    >
                        <Settings2 size={24} />
                    </motion.button>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ x: 350, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 350, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed top-4 right-4 z-40 w-80 bg-black/90 backdrop-blur-xl rounded-xl border border-white/10 flex flex-col shadow-2xl overflow-hidden max-h-[calc(100vh-8rem)]"
                    >
                        {/* Header & Tabs */}
                        <div className="flex flex-col border-b border-white/10 bg-white/5">
                            <div className="flex justify-between items-center p-4 pb-2">
                                <h2 className="font-bold text-sm uppercase tracking-wider text-white">Settings</h2>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <ChevronUp size={20} />
                                </button>
                            </div>

                            <div className="flex px-4 pb-2 gap-2">
                                <button
                                    onClick={() => setActiveTab('visuals')}
                                    className={cn(
                                        "flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2",
                                        activeTab === 'visuals'
                                            ? "bg-white text-black shadow-sm"
                                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <Sliders size={14} />
                                    Visuals
                                </button>
                                <button
                                    onClick={() => setActiveTab('fx')}
                                    className={cn(
                                        "flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2",
                                        activeTab === 'fx'
                                            ? "bg-white text-black shadow-sm"
                                            : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                                    )}
                                >
                                    <Wand2 size={14} />
                                    FX Rack
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <AnimatePresence mode="wait">
                                {activeTab === 'visuals' ? (
                                    <motion.div
                                        key="visuals"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ControlsComponent />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="fx"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <FxPanel />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
