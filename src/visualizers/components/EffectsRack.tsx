import { useRef, type ReactElement, type Ref } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  HueSaturation,
  Noise,
  Pixelation,
  Sepia,
} from '@react-three/postprocessing'
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
} from 'postprocessing'
import { Vector2 } from 'three'
import { useAudioStore } from '../../store/useAudioStore'
import { useExportStore } from '../../store/useExportStore'
import { useFxStore } from '../../store/useFxStore'
import { Dither } from '../effects/Dither'

function deterministicOffset(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export function EffectsRack() {
  const { bloom, glitch, pixelation, colorGrade, chromaticAberration, dither } =
    useFxStore()
  const bloomRef = useRef<BloomEffect | null>(null)
  const chromaticRef = useRef<ChromaticAberrationEffect | null>(null)

  useFrame(() => {
    const exportTimeline = useExportStore.getState().timeline
    const analyzerData =
      exportTimeline?.analyzerData ?? useAudioStore.getState().analyzerData
    if (!analyzerData) {
      return
    }

    const bassZone = analyzerData.slice(0, analyzerData.length / 8)
    const average = bassZone.reduce((total, value) => total + value, 0) / bassZone.length
    const signal = average / 255

    if (bloomRef.current) {
      bloomRef.current.intensity = bloom.reactive
        ? bloom.intensity + signal * bloom.intensity * 2
        : bloom.intensity
    }

    if (chromaticRef.current) {
      const offset = new Vector2(0, 0)

      if (chromaticAberration.enabled) {
        const baseOffset = chromaticAberration.offset
        if (chromaticAberration.reactive) {
          const reactiveOffset = baseOffset + signal * 0.05
          offset.set(reactiveOffset, reactiveOffset)
        } else {
          offset.set(baseOffset, baseOffset)
        }
      }

      if (glitch.enabled) {
        const frameSeed = exportTimeline?.frameIndex ?? performance.now()
        if (glitch.reactive && signal > 0.4) {
          const glitchStrength = glitch.strength * signal
          offset.add(
            new Vector2(
              deterministicOffset(frameSeed + 1) * glitchStrength,
              deterministicOffset(frameSeed + 2) * glitchStrength,
            ),
          )
        } else if (!glitch.reactive) {
          const glitchStrength = glitch.strength * 0.1
          offset.add(
            new Vector2(
              deterministicOffset(frameSeed + 3) * glitchStrength,
              deterministicOffset(frameSeed + 4) * glitchStrength,
            ),
          )
        }
      }

      chromaticRef.current.offset = offset
    }
  })

  const effects: ReactElement[] = []

  if (bloom.enabled) {
    effects.push(
      <Bloom
        key="bloom"
        ref={bloomRef as unknown as Ref<typeof BloomEffect>}
        intensity={bloom.intensity}
        luminanceThreshold={bloom.threshold}
        mipmapBlur
      />,
    )
  }

  if (chromaticAberration.enabled || glitch.enabled) {
    effects.push(
      <ChromaticAberration
        key="chromatic"
        ref={chromaticRef as unknown as Ref<typeof ChromaticAberrationEffect>}
        offset={new Vector2(chromaticAberration.offset, chromaticAberration.offset)}
        radialModulation={false}
        modulationOffset={0}
      />,
    )
  }

  if (pixelation.enabled) {
    effects.push(
      <Pixelation
        key="pixelation"
        granularity={pixelation.granularity}
      />,
    )
    effects.push(
      <Noise
        key="pixel-noise"
        opacity={0.1}
        blendFunction={BlendFunction.OVERLAY}
      />,
    )
  }

  if (dither.enabled) {
    effects.push(<Dither key="dither" strength={dither.strength} granularity={2} />)
  }

  if (colorGrade.mode === 'bw') {
    effects.push(<HueSaturation key="bw" saturation={-1} />)
  }

  if (colorGrade.mode === 'sepia') {
    effects.push(<Sepia key="sepia" intensity={1} />)
  }

  if (colorGrade.mode === 'cyberpunk') {
    effects.push(
      <HueSaturation key="cyberpunk" hue={0.6} saturation={0.5} />,
    )
  }

  return <EffectComposer multisampling={0}>{effects}</EffectComposer>
}
