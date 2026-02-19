import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../store/useAudioStore';
import { useCdStore } from './store';
import { processAudioData } from './useAudioReactor';

export default function Disc() {
    const groupRef = useRef<THREE.Group>(null);

    // Audio Store
    const isPlaying = useAudioStore((state) => state.isPlaying);

    // CD Store
    const { rotationSpeed, coverArt } = useCdStore();

    // Reactor State (Previous value for envelope)
    const reactorState = useRef({ value: 0 });

    // Create CD Geometry (Cylinder with hole) using ExtrudeGeometry
    const geometry = useMemo(() => {
        const shape = new THREE.Shape();
        const outerRadius = 1.2;
        const innerRadius = 0.35; // The hole

        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

        const holePath = new THREE.Path();
        holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
        shape.holes.push(holePath);

        const settings = {
            depth: 0.05,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 3
        };

        return new THREE.ExtrudeGeometry(shape, settings);
    }, []);

    const lastUpdateIdRef = useRef<number>(0);

    useFrame(() => {
        if (!groupRef.current) return;

        // 1. Manual Rotation Override (from UI)
        const update = useCdStore.getState().rotationUpdate;
        if (update && update.id !== lastUpdateIdRef.current) {
            groupRef.current.rotation[update.axis] = update.value;
            lastUpdateIdRef.current = update.id;
        }

        // 2. Continuous Rotation (Speed)
        if (isPlaying) {
            groupRef.current.rotation.x += rotationSpeed.x;
            groupRef.current.rotation.y += rotationSpeed.y;
            groupRef.current.rotation.z += rotationSpeed.z;
        }

        // 3. Report Live Rotation (to UI)
        const onFrameRotation = useCdStore.getState().onFrameRotation;
        if (onFrameRotation) {
            onFrameRotation(
                groupRef.current.rotation.x,
                groupRef.current.rotation.y,
                groupRef.current.rotation.z
            );
        }

        // Reactivity
        const data = useAudioStore.getState().analyzerData;

        if (data && data.length > 0) {
            const settings = useCdStore.getState().audioReactiveSettings;
            const signal = processAudioData(data, settings, reactorState.current);

            // Apply Signal
            // 1. Scale Pulse
            const scaleAmt = settings.scaleSensitivity ?? 0.2; // Default 0.2
            // We want max scale boost to be related to sensitivity.
            // If scaleSensitivity is 1, maybe max 1.5x scale?
            // Existing logic was 0.2 * signal. Signal is 0-1.
            // Let's make sensitivity directly the multiplier.
            const scalePulse = 1 + (signal * scaleAmt);
            groupRef.current.scale.setScalar(scalePulse);

            // 2. Rotation Boost
            // Scale down significantly for subtler effects (0-1 slider -> 0-0.1 effect)
            const speedAmt = (settings.rotationSensitivity ?? 0.1) * 0.1;

            if (isPlaying && Math.abs(rotationSpeed.z) > 0.00001) {
                const direction = Math.sign(rotationSpeed.z);
                // Boost rotation
                groupRef.current.rotation.z += direction * (signal * speedAmt);
            }
        }
    });

    return (
        <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
            {/* The Disc Mesh */}
            <mesh geometry={geometry}>
                {/* Material 0: Sides (edges) - Silver/plastic */}
                <meshPhysicalMaterial
                    attach="material-0"
                    color="#dddddd"
                    metalness={0.8}
                    roughness={0.2}
                />

                {/* Material 1: Top/Bottom faces */}
                {/* We actually want different materials for Top (Label) vs Bottom (Data).
            ExtrudeGeometry applies same material to top and bottom faces.
            So we'll render TWO meshes. One for the disc body, one for the label on top.
         */}
            </mesh>

            {/* Re-doing approach: 
          Base Disc: Data side material everywhere.
          Label Decal: A slightly elevated plane or cylinder cap on top.
      */}

            {/* Base Disc (Data Side Look) */}
            <mesh geometry={geometry}>
                <meshPhysicalMaterial
                    color="#ffffff"
                    metalness={1.0}
                    roughness={0.15}
                    iridescence={1}
                    iridescenceIOR={1.33}
                    iridescenceThicknessRange={[100, 400]}
                    clearcoat={1}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Label Sticker - Just a ring/circle on top */}
            <DiscLabel coverArt={coverArt} />
        </group>
    );
}

import { ErrorBoundary } from '../../components/common/ErrorBoundary';

function DiscLabel({ coverArt }: { coverArt: string | null }) {
    const [isValid, setIsValid] = useState<boolean>(true);
    const [checkedUrl, setCheckedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!coverArt) return;

        // Only need to check blob URLs for expiration
        if (coverArt.startsWith('blob:')) {
            setIsValid(false); // Assume invalid until proven valid to prevent flash crash
            setCheckedUrl(coverArt);

            fetch(coverArt)
                .then(res => {
                    if (res.ok) setIsValid(true);
                })
                .catch(() => {
                    console.warn("Detected expired blob URL in preset, ignoring cover art.");
                    setIsValid(false);
                });
        } else {
            // Data URLs and normal URLs are assumed valid
            setIsValid(true);
            setCheckedUrl(coverArt);
        }
    }, [coverArt]);

    if (coverArt && isValid && checkedUrl === coverArt) {
        return (
            <ErrorBoundary fallback={null}>
                <TextureLabel url={coverArt} />
            </ErrorBoundary>
        );
    }

    return (
        <mesh position={[0, 0, 0.07]}>
            <ringGeometry args={[0.35, 1.2, 64]} />
            <meshStandardMaterial
                color="#ff4400"
                roughness={0.4}
                metalness={0.1}
                side={THREE.FrontSide}
            />
        </mesh>
    );
}

// Sub-component to safely use the hook
import { useTexture } from '@react-three/drei';

function TextureLabel({ url }: { url: string }) {
    const texture = useTexture(url);
    const meshRef = useRef<THREE.Mesh>(null);

    // Fix texture encoding/orientation if needed
    texture.center.set(0.5, 0.5);
    texture.rotation = -Math.PI / 2; // Adjust if needed

    // Create a shape matching the CD for the label
    const shape = useMemo(() => {
        const s = new THREE.Shape();
        s.absarc(0, 0, 1.2, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.absarc(0, 0, 0.35, 0, Math.PI * 2, true);
        s.holes.push(hole);
        return s;
    }, []);

    // Manually fix UVs to map [-1.2, 1.2] range to [0, 1] for the texture
    const geometry = useMemo(() => {
        const geo = new THREE.ShapeGeometry(shape, 64);
        const posAttribute = geo.attributes.position;
        const uvAttribute = geo.attributes.uv;
        const boundingBoxSize = 2.4; // 1.2 radius * 2

        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);

            // Map range [-1.2, 1.2] -> [0, 1]
            // u = (x + 1.2) / 2.4
            const u = (x + 1.2) / boundingBoxSize;
            const v = (y + 1.2) / boundingBoxSize;

            uvAttribute.setXY(i, u, v);
        }

        uvAttribute.needsUpdate = true;
        return geo;
    }, [shape]);

    return (
        <mesh ref={meshRef} position={[0, 0, 0.07]} geometry={geometry}>
            <meshBasicMaterial side={THREE.FrontSide} map={texture} toneMapped={false} />
        </mesh>
    );
}
