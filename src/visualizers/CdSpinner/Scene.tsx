import { Canvas } from '@react-three/fiber';
import * as React from 'react';

import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import Disc from './Disc';
import JewelCase from './JewelCase';
import { useCdStore } from './store';

export default function CdSpinnerScene({ children }: { children?: React.ReactNode }) {
    const { position, scale } = useCdStore();

    return (
        <div className="w-full h-full bg-black">
            <Canvas camera={{ position: [0, 5, 8], fov: 45 }} gl={{ alpha: false, preserveDrawingBuffer: true }}>
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2} />

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
