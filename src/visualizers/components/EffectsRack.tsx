// @ts-nocheck
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
    EffectComposer,
    Bloom,
    ChromaticAberration,
    Noise,
    Pixelation,
    HueSaturation,
    Sepia,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { Vector2 } from 'three';
import { useFxStore } from '../../store/useFxStore';
import { useAudioStore } from '../../store/useAudioStore';
import { Dither } from '../effects/Dither';

export function EffectsRack() {
    const { bloom, glitch, pixelation, colorGrade, chromaticAberration, dither } = useFxStore();
    const analyzerData = useAudioStore((state) => state.analyzerData);

    // Refs for effects to update them in useFrame
    const bloomRef = useRef<any>(null);
    const chromaticRef = useRef<any>(null);

    useFrame(() => {
        if (!analyzerData) return;

        // Calculate a simple "bass" or "energy" value from the analyzer data
        // Lower 1/8th of the spectrum is usually bass
        const bassZone = analyzerData.slice(0, analyzerData.length / 8);
        const average = bassZone.reduce((a, b) => a + b, 0) / bassZone.length;
        // Normalize 0-1
        const signal = average / 255;

        // --- Bloom Reactivity ---
        if (bloomRef.current) {
            if (bloom.reactive) {
                // Base intensity + signal boost
                bloomRef.current.intensity = bloom.intensity + signal * 2.0;
            } else {
                bloomRef.current.intensity = bloom.intensity;
            }
        }

        // --- Chromatic Aberration / Glitch Reactivity ---
        if (chromaticRef.current) {
            const offsetParams = new Vector2(0, 0);

            if (chromaticAberration.enabled) {
                const baseOffset = chromaticAberration.offset;
                if (chromaticAberration.reactive) {
                    const x = baseOffset + (signal * 0.05);
                    const y = baseOffset + (signal * 0.05);
                    offsetParams.set(x, y);
                } else {
                    offsetParams.set(baseOffset, baseOffset);
                }
            }

            // Glitch overrides or adds to chromatic aberration
            if (glitch.enabled) {
                // Random glitch jump on beat or just high reactivity
                if (glitch.reactive && signal > 0.4) { // Only glitch on strong beats
                    const glitchStrength = glitch.strength * signal;
                    offsetParams.add(new Vector2(Math.random() * glitchStrength, Math.random() * glitchStrength));
                } else if (!glitch.reactive) {
                    const glitchStrength = glitch.strength;
                    offsetParams.add(new Vector2(Math.random() * glitchStrength * 0.1, Math.random() * glitchStrength * 0.1));
                }
            }

            chromaticRef.current.offset = offsetParams;
        }
    });

    return (
        <EffectComposer multisampling={0}>
            {/* @ts-ignore */}
            {bloom.enabled && (
                <Bloom
                    ref={bloomRef}
                    intensity={bloom.intensity}
                    luminanceThreshold={bloom.threshold}
                    mipmapBlur={true}
                />
            )}

            {/* @ts-ignore */}
            {(chromaticAberration.enabled || glitch.enabled) && (
                <ChromaticAberration
                    ref={chromaticRef}
                    offset={new Vector2(chromaticAberration.offset, chromaticAberration.offset)}
                    radialModulation={false}
                    modulationOffset={0}
                />
            )}

            {/* @ts-ignore */}
            {pixelation.enabled && (
                <Pixelation granularity={pixelation.granularity} />
            )}

            {/* Custom Dither Effect */}
            {/* @ts-ignore */}
            {dither.enabled && <Dither strength={dither.strength} granularity={2.0} />}

            {/* Retro Dither Look (Pixelation + Noise) */}
            {/* @ts-ignore */}
            {pixelation.enabled && <Noise opacity={0.1} blendFunction={BlendFunction.OVERLAY} />}

            {/* @ts-ignore */}
            {colorGrade.mode === 'bw' && <HueSaturation saturation={-1} />}
            {/* @ts-ignore */}
            {colorGrade.mode === 'sepia' && <Sepia intensity={1} />}
            {/* Cyberpunk could be a specific color grade, for now let's just use Hue adjustment or similar, 
           but since we don't have a complex LUT loaded, we might skip or just do a Hue shift */}
            {/* @ts-ignore */}
            {colorGrade.mode === 'cyberpunk' && <HueSaturation hue={0.6} saturation={0.5} />}

        </EffectComposer>
    );
}
