import { Canvas } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

import { OrbitControls, Environment, ContactShadows, useHelper } from '@react-three/drei';
import Disc from './Disc';
import JewelCase from './JewelCase';
import { useCdStore } from './store';
import { useThree } from '@react-three/fiber';
import { useRef, useEffect } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';

function CameraSync() {
    const { camera: savedCamera, setCamera } = useCdStore();
    const { camera } = useThree();
    const controlsRef = useRef<OrbitControlsImpl>(null);

    // Sync Store -> Scene (e.g. on Preset Load)
    // We check distance to avoid jitter loops if the store update came from us
    useEffect(() => {
        if (!controlsRef.current) return;

        const currentPos = camera.position;
        const savedPos = new THREE.Vector3(...savedCamera.position);

        // Only update if significantly different (precision issues)
        if (currentPos.distanceTo(savedPos) > 0.01) {
            camera.position.set(...savedCamera.position);
            controlsRef.current.target.set(...savedCamera.target);
            controlsRef.current.update();
        }
    }, [savedCamera, camera]); // Dependencies to re-run when store changes

    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            onEnd={() => {
                // Sync Scene -> Store (On User Interaction End)
                if (controlsRef.current) {
                    setCamera(
                        camera.position.toArray(),
                        controlsRef.current.target.toArray()
                    );
                }
            }}
        />
    );
}

export default function CdSpinnerScene({ children }: { children?: React.ReactNode }) {
    const { position, scale } = useCdStore();

    return (
        <div className="w-full h-full bg-black">
            <Canvas camera={{ position: [0, 5, 8], fov: 45 }} gl={{ alpha: false, preserveDrawingBuffer: true }}>
                <CameraSync />

                <React.Suspense fallback={null}>
                    <Environment preset="studio" />
                </React.Suspense>

                <group position={[position.x, position.y, 0]} scale={scale}>
                    <React.Suspense fallback={null}>
                        <JewelCase>
                            <Disc />
                        </JewelCase>
                    </React.Suspense>
                </group>

                <ContactShadows position={[0, -0.01, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                {children}
            </Canvas>
        </div>
    );
}
