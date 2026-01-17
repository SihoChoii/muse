
import { useFxStore } from '../../store/useFxStore';
import { Zap, Activity, Layers, Monitor, Droplets, Palette } from 'lucide-react';
import { cn } from '../../lib/utils'; // Assuming standard utils exist, if not I'll remove or use clsx directly

// Simple Slider Component
const Slider = ({ value, min, max, step, onChange, label }: { value: number, min: number, max: number, step: number, onChange: (val: number) => void, label?: string }) => (
    <div className="flex flex-col gap-1 w-full">
        {label && <span className="text-xs text-white/50">{label}</span>}
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
        />
    </div>
);

// Toggle Component
const Switch = ({ checked, onChange, label }: { checked: boolean, onChange: (val: boolean) => void, label?: string }) => (
    <button
        onClick={() => onChange(!checked)}
        className={cn(
            "relative w-10 h-5 rounded-full transition-colors flex items-center",
            checked ? "bg-indigo-500" : "bg-white/10"
        )}
    >
        <div
            className={cn(
                "absolute w-3 h-3 bg-white rounded-full shadow-sm transition-transform mx-1",
                checked ? "translate-x-5" : "translate-x-0"
            )}
        />
        {label && <span className="sr-only">{label}</span>}
    </button>
);

// Reactivity Toggle
const ReactivityToggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "p-1.5 rounded-md transition-all",
            active ? "bg-yellow-400/20 text-yellow-400" : "text-white/20 hover:text-white/50"
        )}
        title="Toggle Audio Reactivity"
    >
        <Zap size={14} fill={active ? "currentColor" : "none"} />
    </button>
);

export function FxPanel() {
    const { bloom, glitch, pixelation, colorGrade, chromaticAberration, dither, setBloom, setGlitch, setPixelation, setColorGrade, setChromaticAberration, setDither } = useFxStore();

    return (
        <div className="flex flex-col gap-4 p-4 text-white">

            {/* --- Bloom Section --- */}
            <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
                        <Droplets size={16} />
                        <span>Bloom</span>
                    </div>
                    <Switch checked={bloom.enabled} onChange={(e) => setBloom({ enabled: e })} />
                </div>

                {bloom.enabled && (
                    <div className="flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between gap-2">
                            <Slider label="Intensity" value={bloom.intensity} min={0} max={5} step={0.1} onChange={(v) => setBloom({ intensity: v })} />
                            <ReactivityToggle active={bloom.reactive} onClick={() => setBloom({ reactive: !bloom.reactive })} />
                        </div>
                        <Slider label="Threshold" value={bloom.threshold} min={0} max={1} step={0.05} onChange={(v) => setBloom({ threshold: v })} />
                    </div>
                )}
            </div>

            {/* --- Glitch Section --- */}
            <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-rose-300">
                        <Activity size={16} />
                        <span>Glitch</span>
                    </div>
                    <Switch checked={glitch.enabled} onChange={(e) => setGlitch({ enabled: e })} />
                </div>

                {glitch.enabled && (
                    <div className="flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between gap-2">
                            <Slider label="Strength" value={glitch.strength} min={0} max={1} step={0.05} onChange={(v) => setGlitch({ strength: v })} />
                            <ReactivityToggle active={glitch.reactive} onClick={() => setGlitch({ reactive: !glitch.reactive })} />
                        </div>
                    </div>
                )}
            </div>

            {/* --- Chromatic Aberration Section --- */}
            <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                        <Layers size={16} />
                        <span>Chromatic</span>
                    </div>
                    <Switch checked={chromaticAberration.enabled} onChange={(e) => setChromaticAberration({ enabled: e })} />
                </div>

                {chromaticAberration.enabled && (
                    <div className="flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between gap-2">
                            <Slider label="Offset" value={chromaticAberration.offset} min={0} max={0.1} step={0.001} onChange={(v) => setChromaticAberration({ offset: v })} />
                            <ReactivityToggle active={chromaticAberration.reactive} onClick={() => setChromaticAberration({ reactive: !chromaticAberration.reactive })} />
                        </div>
                    </div>
                )}
            </div>

            {/* --- Pixelation Section --- */}
            <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                        <Monitor size={16} />
                        <span>Retro Pixel</span>
                    </div>
                    <Switch checked={pixelation.enabled} onChange={(e) => setPixelation({ enabled: e })} />
                </div>

                {pixelation.enabled && (
                    <div className="flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-top-2">
                        <Slider label="Granularity" value={pixelation.granularity} min={1} max={20} step={1} onChange={(v) => setPixelation({ granularity: v })} />
                    </div>
                )}
            </div>

            {/* --- Dither Section --- */}
            <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                        <Monitor size={16} />
                        <span>Dither</span>
                    </div>
                    <Switch checked={dither.enabled} onChange={(e) => setDither({ enabled: e })} />
                </div>

                {dither.enabled && (
                    <div className="flex flex-col gap-3 mt-2 animate-in fade-in slide-in-from-top-2">
                        <Slider label="Strength" value={dither.strength} min={0} max={1} step={0.01} onChange={(v) => setDither({ strength: v })} />
                    </div>
                )}
            </div>

            {/* --- Color Grade Section --- */}
            <div className="flex flex-col gap-3 p-3 bg-white/5 rounded-lg border border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                        <Palette size={16} />
                        <span>Color Grade</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                    {['normal', 'bw', 'sepia', 'cyberpunk'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setColorGrade({ mode: mode as any })}
                            className={cn(
                                "px-3 py-2 rounded-md text-xs font-medium transition-all capitalize",
                                colorGrade.mode === mode
                                    ? "bg-white text-black"
                                    : "bg-white/5 text-white/50 hover:bg-white/10"
                            )}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
}
