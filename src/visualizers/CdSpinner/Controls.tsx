import { useState, useEffect, useRef } from 'react';
import { useCdStore } from './store';
import { usePresetStore } from '../../store/usePresetStore';
import { useVideoRenderer } from '../../hooks/useVideoRenderer';
import { FilePicker } from '../../components/shell/FilePicker';
import { RefreshCcw } from 'lucide-react';
import { ReactivityPanel } from './ReactivityPanel';
import { PresetManager } from '../../components/shell/PresetManager';

const SliderRow = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
    disabled = false
}: {
    label?: string,
    value: number,
    onChange: (val: number) => void,
    min: number,
    max: number,
    step: number,
    disabled?: boolean
}) => (
    <div className="flex items-center gap-2">
        {label && <span className="text-xs w-16 shrink-0 truncate text-white/70" title={label}>{label}</span>}
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full disabled:opacity-50"
        />
        <input
            type="number"
            value={value}
            disabled={disabled}
            step={step}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-16 bg-white/10 rounded px-2 py-0.5 text-xs border border-transparent focus:border-white/20 outline-none hover:bg-white/20 transition-colors text-right"
        />
    </div>
);

const SectionHeader = ({ title, onReset }: { title: string, onReset?: () => void }) => (
    <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-white/70">{title}</h3>
        {onReset && (
            <button
                onClick={onReset}
                className="p-1 hover:bg-white/10 rounded transition-colors text-white/50 hover:text-white"
                title="Reset to Default"
            >
                <RefreshCcw size={10} />
            </button>
        )}
    </div>
);

let hasLoadedBasePreset = false;

