import { useCallback, useEffect, useRef } from 'react'
import { ContactShadows, Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import * as React from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useShallow } from 'zustand/react/shallow'
import { useVisualizerSurfaceKind } from '../../components/shell/VisualizerSurfaceContext'
import { useExportStore } from '../../store/useExportStore'
import Disc from './Disc'
import JewelCase from './JewelCase'
import { useCdStore } from './store'

function CameraSync() {
    const savedCamera = useCdStore((state) => state.camera)
    const setCamera = useCdStore((state) => state.setCamera)
    const { camera } = useThree()
    const controlsRef = useRef<OrbitControlsImpl>(null)

    // Sync Store -> Scene (e.g. on Preset Load)
    // We check distance to avoid jitter loops if the store update came from us
    useEffect(() => {
        if (!controlsRef.current) {
            return
        }

        const currentPos = camera.position
        const savedPos = new THREE.Vector3(...savedCamera.position)
        if (currentPos.distanceTo(savedPos) > 0.01) {
            camera.position.set(...savedCamera.position)
            controlsRef.current.target.set(...savedCamera.target)
            controlsRef.current.update()
        }
    }, [camera, savedCamera])

    const timeoutRef = useRef<number | null>(null)
    const handleCameraChange = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = window.setTimeout(() => {
            if (controlsRef.current) {
                setCamera(
                    camera.position.toArray(),
                    controlsRef.current.target.toArray()
                )
            }
        }, 100)
    }, [camera, setCamera])

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [])

    return (
        <OrbitControls
            ref={controlsRef}
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            onChange={handleCameraChange}
            onEnd={handleCameraChange}
        />
    )
}

function ExportSurfaceBinding() {
    const surfaceKind = useVisualizerSurfaceKind()
    const registerSurface = useExportStore((state) => state.registerSurface)
    const { gl, invalidate } = useThree()

    useEffect(() => {
        if (surfaceKind !== 'export') {
            return undefined
        }

        registerSurface({
            canvas: gl.domElement,
            invalidate,
        })

        return () => {
            registerSurface(null)
        }
    }, [gl, invalidate, registerSurface, surfaceKind])

    return null
}

function CdLightingEnvironment() {
    return (
        <Environment resolution={256}>
            <color attach="background" args={['#000000']} />
            <group rotation={[0, Math.PI / 4, 0]}>
                <Lightformer
                    form="rect"
                    intensity={3}
                    color="#ffffff"
                    position={[4, 3, 2]}
                    rotation={[0, -Math.PI / 3, 0]}
                    scale={[8, 8, 1]}
                />
                <Lightformer
                    form="rect"
                    intensity={2}
                    color="#bfe3ff"
                    position={[-3, 2, 4]}
                    rotation={[0, Math.PI / 5, 0]}
                    scale={[6, 4, 1]}
                />
                <Lightformer
                    form="ring"
                    intensity={1.5}
                    color="#ffd7a8"
                    position={[0, 5, -2]}
                    scale={4}
                />
            </group>
        </Environment>
    )
}

export default function CdSpinnerScene({ children }: { children?: React.ReactNode }) {
    const surfaceKind = useVisualizerSurfaceKind()
    const { position, scale } = useCdStore(useShallow((state) => ({
        position: state.position,
        scale: state.scale,
    })))
    const exportSettings = useExportStore((state) => state.settings)
    const isExporting = useExportStore((state) => state.phase !== 'idle' && state.phase !== 'done' && state.phase !== 'error')
    const alphaEnabled = surfaceKind === 'export'
        ? exportSettings.format === 'webm' && exportSettings.transparent
        : false
    const glOptions = React.useMemo(
        () => ({
            alpha: alphaEnabled,
            preserveDrawingBuffer: surfaceKind === 'export' || isExporting,
        }),
        [alphaEnabled, isExporting, surfaceKind],
    )
    const cameraOptions = React.useMemo(() => ({ position: [0, 5, 8] as [number, number, number], fov: 45 }), [])
    const groupPosition = React.useMemo(() => [position.x, position.y, 0] as [number, number, number], [position.x, position.y])

    return (
        <div className="w-full h-full bg-black">
            <Canvas
                key={`${surfaceKind}-canvas-${alphaEnabled ? 'alpha' : 'opaque'}`}
                camera={cameraOptions}
                gl={glOptions}
                dpr={surfaceKind === 'export' ? 1 : undefined}
                frameloop={surfaceKind === 'export' ? 'demand' : 'always'}
            >
                <ExportSurfaceBinding />
                <CameraSync />

                <React.Suspense fallback={null}>
                    <CdLightingEnvironment />
                </React.Suspense>

                <ambientLight intensity={0.35} />
                <directionalLight position={[3, 5, 4]} intensity={1.25} />

                <group position={groupPosition} scale={scale}>
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
    )
}
