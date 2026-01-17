import React, { useRef, useEffect } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export const PlaceholderVisualizer: React.FC = () => {
    const { analyzerData } = useAudioStore();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyzerData) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Simple bar visualizer
        // const bufferLength = analyzerData.length;
        // We only need a subset for generic display usually, but using all
        // analyzerData fftSize=2048 -> 1024 bins

        const barWidth = (width / 1024) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < 1024; i++) {
            barHeight = (analyzerData[i] / 255) * height;

            const r = barHeight + (25 * (i / 1024));
            const g = 250 * (i / 1024);
            const b = 50;

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }

    }, [analyzerData]);

    return (
        <div className="w-full h-full flex items-center justify-center bg-black">
            <canvas
                ref={canvasRef}
                width={1200}
                height={600}
                className="w-full h-full object-contain"
            />
        </div>
    );
};