export function Controls() {
    const { isRendering, progress, startExport, stopExport } = useVideoRenderer();
    const [captureSpeed, setCaptureSpeed] = useState(0.5);

    const {
        rotationSpeed, position, scale,
        setRotationSpeed, setPosition, setScale,

        coverArt, background, exportSettings, renderMode, materialParams, jewelCaseParams,
        setCoverArt, setBackground, setExportSettings, setRenderMode, setMaterialParams, setJewelCaseParams,

        setOnFrameRotation, setRotation, resetPosition
    } = useCdStore();

    // Refs for Live Rotation Inputs to avoid re-rendering this component 60fps
    const xRotRef = useRef<{ slider: HTMLInputElement | null, number: HTMLInputElement | null }>({ slider: null, number: null });
    const yRotRef = useRef<{ slider: HTMLInputElement | null, number: HTMLInputElement | null }>({ slider: null, number: null });
    const zRotRef = useRef<{ slider: HTMLInputElement | null, number: HTMLInputElement | null }>({ slider: null, number: null });
    const currentRotationRef = useRef<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 });

    // Setup Live Rotation Link
    useEffect(() => {
        setOnFrameRotation((x, y, z) => {
            // Convert Radians to Degrees (0-360) for display
            // We want continuous rotation for the slider if possible, but 0-360 is safer for "Controls"
            // The user wants "actual rotation".
            const toDeg = (rad: number) => {
                let deg = (rad * 180 / Math.PI) % 360;
                if (deg < 0) deg += 360;
                return deg;
            };

            const xDeg = toDeg(x);
            const yDeg = toDeg(y);
            const zDeg = toDeg(z);

            currentRotationRef.current = { x, y, z };

            // Update DOM directly
            if (xRotRef.current.slider) xRotRef.current.slider.value = xDeg.toString();
            if (xRotRef.current.number) xRotRef.current.number.value = xDeg.toFixed(1);

            if (yRotRef.current.slider) yRotRef.current.slider.value = yDeg.toString();
            if (yRotRef.current.number) yRotRef.current.number.value = yDeg.toFixed(1);

            if (zRotRef.current.slider) zRotRef.current.slider.value = zDeg.toString();
            if (zRotRef.current.number) zRotRef.current.number.value = zDeg.toFixed(1);
        });

        // Cleanup
        return () => setOnFrameRotation(null);
    }, [setOnFrameRotation]);

    const handleManualRotation = (axis: 'x' | 'y' | 'z', deg: number) => {
        // Convert Degrees to Radians
        const rad = deg * Math.PI / 180;
        setRotation(axis, rad);
    };

    // Preset Integration
    // "Save everything" - capture all state that defines the visualizer's look and behavior
    const getCurrentConfig = () => {
        const state = useCdStore.getState();
        return {
            rotationSpeed: state.rotationSpeed,
            position: state.position,
            scale: state.scale,
            coverArt: state.coverArt,
            background: state.background,
            renderMode: state.renderMode,
            materialParams: state.materialParams,
            jewelCaseParams: state.jewelCaseParams,
            audioReactiveSettings: state.audioReactiveSettings, // Grab latest exactly on save
            exportSettings: state.exportSettings,
            camera: state.camera, // Capture current camera state exactly on save
            rotation: currentRotationRef.current // Capture precise live CD rotation exactly on save
        };
    };

    const handlePresetLoad = (config: any) => {
        if (!config) return;

        // --- Core Transform ---
        if (config.rotation) {
            useCdStore.getState().setRotations(config.rotation);
        }
        if (config.rotationSpeed) {
            setRotationSpeed('x', config.rotationSpeed.x);
            setRotationSpeed('y', config.rotationSpeed.y);
            setRotationSpeed('z', config.rotationSpeed.z);
        }
        if (config.position) {
            setPosition('x', config.position.x);
            setPosition('y', config.position.y);
        }
        if (config.scale !== undefined) setScale(config.scale);

        // --- Visuals ---
        // Cover Art: Handle null explicitly (if preset cleared it)
        if (config.coverArt !== undefined) setCoverArt(config.coverArt);

        if (config.background) {
            if (typeof config.background === 'object' && config.background.type) {
                setBackground(config.background.type, config.background.value);
            }
        }

        if (config.renderMode) setRenderMode(config.renderMode);
        if (config.materialParams) setMaterialParams(config.materialParams);
        if (config.jewelCaseParams) setJewelCaseParams(config.jewelCaseParams);

        // --- Reactivity ---
        if (config.audioReactiveSettings) {
            // We use a specific setter for reactivity to merge or overwrite
            // The store has setAudioReactiveSettings which does a partial merge.
            // For a preset load, we probably want to overwrite significant parts or all of it.
            // Let's pass the whole object.
            useCdStore.getState().setAudioReactiveSettings(config.audioReactiveSettings);
        }

        // --- Export Settings ---
        if (config.exportSettings) {
            setExportSettings(config.exportSettings);
        }

        // --- Camera ---
        if (config.camera) {
            useCdStore.getState().setCamera(config.camera.position, config.camera.target);
        }
    };

    // Auto-load "Base" preset on mount if it exists (only once per app load)
    useEffect(() => {
        if (hasLoadedBasePreset) return;
        hasLoadedBasePreset = true;

        const presets = usePresetStore.getState().getPresetsForVisualizer('cd-spinner');
        const basePreset = presets.find(p => p.name.toLowerCase() === 'base');

        if (basePreset) {
            const config = usePresetStore.getState().loadPreset(basePreset.id);
            if (config) {
                handlePresetLoad(config);
            }
        }
    }, []);

    return (
        <div className="space-y-6 p-4 text-white overflow-y-auto h-full scrollbar-thin">
            <h2 className="font-bold text-sm uppercase tracking-wider text-white/50 mb-4 sticky top-0 bg-[#09090b] z-10 py-2">Visualizer Settings</h2>

            {/* Preset Manager */}
            <PresetManager
                visualizerId="cd-spinner"
                getCurrentConfig={getCurrentConfig}
                onLoad={handlePresetLoad}
            />

            {/* Rotation Speed */}
            <div className="space-y-2">
                <SectionHeader
                    title="Rotation Speed"
                    onReset={() => {
                        setRotationSpeed('x', 0);
                        setRotationSpeed('y', 0);
                        setRotationSpeed('z', 0);
                    }}
                />
                <SliderRow label="X" value={rotationSpeed.x} min={-0.05} max={0.05} step={0.0001} onChange={(v) => setRotationSpeed('x', v)} />
                <SliderRow label="Y" value={rotationSpeed.y} min={-0.05} max={0.05} step={0.0001} onChange={(v) => setRotationSpeed('y', v)} />
                <SliderRow label="Z" value={rotationSpeed.z} min={-0.05} max={0.05} step={0.0001} onChange={(v) => setRotationSpeed('z', v)} />
            </div>

            {/* Live Rotation */}
            <div className="space-y-2">
                <SectionHeader
                    title="CD Rotation (Degrees)"
                    onReset={() => {
                        handleManualRotation('x', 0);
                        handleManualRotation('y', 0);
                        handleManualRotation('z', 0);
                    }}
                />

                {/* Custom Uncontrolled Inputs for Performance */}
                {['x', 'y', 'z'].map((axis) => (
                    <div key={axis} className="flex items-center gap-2">
                        <span className="text-xs w-16 shrink-0 uppercase text-white/70">{axis}</span>
                        <input
                            ref={el => { if (axis === 'x') xRotRef.current.slider = el; else if (axis === 'y') yRotRef.current.slider = el; else zRotRef.current.slider = el; }}
                            type="range"
                            min="0"
                            max="360"
                            step="1"
                            defaultValue="0"
                            onChange={(e) => handleManualRotation(axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                        />
                        <input
                            ref={el => { if (axis === 'x') xRotRef.current.number = el; else if (axis === 'y') yRotRef.current.number = el; else zRotRef.current.number = el; }}
                            type="number"
                            min="0"
                            max="360"
                            step="1"
                            defaultValue="0"
                            onChange={(e) => handleManualRotation(axis as 'x' | 'y' | 'z', parseFloat(e.target.value))}
                            className="w-16 bg-white/10 rounded px-2 py-0.5 text-xs border border-transparent focus:border-white/20 outline-none hover:bg-white/20 transition-colors text-right"
                        />
                    </div>
                ))}
            </div>

            {/* Position */}
            <div className="space-y-2">
                <SectionHeader title="Position" onReset={resetPosition} />
                <SliderRow label="X" value={position.x} min={-5} max={5} step={0.1} onChange={(v) => setPosition('x', v)} />
                <SliderRow label="Y" value={position.y} min={-5} max={5} step={0.1} onChange={(v) => setPosition('y', v)} />
            </div>

            {/* Scale */}
            <div className="space-y-2">
                <SectionHeader title="Scale" onReset={() => setScale(1)} />
                <SliderRow value={scale} min={0.1} max={3} step={0.1} onChange={setScale} />
            </div>

            {/* Responsiveness */}
            {/* Audio Reactivity */}
            <div className="space-y-2">
                <SectionHeader title="Signal Reaction Engine" />
                <ReactivityPanel />
            </div>

            <hr className="border-white/10" />

            {/* Disc Materials & Rendering */}
            <div className="space-y-4">
                <h2 className="font-bold text-sm uppercase tracking-wider text-white/50">Disc Material & Rendering</h2>

                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-white/70">Render Mode</h3>
                    <div className="flex gap-2 text-[10px] bg-white/5 p-1 rounded-lg">
                        {['basic', 'quality', 'raytraced'].map(mode => (
                            <button
                                key={mode}
                                onClick={() => setRenderMode(mode as any)}
                                className={`flex-1 py-1.5 rounded text-center transition-colors capitalize ${renderMode === mode ? 'bg-white text-black font-medium' : 'hover:bg-white/10 text-white/70'}`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-white/40 px-1">
                        {renderMode === 'basic' && "Standard PBR material. Best performance."}
                        {renderMode === 'quality' && "Physical material with clearcoat and iridescence."}
                        {renderMode === 'raytraced' && "Transmission material for beautiful glass/acrylic realism. High resource usage."}
                    </p>
                </div>

                <div className="space-y-2">
                    <SectionHeader title="Geometry & Base" />
                    <SliderRow label="Detail" value={materialParams.geometryResolution} min={12} max={128} step={1} onChange={(v) => setMaterialParams({ geometryResolution: v })} />
                    <SliderRow label="Thickness" value={materialParams.thickness} min={0.01} max={0.5} step={0.01} onChange={(v) => setMaterialParams({ thickness: v })} />

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-white/70 w-auto">Base Color</span>
                        <input
                            type="color"
                            value={materialParams.color}
                            onChange={(e) => setMaterialParams({ color: e.target.value })}
                            className="w-16 h-6 cursor-pointer rounded bg-transparent p-0 border-0"
                        />
                    </div>
                </div>

                {renderMode !== 'basic' && (
                    <div className="space-y-2">
                        <SectionHeader title="Surface Properties" />
                        <SliderRow label="Metal" value={materialParams.metalness} min={0} max={1} step={0.01} onChange={(v) => setMaterialParams({ metalness: v })} />
                        <SliderRow label="Rough" value={materialParams.roughness} min={0} max={1} step={0.01} onChange={(v) => setMaterialParams({ roughness: v })} />

                        {renderMode === 'quality' && (
                            <>
                                <SliderRow label="Coat" value={materialParams.clearcoat} min={0} max={1} step={0.01} onChange={(v) => setMaterialParams({ clearcoat: v })} />
                                <SliderRow label="Coat Rg" value={materialParams.clearcoatRoughness} min={0} max={1} step={0.01} onChange={(v) => setMaterialParams({ clearcoatRoughness: v })} />
                                <SliderRow label="Iridesc." value={materialParams.iridescence} min={0} max={1} step={0.01} onChange={(v) => setMaterialParams({ iridescence: v })} />
                            </>
                        )}
                    </div>
                )}

                {renderMode === 'raytraced' && (
                    <div className="space-y-2 p-2 bg-white/5 rounded-lg border border-white/10">
                        <SectionHeader title="Transmission (Raytracing)" />
                        <SliderRow label="Transm." value={materialParams.transmission} min={0} max={1} step={0.01} onChange={(v) => setMaterialParams({ transmission: v })} />
                        <SliderRow label="IOR" value={materialParams.ior} min={1} max={2.33} step={0.01} onChange={(v) => setMaterialParams({ ior: v })} />
                        <SliderRow label="Vol Thk" value={materialParams.thicknessVolume} min={0} max={5} step={0.1} onChange={(v) => setMaterialParams({ thicknessVolume: v })} />
                    </div>
                )}
            </div>

            <hr className="border-white/10" />

            {/* Jewel Case Controls */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-sm uppercase tracking-wider text-white/50">Jewel Case</h2>
                    <button
                        onClick={() => setJewelCaseParams({ visible: !jewelCaseParams.visible })}
                        className={`text-[10px] px-2 py-1 rounded transition-colors ${jewelCaseParams.visible ? 'bg-white text-black' : 'bg-white/10 text-white/50 hover:bg-white/20'}`}
                    >
                        {jewelCaseParams.visible ? 'Visible' : 'Hidden'}
                    </button>
                </div>

                {jewelCaseParams.visible && (
                    <>
                        <div className="space-y-2">
                            <SectionHeader title="Scale" onReset={() => setJewelCaseParams({ scale: 1 })} />
                            <SliderRow value={jewelCaseParams.scale} min={0.5} max={2.0} step={0.01} onChange={(v) => setJewelCaseParams({ scale: v })} />
                        </div>

                        <div className="space-y-2">
                            <SectionHeader title="Rotation (Degrees)" onReset={() => setJewelCaseParams({ rotation: [0, 0, 0] })} />
                            <SliderRow label="X" value={Math.round(jewelCaseParams.rotation[0] * 180 / Math.PI)} min={-180} max={180} step={1} onChange={(v) => setJewelCaseParams({ rotation: [v * Math.PI / 180, jewelCaseParams.rotation[1], jewelCaseParams.rotation[2]] })} />
                            <SliderRow label="Y" value={Math.round(jewelCaseParams.rotation[1] * 180 / Math.PI)} min={-180} max={180} step={1} onChange={(v) => setJewelCaseParams({ rotation: [jewelCaseParams.rotation[0], v * Math.PI / 180, jewelCaseParams.rotation[2]] })} />
                            <SliderRow label="Z" value={Math.round(jewelCaseParams.rotation[2] * 180 / Math.PI)} min={-180} max={180} step={1} onChange={(v) => setJewelCaseParams({ rotation: [jewelCaseParams.rotation[0], jewelCaseParams.rotation[1], v * Math.PI / 180] })} />
                        </div>

                        <div className="space-y-2">
                            <SectionHeader title="Material Settings" />

                            <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-white/70 w-auto">Tint Color</span>
                                <input
                                    type="color"
                                    value={jewelCaseParams.color}
                                    onChange={(e) => setJewelCaseParams({ color: e.target.value })}
                                    className="w-16 h-6 cursor-pointer rounded bg-transparent p-0 border-0"
                                />
                            </div>

                            <SliderRow label="Transm." value={jewelCaseParams.transmission} min={0} max={1} step={0.01} onChange={(v) => setJewelCaseParams({ transmission: v })} />
                            <SliderRow label="Opacity" value={jewelCaseParams.opacity} min={0} max={1} step={0.01} onChange={(v) => setJewelCaseParams({ opacity: v })} />
                            <SliderRow label="IOR" value={jewelCaseParams.ior} min={1} max={2.33} step={0.01} onChange={(v) => setJewelCaseParams({ ior: v })} />
                            <SliderRow label="Vol Thk" value={jewelCaseParams.thickness} min={0} max={5} step={0.1} onChange={(v) => setJewelCaseParams({ thickness: v })} />
                        </div>
                    </>
                )}
            </div>

            <hr className="border-white/10" />

            {/* Visual Customization */}
            <div className="space-y-4">
                <h2 className="font-bold text-sm uppercase tracking-wider text-white/50">Customization</h2>

                {/* Cover Art */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-white/70">Cover Art</h3>
                    <FilePicker
                        file={coverArt ? { name: 'Cover Art' } as any : null}
                        accept="image/*"
                        label="Load Cover Art"
                        onFileSelect={(file) => {
                            if (file) {
                                // Convert to Base64 for persistence
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    if (e.target?.result) {
                                        setCoverArt(e.target.result as string);
                                    }
                                };
                                reader.readAsDataURL(file);
                            } else {
                                setCoverArt(null);
                            }
                        }}
                    />
                </div>

                {/* Background */}
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-white/70">Background</h3>
                    <div className="flex gap-2 text-xs">
                        <button
                            onClick={() => setBackground('color')}
                            className={`px-2 py-1 rounded ${background.type === 'color' ? 'bg-white text-black' : 'bg-white/10'}`}
                        >
                            Color
                        </button>
                        <button
                            onClick={() => setBackground('transparent')}
                            className={`px-2 py-1 rounded ${background.type === 'transparent' ? 'bg-white text-black' : 'bg-white/10'}`}
                        >
                            Transparent
                        </button>
                    </div>

                    {background.type === 'color' && (
                        <input
                            type="color"
                            value={background.value}
                            onChange={(e) => setBackground('color', e.target.value)}
                            className="w-full h-8 cursor-pointer rounded bg-transparent"
                        />
                    )}
                </div>
            </div>

            {/* Video Export */}
            <div className="pt-4 border-t border-white/10">
                <h3 className="text-xs font-semibold text-white/70 mb-2">Export Video</h3>
                {isRendering ? (
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-center text-white/50">Rendering... {Math.round(progress)}%</p>
                        </div>
                        <button
                            onClick={stopExport}
                            className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-lg text-xs font-medium transition-colors border border-red-500/10"
                        >
                            Stop & Finish
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Format Settings */}
                        <div className="flex items-center justify-between gap-2 p-2 bg-white/5 rounded-lg">
                            <label className="text-xs text-white/70">Format</label>
                            <div className="flex gap-1 text-[10px]">
                                <button
                                    onClick={() => setExportSettings({ format: 'mp4', transparent: false })}
                                    className={`px-2 py-1 rounded transition-colors ${exportSettings.format === 'mp4' ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                    MP4
                                </button>
                                <button
                                    onClick={() => setExportSettings({ format: 'webm' })}
                                    className={`px-2 py-1 rounded transition-colors ${exportSettings.format === 'webm' ? 'bg-green-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                                >
                                    WebM
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                            <label className="text-xs text-white/70">Transparent Background</label>
                            <input
                                type="checkbox"
                                checked={exportSettings.transparent}
                                disabled={exportSettings.format === 'mp4'}
                                onChange={(e) => setExportSettings({ transparent: e.target.checked })}
                                className="toggle"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-white/70">
                                <span>Capture Speed</span>
                                <span>{captureSpeed}x</span>
                            </div>
                            <SliderRow value={captureSpeed} min={0.1} max={1} step={0.1} onChange={setCaptureSpeed} />
                        </div>
                        <button
                            onClick={() => startExport(captureSpeed)}
                            className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium transition-colors border border-white/5"
                        >
                            Start Capture
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
