import { useState, useEffect } from 'react';
import { FolderOpen, Trash2, RefreshCw, Plus, Check } from 'lucide-react';
import { usePresetStore } from '../../store/usePresetStore';
import { Preset } from '../../types/Preset';
import { cn } from '../../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface PresetManagerProps {
    visualizerId: string;
    currentConfig: any;
    onLoad: (config: any) => void;
}

export function PresetManager({ visualizerId, currentConfig, onLoad }: PresetManagerProps) {
    const { savePreset, updatePreset, deletePreset, loadPreset, getPresetsForVisualizer } = usePresetStore();

    // Local state for UI
    const [isExpanded, setIsExpanded] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null); // For "Saved!" messages

    const filteredPresets = getPresetsForVisualizer(visualizerId);

    // Clear feedback after 2s
    useEffect(() => {
        if (feedback) {
            const timer = setTimeout(() => setFeedback(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const handleSaveNew = () => {
        if (!newPresetName.trim()) return;
        savePreset(newPresetName, visualizerId, currentConfig);
        setNewPresetName('');
        setFeedback('Saved!');
        // Find the newly created preset to set it as loaded (optional, but tricky since we don't return ID from savePreset yet)
        // For now just clear input.
    };

    const handleUpdate = () => {
        if (loadedPresetId) {
            updatePreset(loadedPresetId, currentConfig);
            setFeedback('Updated!');
        }
    };

    const handleLoad = (preset: Preset) => {
        const config = loadPreset(preset.id);
        if (config) {
            onLoad(config);
            setLoadedPresetId(preset.id);
            setFeedback(`Loaded ${preset.name}`);
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deletePreset(id);
        if (loadedPresetId === id) setLoadedPresetId(null);
    };

    return (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mb-6">
            {/* Header / Toggle */}
            <div
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                    <FolderOpen size={16} className="text-blue-400" />
                    <span>Presets</span>
                </div>
                <div className="flex items-center gap-2">
                    {feedback && <span className="text-[10px] text-green-400 font-medium animate-pulse">{feedback}</span>}
                    {/* Update Button (Visible if a preset is loaded) */}
                    {loadedPresetId && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleUpdate(); }}
                            className="p-1.5 hover:bg-white/10 rounded-full text-yellow-400/80 hover:text-yellow-400 transition-colors"
                            title="Update current preset"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    <ChevronDown isExpanded={isExpanded} />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                    >
                        <div className="p-3 space-y-3">
                            {/* Save New Input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="New preset name..."
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                                />
                                <button
                                    onClick={handleSaveNew}
                                    disabled={!newPresetName.trim()}
                                    className="px-2 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {/* Presets List */}
                            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                {filteredPresets.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-white/30 italic">
                                        No presets saved
                                    </div>
                                ) : (
                                    filteredPresets.map(preset => (
                                        <div
                                            key={preset.id}
                                            onClick={() => handleLoad(preset)}
                                            className={cn(
                                                "group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border border-transparent transition-all",
                                                loadedPresetId === preset.id
                                                    ? "bg-blue-500/10 border-blue-500/20 text-blue-200"
                                                    : "hover:bg-white/5 text-white/70 hover:text-white"
                                            )}
                                        >
                                            <span className="truncate flex-1">{preset.name}</span>

                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {loadedPresetId === preset.id && (
                                                    <Check size={12} className="text-blue-400 mr-1" />
                                                )}
                                                <button
                                                    onClick={(e) => handleDelete(e, preset.id)}
                                                    className="p-1 hover:bg-red-500/20 text-white/30 hover:text-red-400 rounded transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ChevronDown({ isExpanded }: { isExpanded: boolean }) {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-white/50 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}
