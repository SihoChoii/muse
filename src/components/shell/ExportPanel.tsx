import { Film, Sparkles } from 'lucide-react'
import { useVideoRenderer } from '../../hooks/useVideoRenderer'
import { useAudioStore } from '../../store/useAudioStore'
import {
  getResolutionLabel,
  useExportStore,
} from '../../store/useExportStore'
import type { ResolutionPreset } from '../../types/export'
import { cn } from '../../lib/utils'

const RESOLUTION_PRESETS: ResolutionPreset[] = ['720p', '1080p', '1440p', '4k', 'custom']

function ToggleGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
            value === option.value
              ? 'bg-white text-black'
              : 'bg-transparent text-white/60 hover:bg-white/10 hover:text-white',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function ExportPanel() {
  const currentTrack = useAudioStore((state) => state.currentTrack)
  const phase = useExportStore((state) => state.phase)
  const settings = useExportStore((state) => state.settings)
  const setFormat = useExportStore((state) => state.setFormat)
  const setProfile = useExportStore((state) => state.setProfile)
  const setCompression = useExportStore((state) => state.setCompression)
  const setResolutionPreset = useExportStore((state) => state.setResolutionPreset)
  const setDimensions = useExportStore((state) => state.setDimensions)
  const setTransparent = useExportStore((state) => state.setTransparent)
  const setIncludeAudio = useExportStore((state) => state.setIncludeAudio)
  const {
    isRendering,
    isCancelling,
    metrics,
    result,
    etaLabel,
    startExport,
    stopExport,
    resetExport,
    openOutputPath,
    showOutputInFolder,
  } = useVideoRenderer()

  const isTerminalState = phase === 'done' || phase === 'error'
  const completionKind = result.completionKind
  const hasPlayableOutput =
    completionKind === 'complete' || completionKind === 'partial'

  return (
    <div className="space-y-6 p-4 text-white">
      <div className="sticky top-0 z-10 -mx-4 border-b border-white/10 bg-[#09090b]/95 px-4 py-3 backdrop-blur">
        <h2 className="font-bold text-sm uppercase tracking-wider text-white/60">
          Export
        </h2>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2 text-white/70">
            <Film size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Current track</p>
            <p className="text-xs text-white/50">
              {currentTrack ? currentTrack.name : 'Load audio to render'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Format
          </p>
          <ToggleGroup
            value={settings.format}
            onChange={setFormat}
            options={[
              { value: 'mp4', label: 'MP4' },
              { value: 'webm', label: 'WebM' },
            ]}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Render Profile
          </p>
          <ToggleGroup
            value={settings.profile}
            onChange={setProfile}
            options={[
              { value: 'fast', label: 'Fast' },
              { value: 'quality', label: 'Quality' },
            ]}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Compression
          </p>
          <ToggleGroup
            value={settings.compression}
            onChange={setCompression}
            options={[
              { value: 'lossless', label: 'Lossless' },
              { value: 'lossy', label: 'Lossy' },
            ]}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Resolution
            </p>
            <span className="text-[11px] text-white/40">
              {getResolutionLabel(
                settings.resolutionPreset,
                settings.width,
                settings.height,
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {RESOLUTION_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setResolutionPreset(preset)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs capitalize transition-colors',
                  settings.resolutionPreset === preset
                    ? 'border-white/30 bg-white text-black'
                    : 'border-white/10 bg-black/20 text-white/60 hover:bg-white/10 hover:text-white',
                )}
              >
                {preset === 'custom' ? 'Custom' : preset}
              </button>
            ))}
          </div>
          {settings.resolutionPreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs text-white/50">
                <span>Width</span>
                <input
                  type="number"
                  min={2}
                  step={2}
                  value={settings.width}
                  onChange={(event) =>
                    setDimensions(
                      Number.parseInt(event.target.value || '0', 10),
                      settings.height,
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-white/30"
                />
              </label>
              <label className="space-y-1 text-xs text-white/50">
                <span>Height</span>
                <input
                  type="number"
                  min={2}
                  step={2}
                  value={settings.height}
                  onChange={(event) =>
                    setDimensions(
                      settings.width,
                      Number.parseInt(event.target.value || '0', 10),
                    )
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-white outline-none focus:border-white/30"
                />
              </label>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm">
          <div>
            <p className="text-white/90">Transparent Background</p>
            <p className="text-xs text-white/40">WebM only</p>
          </div>
          <input
            type="checkbox"
            checked={settings.transparent}
            disabled={settings.format !== 'webm'}
            onChange={(event) => setTransparent(event.target.checked)}
          />
        </label>

        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm">
          <div>
            <p className="text-white/90">Audio Track</p>
            <p className="text-xs text-white/40">Mux original audio into output</p>
          </div>
          <input
            type="checkbox"
            checked={settings.includeAudio}
            onChange={(event) => setIncludeAudio(event.target.checked)}
          />
        </label>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2 text-white/70">
            <Sparkles size={16} />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Render Status</p>
            <p className="text-xs text-white/50">{metrics.phaseLabel}</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-white to-emerald-400 transition-[width] duration-300"
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-white/45">
            <span>{Math.round(metrics.progress)}% complete</span>
            <span className="text-right">ETA: {etaLabel}</span>
            <span>
              Frames: {metrics.framesRendered} / {metrics.totalFrames}
            </span>
            <span className="text-right">
              Elapsed: {Math.round(metrics.elapsedMs / 1000)}s
            </span>
          </div>
        </div>

        {result.error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {result.error}
          </div>
        )}

        {phase === 'done' && completionKind === 'discarded' && !result.error && (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/60">
            Render stopped before a usable video was written. No output file was kept.
          </div>
        )}

        {result.outputPath && phase === 'done' && hasPlayableOutput && (
          <div className="space-y-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
            <p className="font-medium">
              {completionKind === 'partial'
                ? 'Render stopped and finalized. Partial video is ready.'
                : 'Render finished successfully.'}
            </p>
            <p className="truncate">{result.outputPath}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void openOutputPath()}
                className="rounded-lg bg-white/10 px-3 py-2 text-white transition-colors hover:bg-white/20"
              >
                Open File
              </button>
              <button
                onClick={() => void showOutputInFolder()}
                className="rounded-lg bg-white/10 px-3 py-2 text-white transition-colors hover:bg-white/20"
              >
                Show in Folder
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {isRendering ? (
            <button
              onClick={stopExport}
              disabled={isCancelling}
              className="rounded-xl border border-red-500/20 bg-red-500/15 px-3 py-3 text-sm font-medium text-red-100 transition-colors hover:bg-red-500/25 disabled:opacity-60"
            >
              {isCancelling ? 'Finalizing Stopped Render...' : 'Cancel & Finalize'}
            </button>
          ) : (
            <button
              onClick={() => void startExport()}
              disabled={!currentTrack}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Render
            </button>
          )}

          {isTerminalState && (
            <button
              onClick={resetExport}
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Reset Status
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/45">
        Transparent output is only available for WebM. Custom resolutions are coerced to positive even dimensions for encoder compatibility.
      </div>
    </div>
  )
}
