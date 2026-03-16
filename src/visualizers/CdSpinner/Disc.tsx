import { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudioStore } from '../../store/useAudioStore';
import { useExportStore } from '../../store/useExportStore';
import { useCdStore } from './store';
import { processAudioData } from './useAudioReactor';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { useShallow } from 'zustand/react/shallow';
import { useVisualizerSurfaceKind } from '../../components/shell/VisualizerSurfaceContext';

export default function Disc() {
    const groupRef = useRef<THREE.Group>(null);
    const transmissionBackground = useMemo(() => new THREE.Color('#000000'), []);
    const surfaceKind = useVisualizerSurfaceKind();

    const isPlaying = useAudioStore((state) => state.isPlaying);

    const { rotationSpeed, coverArt, renderMode, materialParams } = useCdStore(useShallow((state) => ({
        rotationSpeed: state.rotationSpeed,
        coverArt: state.coverArt,
        renderMode: state.renderMode,
        materialParams: state.materialParams,
    })));

    // Reactor State (Previous value for envelope)
    const reactorState = useRef({ value: 0 });
    const lastExportFrameRef = useRef<number | null>(null);

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
            depth: materialParams.thickness,
            bevelEnabled: true,
            bevelThickness: 0.01,
            bevelSize: 0.01,
            bevelSegments: 3,
            curveSegments: materialParams.geometryResolution
        };

        return new THREE.ExtrudeGeometry(shape, settings);
    }, [materialParams.thickness, materialParams.geometryResolution]);

    const lastUpdateIdRef = useRef<number>(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;

        const exportTimeline = useExportStore.getState().timeline;
        const exportActive = exportTimeline !== null;
        const exportFrameIndex = exportTimeline?.frameIndex ?? null;
        if (
            exportActive &&
            exportFrameIndex !== null &&
            lastExportFrameRef.current === exportFrameIndex
        ) {
            return;
        }

        // 1. Manual Rotation Override (from UI)
        const update = useCdStore.getState().rotationUpdate;
        if (update && update.id !== lastUpdateIdRef.current) {
            if (update.axis !== undefined && update.value !== undefined) {
                groupRef.current.rotation[update.axis] = update.value;
            } else {
                if (update.x !== undefined) groupRef.current.rotation.x = update.x;
                if (update.y !== undefined) groupRef.current.rotation.y = update.y;
                if (update.z !== undefined) groupRef.current.rotation.z = update.z;
            }
            lastUpdateIdRef.current = update.id;
        }

        // 2. Continuous Rotation (Speed)
        const frameScale = exportActive
            ? (exportTimeline?.deltaSeconds ?? 1 / 60) * 60
            : delta * 60;
        const activePlayback = exportActive || isPlaying;

        if (activePlayback) {
            groupRef.current.rotation.x += rotationSpeed.x * frameScale;
            groupRef.current.rotation.y += rotationSpeed.y * frameScale;
            groupRef.current.rotation.z += rotationSpeed.z * frameScale;
        }

        // 3. Report Live Rotation (to UI)
        const onFrameRotation = useCdStore.getState().onFrameRotation;
        if (onFrameRotation && surfaceKind === 'interactive') {
            onFrameRotation(
                groupRef.current.rotation.x,
                groupRef.current.rotation.y,
                groupRef.current.rotation.z
            );
        }

        // Reactivity
        const data = exportTimeline?.analyzerData ?? useAudioStore.getState().analyzerData;

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

            if (activePlayback && Math.abs(rotationSpeed.z) > 0.00001) {
                const direction = Math.sign(rotationSpeed.z);
                // Boost rotation
                groupRef.current.rotation.z += direction * (signal * speedAmt * frameScale);
            }
        }

        if (exportActive) {
            lastExportFrameRef.current = exportFrameIndex;
        } else {
            lastExportFrameRef.current = null;
        }
    });

    return (
        <group ref={groupRef} rotation={[Math.PI / 2, 0, 0]}>
            {/* Base Disc (Data Side Look) */}
            <mesh geometry={geometry}>
                {renderMode === 'basic' && (
                    <meshStandardMaterial
                        color={materialParams.color}
                        roughness={materialParams.roughness}
                        metalness={materialParams.metalness}
                        side={THREE.DoubleSide}
                    />
                )}
                {renderMode === 'quality' && (
                    <meshPhysicalMaterial
                        color={materialParams.color}
                        metalness={materialParams.metalness}
                        roughness={materialParams.roughness}
                        iridescence={materialParams.iridescence}
                        iridescenceIOR={1.33}
                        iridescenceThicknessRange={[100, 400]}
                        clearcoat={materialParams.clearcoat}
                        clearcoatRoughness={materialParams.clearcoatRoughness}
                        side={THREE.DoubleSide}
                    />
                )}
                {renderMode === 'raytraced' && (
                    <MeshTransmissionMaterial
                        color={materialParams.color}
                        metalness={materialParams.metalness}
                        roughness={materialParams.roughness}
                        transmission={materialParams.transmission}
                        ior={materialParams.ior}
                        thickness={materialParams.thicknessVolume}
                        background={transmissionBackground}
                        side={THREE.DoubleSide}
                    />
                )}
            </mesh>

            {/* Label Sticker - Just a ring/circle on top */}
            {/* ExtrudeGeometry extrudes from 0 to depth, but bevel adds to both sides.
                Front face Z = thickness + bevelThickness (which is 0.01).
                We add a slightly larger offset (0.005) to ensure it completely clears the geometry without z-fighting. */}
            <group position={[0, 0, materialParams.thickness + 0.015]}>
                <DiscLabel coverArt={coverArt} resolution={materialParams.geometryResolution} />
            </group>
        </group>
    );
}

import { ErrorBoundary } from '../../components/common/ErrorBoundary';

function DiscLabel({ coverArt, resolution = 64 }: { coverArt: string | null, resolution?: number }) {
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
                <TextureLabel url={coverArt} resolution={resolution} />
            </ErrorBoundary>
        );
    }

    return (
        <mesh>
            <ringGeometry args={[0.35, 1.2, resolution]} />
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

function TextureLabel({ url, resolution = 64 }: { url: string, resolution?: number }) {
    const texture = useTexture(url);
    const meshRef = useRef<THREE.Mesh>(null);

    // Fix texture encoding/orientation if needed
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI / 2; // Adjusted to rotate 180 degrees from before (-Math.PI / 2)

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
        const geo = new THREE.ShapeGeometry(shape, resolution);
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
    }, [shape, resolution]);

    return (
        <mesh ref={meshRef} geometry={geometry}>
            <meshBasicMaterial
                side={THREE.FrontSide}
                map={texture}
                toneMapped={false}
                alphaTest={0.5} // Keeps it in opaque pass but allows cutout PNGs
            />
        </mesh>
    );
}
