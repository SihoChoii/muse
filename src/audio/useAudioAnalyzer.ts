import { useEffect, useRef } from 'react';
import { useAudioStore } from '../store/useAudioStore';

export const useAudioAnalyzer = () => {
    const { currentTrack, isPlaying, setAnalyzerData, volume, setIsPlaying, setAudioElement } = useAudioStore();
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const rafIdRef = useRef<number | null>(null);

    // Initialize Audio Context and Element when track changes
    useEffect(() => {
        if (!currentTrack) return;

        // Cleanup
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
        }
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        const audio = new Audio(URL.createObjectURL(currentTrack));
        audioElementRef.current = audio;
        setAudioElement(audio); // Register in store
        audio.volume = volume;
        audio.loop = false;

        // Handle track end
        audio.onended = () => {
            setIsPlaying(false);
        };

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        try {
            const source = ctx.createMediaElementSource(audio);
            audioSourceRef.current = source;
            source.connect(analyser);
            analyser.connect(ctx.destination);
        } catch (err) {
            console.error("Error creating MediaElementSource:", err);
        }

        // Auto play when loaded
        setIsPlaying(true);

        return () => {
            // Cleanup on unmount or track change
            audio.pause();
            audio.src = "";
            setAudioElement(null);
        };
    }, [currentTrack]);

    // Handle Play/Pause
    useEffect(() => {
        if (!audioElementRef.current) return;
        const audio = audioElementRef.current;
        const ctx = audioContextRef.current;

        if (isPlaying) {
            if (ctx && ctx.state === 'suspended') {
                ctx.resume();
            }
            audio.play().catch(e => console.error("Play failed:", e));

            // Start Analysis Loop
            const updateLoop = () => {
                if (!analyserRef.current) return;
                const bufferLength = analyserRef.current.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                analyserRef.current.getByteFrequencyData(dataArray);
                setAnalyzerData(dataArray);
                rafIdRef.current = requestAnimationFrame(updateLoop);
            };
            if (!rafIdRef.current) {
                updateLoop();
            }

        } else {
            audio.pause();
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        }
    }, [isPlaying, currentTrack]);

    // Handle Volume
    useEffect(() => {
        if (audioElementRef.current) {
            audioElementRef.current.volume = volume;
        }
    }, [volume]);
};
