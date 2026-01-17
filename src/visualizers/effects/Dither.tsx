import React, { forwardRef, useMemo } from 'react';
import { DitherEffectImpl } from './DitherEffectImpl';

// Wrap the effect in a React component
export const Dither = forwardRef(({ strength = 0.5, granularity = 1.0 }, ref) => {
    const effect = useMemo(() => new DitherEffectImpl({ strength, granularity }), [strength, granularity]);

    return <primitive object={effect} ref={ref} dispose={null} />;
});
