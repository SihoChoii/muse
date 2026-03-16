import { forwardRef, useMemo } from 'react'
import { DitherEffectImpl } from './DitherEffectImpl'

interface DitherProps {
  strength?: number
  granularity?: number
}

export const Dither = forwardRef<DitherEffectImpl, DitherProps>(
  ({ strength = 0.5, granularity = 1.0 }, ref) => {
    const effect = useMemo(
      () => new DitherEffectImpl({ strength, granularity }),
      [granularity, strength],
    )

    return <primitive object={effect} ref={ref} dispose={null} />
  },
)

Dither.displayName = 'Dither'
