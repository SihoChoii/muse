import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCdStore } from './store';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

export function Background() {
    const { background, exportSettings } = useCdStore();
    const { gl, scene } = useThree();

    // Reset background on mount/unmount
    useEffect(() => {
        const originalBackground = scene.background;
        return () => {
            scene.background = originalBackground;
            gl.setClearColor(0x000000, 0); // Reset to transparent or default
        };
    }, [scene, gl]);

    // Handle Transparency for Export
    useEffect(() => {
        // If export mode is transparent, we MUST clear the background
        if (exportSettings.transparent) {
            scene.background = null;
            gl.setClearColor(0x000000, 0);
            return;
        }

        // Otherwise handle user preferences
        if (background.type === 'color') {
            scene.background = new THREE.Color(background.value);
            gl.setClearColor(background.value, 1);
        } else if (background.type === 'transparent') {
            scene.background = null;
            gl.setClearColor(0x000000, 0);
        }
    }, [background, exportSettings.transparent, scene, gl]);

    if (exportSettings.transparent) return null;

    if (background.type === 'image' && background.value) {
        return (
            <>
                {/* 
                  Using Environment as background if it's an HDR/EXR, 
                  but for standard images we might want a Plane or simple Texture background.
                  For now lets assume standard image and put it on a full screen plane 
                  or just use CSS background if we weren't in 3D. 
                  But we are in R3F.
                */}
                <Environment files={background.value} background />
                {/* Fallback or alternative: Use a Mesh with texture behind everything */}
            </>
        );
    }

    return null;
}
