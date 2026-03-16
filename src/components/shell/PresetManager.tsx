import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, FolderOpen, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { usePresetStore } from '../../store/usePresetStore'
import type { Preset } from '../../types/Preset'
import type { VisualizerConfig } from '../../types/visualizerConfig'
import { cn } from '../../lib/utils'

interface PresetManagerProps {
  visualizerId: string
  currentConfig?: VisualizerConfig
  getCurrentConfig?: () => VisualizerConfig
  onLoad: (config: VisualizerConfig) => void
}

export function PresetManager({ visualizerId, currentConfig, getCurrentConfig, onLoad }: PresetManagerProps) {
  const savePreset = usePresetStore((state) => state.savePreset)
  const updatePreset = usePresetStore((state) => state.updatePreset)
  const deletePreset = usePresetStore((state) => state.deletePreset)
  const loadPreset = usePresetStore((state) => state.loadPreset)
  const activePresetId = usePresetStore((state) => state.activePresetId)
  const getPresetsForVisualizer = usePresetStore(
    (state) => state.getPresetsForVisualizer,
  )
  const [isExpanded, setIsExpanded] = useState(false)
  const [newPresetName, setNewPresetName] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const filteredPresets = getPresetsForVisualizer(visualizerId)

  useEffect(() => {
    if (!feedback) {
      return undefined
    }
    const timer = setTimeout(() => setFeedback(null), 2000)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleSaveNew = () => {
    const configToSave = getCurrentConfig ? getCurrentConfig() : currentConfig
    if (!newPresetName.trim() || !configToSave) {
      return
    }

    savePreset(newPresetName, visualizerId, configToSave)
    setNewPresetName('')
    setFeedback('Saved!')
  }

  const handleUpdate = () => {
    const configToSave = getCurrentConfig ? getCurrentConfig() : currentConfig
    if (!activePresetId || !configToSave) {
      return
    }

    updatePreset(activePresetId, configToSave)
    setFeedback('Updated!')
  }

  const handleLoad = (preset: Preset) => {
    const config = loadPreset(preset.id)
    if (!config) {
      return
    }

    onLoad(config)
    setFeedback(`Loaded ${preset.name}`)
  }

  const handleDelete = (event: React.MouseEvent, id: string) => {
    event.stopPropagation()
    deletePreset(id)
  }

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden mb-6">
      <div
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white/90">
          <FolderOpen size={16} className="text-blue-400" />
          <span>Presets</span>
        </div>
        <div className="flex items-center gap-2">
          {feedback && (
            <span className="text-[10px] text-green-400 font-medium animate-pulse">
              {feedback}
            </span>
          )}
          {activePresetId && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                handleUpdate()
              }}
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
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New preset name..."
                  value={newPresetName}
                  onChange={(event) => setNewPresetName(event.target.value)}
                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                  onKeyDown={(event) =>
                    event.key === 'Enter' ? handleSaveNew() : undefined
                  }
                />
                <button
                  onClick={handleSaveNew}
                  disabled={!newPresetName.trim()}
                  className="px-2 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {filteredPresets.length === 0 ? (
                  <div className="text-center py-4 text-xs text-white/30 italic">
                    No presets saved
                  </div>
                ) : (
                  filteredPresets.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleLoad(preset)}
                      className={cn(
                        'group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border border-transparent transition-all',
                        activePresetId === preset.id
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-200'
                          : 'hover:bg-white/5 text-white/70 hover:text-white',
                      )}
                    >
                      <span className="truncate flex-1">{preset.name}</span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {activePresetId === preset.id && (
                          <Check size={12} className="text-blue-400 mr-1" />
                        )}
                        <button
                          onClick={(event) => handleDelete(event, preset.id)}
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
  )
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
  )
}
