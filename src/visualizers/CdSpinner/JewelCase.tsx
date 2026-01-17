import * as React from 'react';

export default function JewelCase({ children }: { children: React.ReactNode }) {
    // A simple box with transmission material
    // CD dimensions: ~12cm diameter.
    // Case dimensions: ~14cm x 12.5cm x 1cm.
    // We scaled CD to 1.2 (radius), so diameter 2.4 units.
    // Let's scale box relative to that.

    const width = 2.6;  // slightly wider than CD
    const height = 2.4; // same as CD diameter roughly
    const depth = 0.2;  // thin

    return (
        <group>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[width, height, depth]} />
                <meshPhysicalMaterial
                    color="#ffffff"
                    transmission={1}  // Glass-like
                    opacity={1}
                    metalness={0}
                    roughness={0}
                    thickness={0.5}   // Refraction volume
                    ior={1.5}         // Index of refraction for glass/plastic
                    transparent={true}
                />
            </mesh>

            {/* Place children (CD) inside */}
            <group position={[0, 0, 0]}>
                {children}
            </group>
        </group>
    );
}
