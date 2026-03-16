import { useEffect, useRef } from 'react'
import { RefreshCcw } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { PresetManager } from '../../components/shell/PresetManager'
import { FilePicker } from '../../components/shell/FilePicker'
import type { VisualizerConfig } from '../../types/visualizerConfig'
import { type RenderMode, useCdStore, loadCdPresetConfig } from './store'
import { ReactivityPanel } from './ReactivityPanel'

const RENDER_MODES: RenderMode[] = ['basic', 'quality', 'raytraced']

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
)

const SectionHeader = ({
  title,
  onReset,
}: {
  title: string
  onReset?: () => void
}) => (
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
)

export function Controls() {
  const {
    rotationSpeed,
    position,
    scale,
    coverArt,
    background,
    renderMode,
    materialParams,
    jewelCaseParams,
    setRotationSpeed,
    setPosition,
    setScale,
    setCoverArt,
    setBackground,
    setRenderMode,
    setMaterialParams,
    setJewelCaseParams,
    setOnFrameRotation,
    setRotation,
    resetPosition,
  } = useCdStore(
    useShallow((state) => ({
      rotationSpeed: state.rotationSpeed,
      position: state.position,
      scale: state.scale,
      coverArt: state.coverArt,
      background: state.background,
      renderMode: state.renderMode,
      materialParams: state.materialParams,
      jewelCaseParams: state.jewelCaseParams,
      setRotationSpeed: state.setRotationSpeed,
      setPosition: state.setPosition,
      setScale: state.setScale,
      setCoverArt: state.setCoverArt,
      setBackground: state.setBackground,
      setRenderMode: state.setRenderMode,
      setMaterialParams: state.setMaterialParams,
      setJewelCaseParams: state.setJewelCaseParams,
      setOnFrameRotation: state.setOnFrameRotation,
      setRotation: state.setRotation,
      resetPosition: state.resetPosition,
    })),
  )
  const xRotRef = useRef<{
    slider: HTMLInputElement | null
    number: HTMLInputElement | null
  }>({ slider: null, number: null })
  const yRotRef = useRef<{
    slider: HTMLInputElement | null
    number: HTMLInputElement | null
  }>({ slider: null, number: null })
  const zRotRef = useRef<{
    slider: HTMLInputElement | null
    number: HTMLInputElement | null
  }>({ slider: null, number: null })
  const currentRotationRef = useRef({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    setOnFrameRotation((x, y, z) => {
      const toDegrees = (radians: number) => {
        let degrees = ((radians * 180) / Math.PI) % 360
        if (degrees < 0) {
          degrees += 360
        }
        return degrees
      }

      const xDegrees = toDegrees(x)
      const yDegrees = toDegrees(y)
      const zDegrees = toDegrees(z)
      currentRotationRef.current = { x, y, z }

      if (xRotRef.current.slider) {
        xRotRef.current.slider.value = xDegrees.toString()
      }
      if (xRotRef.current.number) {
        xRotRef.current.number.value = xDegrees.toFixed(1)
      }
      if (yRotRef.current.slider) {
        yRotRef.current.slider.value = yDegrees.toString()
      }
      if (yRotRef.current.number) {
        yRotRef.current.number.value = yDegrees.toFixed(1)
      }
      if (zRotRef.current.slider) {
        zRotRef.current.slider.value = zDegrees.toString()
      }
      if (zRotRef.current.number) {
        zRotRef.current.number.value = zDegrees.toFixed(1)
      }
    })

    return () => setOnFrameRotation(null)
  }, [setOnFrameRotation])

  const handleManualRotation = (axis: 'x' | 'y' | 'z', degrees: number) => {
    setRotation(axis, (degrees * Math.PI) / 180)
  }

  const getCurrentConfig = (): VisualizerConfig => {
    const state = useCdStore.getState()
    return {
      rotationSpeed: state.rotationSpeed,
      position: state.position,
      scale: state.scale,
      coverArt: state.coverArt,
      background: state.background,
      renderMode: state.renderMode,
      materialParams: state.materialParams,
      jewelCaseParams: state.jewelCaseParams,
      audioReactiveSettings: state.audioReactiveSettings,
      camera: state.camera,
      rotation: currentRotationRef.current,
    }
  }

    return (
        <div className="space-y-6 p-4 text-white overflow-y-auto h-full scrollbar-thin">
            <h2 className="font-bold text-sm uppercase tracking-wider text-white/50 mb-4 sticky top-0 bg-[#09090b] z-10 py-2">Visualizer Settings</h2>

            {/* Preset Manager */}
            <PresetManager
                visualizerId="cd-spinner"
                getCurrentConfig={getCurrentConfig}
                onLoad={loadCdPresetConfig}
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
                        {RENDER_MODES.map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setRenderMode(mode)}
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
                        file={coverArt ? { name: 'Cover Art' } : null}
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
        </div>
    );
}
