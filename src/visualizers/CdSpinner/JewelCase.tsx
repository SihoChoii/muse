import * as React from 'react';
import { useCdStore } from './store';

export default function JewelCase({ children }: { children: React.ReactNode }) {
    // A simple box with transmission material
    // CD dimensions: ~12cm diameter.
    // Case dimensions: ~14cm x 12.5cm x 1cm.
    // We scaled CD to 1.2 (radius), so diameter 2.4 units.
    // Let's scale box relative to that.

    const width = 2.6;  // slightly wider than CD
    const height = 2.4; // same as CD diameter roughly
    const depth = 0.2;  // thin

    const jewelCaseParams = useCdStore((state) => state.jewelCaseParams);

    return (
        <group>
            {jewelCaseParams.visible && (
                <group
                    rotation={jewelCaseParams.rotation}
                    scale={jewelCaseParams.scale}
                >
                    <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[width, height, depth]} />
                        <meshPhysicalMaterial
                            color={jewelCaseParams.color}
                            transmission={jewelCaseParams.transmission}  // Glass-like
                            opacity={jewelCaseParams.opacity}
                            metalness={0}
                            roughness={0}
                            thickness={jewelCaseParams.thickness}   // Refraction volume
                            ior={jewelCaseParams.ior}         // Index of refraction for glass/plastic
                            transparent={true}
                        />
                    </mesh>
                </group>
            )}

            {/* Place children (CD) inside, completely independent of case transforms */}
            <group position={[0, 0, 0]}>
                {children}
            </group>
        </group>
    );
}
