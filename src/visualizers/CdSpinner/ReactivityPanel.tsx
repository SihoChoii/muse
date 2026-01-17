import { useRef, useEffect, useState } from 'react';
import { useCdStore } from './store';
import { useAudioStore } from '../../store/useAudioStore';
import { useAudioReactor } from './useAudioReactor';

// Responsive Canvas Hook
function useCanvasSize() {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState({ width: 300, height: 200 });

    useEffect(() => {
        const obs = new ResizeObserver((entries) => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                if (width > 0 && height > 0) {
                    setSize({ width: Math.floor(width), height: Math.floor(height) });
                }
            }
        });
        if (containerRef.current) obs.observe(containerRef.current);
        return () => obs.disconnect();
    }, []);

    return { containerRef, canvasRef, size };
}

const ControlKnob = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
}: {
    label: string,
    value: number,
    onChange: (val: number) => void,
    min: number,
    max: number,
    step: number,
}) => (
    <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center px-1">
            <span className="text-[10px] uppercase text-white/50 tracking-wider font-semibold">{label}</span>
            <span className="text-[10px] font-mono text-white/90">{value.toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-blue-400 transition-colors"
        />
    </div>
);

// Constants for Log Scale
const MIN_LOG_HZ = 20;
const MAX_LOG_HZ = 22050; // Nyquist
const LOG_MIN_VAL = Math.log10(MIN_LOG_HZ);
const LOG_MAX_VAL = Math.log10(MAX_LOG_HZ);
const LOG_RANGE = LOG_MAX_VAL - LOG_MIN_VAL;

export function ReactivityPanel() {
    const { containerRef, canvasRef, size } = useCanvasSize();
    const { analyzerData } = useAudioStore();
    const { audioReactiveSettings, setAudioReactiveSettings } = useCdStore();

    const signal = useAudioReactor(analyzerData, audioReactiveSettings);

    const historyRef = useRef<{ raw: number[], processed: number[] }>(
        { raw: new Array(150).fill(0), processed: new Array(150).fill(0) }
    );

    const [dragging, setDragging] = useState<'move' | 'width' | 'resize-left' | 'resize-right' | null>(null);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [initialRange, setInitialRange] = useState<[number, number]>([0, 0]);

    // Helpers for Log Scale Mapping
    const freqToX = (hz: number, width: number) => {
        // Clamp
        const safeHz = Math.max(MIN_LOG_HZ, Math.min(MAX_LOG_HZ, hz));
        const logHz = Math.log10(safeHz);
        const norm = (logHz - LOG_MIN_VAL) / LOG_RANGE;
        return norm * width;
    };

    const xToFreq = (x: number, width: number) => {
        const norm = x / width;
        const logHz = (norm * LOG_RANGE) + LOG_MIN_VAL;
        return Math.pow(10, logHz);
    };

    // Update History
    useEffect(() => {
        const h = historyRef.current;
        let rawAvg = 0;
        if (analyzerData) {
            const SAMPLE_RATE = 44100;
            const BIN_COUNT = analyzerData.length;
            const NYQUIST = SAMPLE_RATE / 2;
            const HZ_PER_BIN = NYQUIST / BIN_COUNT;
            const [minHz, maxHz] = audioReactiveSettings.frequencyRange;

            const startBin = Math.floor(minHz / HZ_PER_BIN);
            const endBin = Math.ceil(maxHz / HZ_PER_BIN);
            const safeStart = Math.max(0, Math.min(startBin, BIN_COUNT - 1));
            const safeEnd = Math.max(0, Math.min(endBin, BIN_COUNT - 1));

            let sum = 0;
            for (let i = safeStart; i <= Math.max(safeStart, safeEnd); i++) {
                sum += analyzerData[i];
            }
            const count = Math.max(safeStart, safeEnd) - safeStart + 1;
            const avg = count > 0 ? sum / count : 0;
            rawAvg = (avg / 255) * audioReactiveSettings.gain;
        }
        h.raw.push(rawAvg);
        h.raw.shift();
        h.processed.push(signal);
        h.processed.shift();
    }, [analyzerData, signal, audioReactiveSettings]);

    // Drawing Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyzerData) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = size;
        const halfHeight = height * 0.6; // Give more space to Spectrum

        ctx.clearRect(0, 0, width, height);

        // --- BACKGROUND SPECTRUM (Log Scale) ---
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, width, halfHeight);

        // Draw Log Grid Lines (100, 1k, 10k)
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        [100, 1000, 10000].forEach(hz => {
            const x = freqToX(hz, width);
            ctx.moveTo(x, 0); ctx.lineTo(x, halfHeight);
        });
        ctx.stroke();

        // Draw Filled Spectrum
        const SAMPLE_RATE = 44100;
        const NYQUIST = SAMPLE_RATE / 2;
        const binCount = analyzerData.length;
        const hzPerBin = NYQUIST / binCount;

        ctx.beginPath();
        ctx.moveTo(0, halfHeight);

        // We iterate pixel columns to find max value for that log-bucket
        // This is more performant and cleaner than iterating bins
        for (let x = 0; x < width; x++) {
            const freqStart = xToFreq(x, width);
            const freqEnd = xToFreq(x + 1, width);

            const startBin = Math.floor(freqStart / hzPerBin);
            const endBin = Math.ceil(freqEnd / hzPerBin);

            let maxVal = 0;
            // Iterate bins in this pixel column
            for (let b = startBin; b < endBin; b++) {
                if (b < binCount) {
                    maxVal = Math.max(maxVal, analyzerData[b]);
                }
            }
            // Smooth falloff if gap
            if (endBin === startBin && startBin < binCount) {
                maxVal = analyzerData[startBin];
            }

            const h = (maxVal / 255) * (halfHeight - 10);
            ctx.lineTo(x, halfHeight - h);
        }
        ctx.lineTo(width, halfHeight);
        ctx.fillStyle = '#3f3f46'; // Zinc-700
        ctx.fill();


        // --- FILTER CURVE UI ---
        const [minHz, maxHz] = audioReactiveSettings.frequencyRange;
        const xMin = freqToX(minHz, width);
        const xMax = freqToX(maxHz, width);
        const centerHz = Math.sqrt(minHz * maxHz);
        const xCenter = freqToX(centerHz, width);

        // Draw the "Pass Band" highlight
        const grad = ctx.createLinearGradient(xMin, 0, xMax, 0);
        grad.addColorStop(0, 'rgba(234, 179, 8, 0.0)');
        grad.addColorStop(0.2, 'rgba(234, 179, 8, 0.2)');
        grad.addColorStop(0.8, 'rgba(234, 179, 8, 0.2)');
        grad.addColorStop(1, 'rgba(234, 179, 8, 0.0)');

        ctx.fillStyle = grad;
        ctx.fillRect(xMin, 0, xMax - xMin, halfHeight);

        // Draw Filter Cutoff Lines
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, halfHeight);
        ctx.bezierCurveTo(xMin * 0.8, halfHeight, xMin, halfHeight, xMin, 10); // Low Cut
        ctx.lineTo(xMax, 10); // Pass Band
        ctx.bezierCurveTo(xMax, halfHeight, xMax + (width - xMax) * 0.2, halfHeight, width, halfHeight); // High Cut
        ctx.stroke();

        // Draw Edge Handles (for resizing)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        // Left Handle
        ctx.fillRect(xMin - 2, 10, 4, halfHeight - 10);
        // Right Handle
        ctx.fillRect(xMax - 2, 10, 4, halfHeight - 10);

        // Draw Center Node (Handle)
        ctx.beginPath();
        ctx.arc(xCenter, halfHeight / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#eab308';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text Labels
        ctx.fillStyle = '#eab308';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(minHz)} - ${Math.round(maxHz)} Hz`, xCenter, halfHeight / 2 - 12);


        // --- OSCILLOSCOPE (Bottom) ---
        const oscY = halfHeight;
        const oscH = height - halfHeight;

        ctx.fillStyle = '#000';
        ctx.fillRect(0, oscY, width, oscH);

        // Divider
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, oscY); ctx.lineTo(width, oscY); ctx.stroke();

        const mapY = (val: number) => {
            // Use Square Root scaling to "boost" the visual appearance of low values
            // detailed signals usually sit in the 0.0 - 0.3 range.
            const clamped = Math.min(1.2, Math.max(0, val));
            const visual = Math.pow(clamped, 0.5); // Sqrt stretch

            // Map 0 -> 1 (where 1 is mapped to 1.1 scale visually to fit wiggle room)
            // Re-normalize slightly so 1.0 is still near top
            return height - 5 - (visual * (oscH - 10));
        };

        const h = historyRef.current;
        const len = h.raw.length;
        const stepX = width / (len - 1);

        // Threshold Line
        ctx.strokeStyle = '#555';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const tY = mapY(audioReactiveSettings.threshold);
        ctx.moveTo(0, tY); ctx.lineTo(width, tY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Raw Signal (Input)
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
            const x = i * stepX;
            const y = mapY(h.raw[i]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Processed Signal
        const isTriggered = signal > 0.01;
        ctx.strokeStyle = isTriggered ? '#eab308' : '#854d0e'; // Yellow when active
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < len; i++) {
            const x = i * stepX;
            const y = mapY(h.processed[i]);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Output text
        ctx.fillStyle = '#eab308';
        ctx.textAlign = 'left';
        ctx.fillText(`OUT: ${signal.toFixed(2)}`, 6, height - 6);

    }, [analyzerData, audioReactiveSettings, signal, size]);


    // Interaction using Log conversion
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!canvasRef.current || !size.width) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (y > size.height * 0.6) return;

        const [minHz, maxHz] = audioReactiveSettings.frequencyRange;
        const xMin = freqToX(minHz, size.width);
        const xMax = freqToX(maxHz, size.width);
        const xCenter = freqToX(Math.sqrt(minHz * maxHz), size.width);

        const HIT = 10; // hit tolerance

        if (Math.abs(x - xMin) < HIT) {
            setDragging('resize-left');
        } else if (Math.abs(x - xMax) < HIT) {
            setDragging('resize-right');
        } else if (Math.abs(x - xCenter) < 20) {
            setDragging('move');
        } else {
            // Click outside -> Jump center, keep width
            const clickedHz = xToFreq(x, size.width);
            const ratio = maxHz / minHz;
            const newMin = clickedHz / Math.sqrt(ratio);
            const newMax = clickedHz * Math.sqrt(ratio);
            setAudioReactiveSettings({ frequencyRange: [newMin, newMax] });
            setDragging('move');
        }

        setDragStart({ x: e.clientX, y: e.clientY });
        setInitialRange(audioReactiveSettings.frequencyRange);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!dragging || !size.width || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        // Calculate absolute position in canvas for direct mapping
        // We use current mouse X converted to Freq for direct control
        const currentX = e.clientX - rect.left;
        const currentHz = xToFreq(currentX, size.width);

        // For 'move', we need delta
        const deltaX = e.clientX - dragStart.x;
        const [startMin, startMax] = initialRange;

        if (dragging === 'move') {
            const startCenterHz = Math.sqrt(startMin * startMax);
            const startCenterX = freqToX(startCenterHz, size.width);
            const newCenterX = startCenterX + deltaX;
            const newCenterHz = xToFreq(newCenterX, size.width);

            const ratio = startMax / startMin;
            let newMin = newCenterHz / Math.sqrt(ratio);
            let newMax = newCenterHz * Math.sqrt(ratio);

            if (newMin < MIN_LOG_HZ) { newMin = MIN_LOG_HZ; newMax = newMin * ratio; }
            if (newMax > MAX_LOG_HZ) { newMax = MAX_LOG_HZ; newMin = newMax / ratio; }

            setAudioReactiveSettings({ frequencyRange: [newMin, newMax] });
        }
        else if (dragging === 'resize-left') {
            // Dragging left edge: update min, keep max locked (mostly)
            // But don't cross max
            let newMin = currentHz;
            if (newMin < MIN_LOG_HZ) newMin = MIN_LOG_HZ;
            if (newMin > audioReactiveSettings.frequencyRange[1] * 0.9) newMin = audioReactiveSettings.frequencyRange[1] * 0.9;

            setAudioReactiveSettings({ frequencyRange: [newMin, audioReactiveSettings.frequencyRange[1]] });
        }
        else if (dragging === 'resize-right') {
            let newMax = currentHz;
            if (newMax > MAX_LOG_HZ) newMax = MAX_LOG_HZ;
            if (newMax < audioReactiveSettings.frequencyRange[0] * 1.1) newMax = audioReactiveSettings.frequencyRange[0] * 1.1;

            setAudioReactiveSettings({ frequencyRange: [audioReactiveSettings.frequencyRange[0], newMax] });
        }
    };

    // Keep Wheel for power users
    const handleWheel = (e: React.WheelEvent) => {
        // e.deltaY > 0 -> Scroll Down -> Widen? Narrow?
        // Usually Scroll Down (pull back) -> Widen (Zoom out)
        // Scroll Up (push fwd) -> Narrow (Zoom in)

        const [currentMin, currentMax] = audioReactiveSettings.frequencyRange;
        const centerHz = Math.sqrt(currentMin * currentMax);
        const ratio = currentMax / currentMin;

        // Multiplier
        const zoomSpeed = 0.001;
        const factor = 1 + (e.deltaY * zoomSpeed);

        // Apply factor to ratio
        // If deltaY positive (down), factor > 1, range expands
        let newRatio = ratio * factor;
        if (newRatio < 1.01) newRatio = 1.01; // Min width
        if (newRatio > 1000) newRatio = 1000;

        let newMin = centerHz / Math.sqrt(newRatio);
        let newMax = centerHz * Math.sqrt(newRatio);

        // Clamp
        if (newMin < MIN_LOG_HZ) newMin = MIN_LOG_HZ;
        if (newMax > MAX_LOG_HZ) newMax = MAX_LOG_HZ;

        setAudioReactiveSettings({ frequencyRange: [newMin, newMax] });
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging, initialRange, dragStart]);


    return (
        <div className="space-y-4">
            <div
                ref={containerRef}
                className="relative h-48 w-full border border-white/10 rounded-lg overflow-hidden bg-black shadow-lg"
            >
                <div className="absolute top-2 right-2 text-[10px] text-white/30 font-mono pointer-events-none">
                    Scroll to adjust Width
                </div>
                <canvas
                    ref={canvasRef}
                    width={size.width}
                    height={size.height}
                    className="block cursor-crosshair touch-none select-none"
                    onMouseDown={handleMouseDown}
                    onWheel={handleWheel}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-lg border border-white/10">
                <ControlKnob
                    label="Threshold"
                    value={audioReactiveSettings.threshold}
                    onChange={v => setAudioReactiveSettings({ threshold: v })}
                    min={0} max={1} step={0.01}
                />
                <ControlKnob
                    label="Gain"
                    value={audioReactiveSettings.gain}
                    onChange={v => setAudioReactiveSettings({ gain: v })}
                    min={0.5} max={5} step={0.1}
                />
                <ControlKnob
                    label="Attack"
                    value={audioReactiveSettings.attack}
                    onChange={v => setAudioReactiveSettings({ attack: v })}
                    min={0.01} max={1} step={0.01}
                />
                <ControlKnob
                    label="Release"
                    value={audioReactiveSettings.release}
                    onChange={v => setAudioReactiveSettings({ release: v })}
                    min={0.01} max={1} step={0.01}
                />
                <div className="col-span-2 h-px bg-white/5 my-1" />
                <ControlKnob
                    label="Scale Impact"
                    value={audioReactiveSettings.scaleSensitivity ?? 0.2}
                    onChange={v => setAudioReactiveSettings({ scaleSensitivity: v })}
                    min={0} max={1} step={0.01}
                />
                <ControlKnob
                    label="Speed Impact"
                    value={audioReactiveSettings.rotationSensitivity ?? 0.1}
                    onChange={v => setAudioReactiveSettings({ rotationSensitivity: v })}
                    min={0} max={1} step={0.01}
                />
            </div>
        </div>
    );
}
