import { useRef, useEffect, useCallback } from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { useCdStore } from '../visualizers/CdSpinner/store';


// @ts-ignore
const electron = window.ipcRenderer;

/**
 * useVideoRenderer
 * 
 * Manages the video export process.
 * NOW PERSISTENT via useAudioStore.
 * 
 * The `setInterval` loop is still managed locally via ref, which means
 * if the component unmounts, the loop needs to be safely handled.
 * Ideally, this hook should be mounted high up in the tree (App.tsx),
 * but for now, we're relying on the store to keep the state.
 */
export function useVideoRenderer() {
    const {
        isExporting, exportProgress,
        setIsExporting, setExportProgress
    } = useAudioStore();

    // We use a ref for the animation frame so we can cancel it
    const animationFrameRef = useRef<number | null>(null);

    // We also need a ref to track if we *should* be exporting, 
    // to handle race conditions if the component re-mounts while exporting.
    const isExportingRef = useRef(isExporting);

    // Sync ref with store
    useEffect(() => {
        isExportingRef.current = isExporting;
    }, [isExporting]);


    const finishExport = useCallback(async () => {
        const { audioElement } = useAudioStore.getState();

        // Clear animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (audioElement) {
            // Restore playback
            audioElement.playbackRate = 1;
            audioElement.pause();
            audioElement.currentTime = 0;
        }

        if (electron) {
            // @ts-expect-error - Custom IPC method
            await electron.finishRender();
        }

        setIsExporting(false);
        setExportProgress(100);

    }, [setIsExporting, setExportProgress]);

    const startExport = useCallback(async (captureSpeed: number = 0.5) => {
        if (!electron) {
            console.error("Electron IPC not found");
            return;
        }

        const audioStore = useAudioStore.getState();
        const { currentTrack, audioElement } = audioStore;
        // @ts-ignore - duration might be missing on type but exists on runtime state sometimes
        const duration = (audioStore as any).duration || 0;

        if (!currentTrack || !audioElement) {
            alert("No track loaded or audio element missing!");
            return;
        }

        setIsExporting(true);
        setExportProgress(0);

        // 1. Prepare Paths
        const downloadsPath = '/Users/sihochoi/Downloads';
        const { currentTrack: trackFromStore } = useAudioStore.getState();
        const audioPath = trackFromStore?.path || null;

        // 2. Initialize FFmpeg
        const fps = 60;
        const { exportSettings } = useCdStore.getState();
        const extension = exportSettings.format === 'webm' ? 'webm' : 'mp4';
        const fileName = `muse-export-${Date.now()}.${extension}`;
        const outputPath = `${downloadsPath}/${fileName}`;

        // @ts-expect-error - Custom IPC method
        const response = await electron.startRender({
            outputPath,
            audioPath,
            fps,
            options: {
                transparent: exportSettings.transparent,
                format: exportSettings.format
            }
        });

        if (!response.success) {
            console.error("Failed to start render:", response.error);
            setIsExporting(false);
            return;
        }

        // 3. Start Capture Loop
        audioElement.playbackRate = captureSpeed;
        audioElement.currentTime = 0;
        await audioElement.play();

        const totalDuration = duration || 1; // avoid division by zero
        let frameCount = 0;

        // Clear any existing loop just in case
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

        const renderLoop = () => {
            // Check Ref instead of state for safety in closure
            if (!isExportingRef.current) {
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                return;
            }

            if (!audioElement || audioElement.ended || audioElement.paused) {
                // Double check we haven't just started (currentTime close to 0?)
                // Actually, if we awaited play(), paused should be false. 
                // However, user might pause manually or track ends.
                finishExport();
                return;
            }

            const currentTime = audioElement.currentTime;

            // Calculate how many frames *should* have been emitted by this point in time
            const expectedFrames = Math.floor(currentTime * fps);
            const framesNeeded = expectedFrames - frameCount;

            if (framesNeeded > 0) {
                // Capture Frame
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                    // @ts-expect-error - Custom IPC method with count argument
                    electron.sendFrame(dataUrl, framesNeeded);
                }
                frameCount = expectedFrames;
            }

            // Update Progress
            setExportProgress((currentTime / totalDuration) * 100);

            animationFrameRef.current = requestAnimationFrame(renderLoop);
        };

        animationFrameRef.current = requestAnimationFrame(renderLoop);

    }, [finishExport, setIsExporting, setExportProgress]);

    // Cleanup on unmount?
    // WARNING: If this hook unmounts (e.g. sidebar closed), we DO NOT want to stop the export
    // if we want it to persist. 
    // BUT the `setInterval` is local to this hook instance. If hook dies, interval dies (stops capturing).
    // The previous implementation had this bug.

    // To fix: The INTERVAL logic must stay alive.
    // Since we're refactoring to just "Persist State", the user didn't ask "Keep recording in BG".
    // They asked "If I re-open, show me that it IS recording".
    // BUT if the interval dies, it IS NOT recording anymore.

    // So for now, we MUST keep the component mounted OR move this hook to App.tsx.
    // I will refactor this file, but then I will ALSO instantiate useVideoRenderer in App.tsx 
    // to ensure the loop keeps running.

    return {
        isRendering: isExporting,
        progress: exportProgress,
        startExport,
        stopExport: finishExport
    };
}
