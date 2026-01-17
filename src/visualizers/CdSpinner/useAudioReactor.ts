import { useRef } from 'react';
import { AudioReactiveSettings } from './store';

// Helper function for usage inside requestAnimationFrame/useFrame loops
// where we don't want to trigger React renders
export const processAudioData = (
    data: Uint8Array | null,
    settings: AudioReactiveSettings,
    state: { value: number }
) => {
    if (!data || data.length === 0) return 0;

    // Constants (Assume 44.1kHz Sample Rate)
    // Data length is usually 1024 (fftSize 2048 / 2)
    const BIN_COUNT = data.length;
    const SAMPLE_RATE = 44100;
    const NYQUIST = SAMPLE_RATE / 2;
    const HZ_PER_BIN = NYQUIST / BIN_COUNT; // approx 21.5Hz per bin

    const { frequencyRange, threshold, attack, release, gain } = settings;
    const [minHz, maxHz] = frequencyRange;

    // 1. Isolation (Calculate Average Volume in Freq Range)
    const startBin = Math.floor(minHz / HZ_PER_BIN);
    const endBin = Math.ceil(maxHz / HZ_PER_BIN);

    let sum = 0;
    // Safety clamp to array bounds
    const safeStart = Math.max(0, Math.min(startBin, BIN_COUNT - 1));
    const safeEnd = Math.max(0, Math.min(endBin, BIN_COUNT - 1));

    // Ensure we iterate at least once if range is small but valid
    const loopEnd = Math.max(safeStart, safeEnd);

    for (let i = safeStart; i <= loopEnd; i++) {
        sum += data[i];
    }

    const count = loopEnd - safeStart + 1;
    const avg = count > 0 ? sum / count : 0;

    // Normalize to 0-1 (Input data is Uint8 0-255)
    let rawSignal = avg / 255;

    // 2. Gain
    let signal = rawSignal * gain;

    // 3. Gate / Threshold
    if (signal < threshold) {
        signal = 0;
    }

    // 4. Envelope Follower (Smoothing)
    const prev = state.value;

    if (signal > prev) {
        // Attack Phase (Rising)
        signal = prev + (signal - prev) * attack;
    } else {
        // Release Phase (Falling)
        signal = prev + (signal - prev) * release;
    }

    // Update State
    state.value = signal;

    return signal;
};

export const useAudioReactor = (
    data: Uint8Array | null,
    settings: AudioReactiveSettings
) => {
    // We use a ref to hold the previous value state across renders
    const stateRef = useRef({ value: 0 });

    return processAudioData(data, settings, stateRef.current);
};
