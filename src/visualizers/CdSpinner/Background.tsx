import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import * as THREE from 'three'
import { useVisualizerSurfaceKind } from '../../components/shell/VisualizerSurfaceContext'
import { useExportStore } from '../../store/useExportStore'
import { useCdStore } from './store'

export function Background() {
    const surfaceKind = useVisualizerSurfaceKind()
    const background = useCdStore((state) => state.background)
    const transparent = useExportStore((state) =>
        surfaceKind === 'export' &&
        state.settings.format === 'webm' &&
        state.settings.transparent
    )
    const { gl, scene } = useThree()

    // Reset background on mount/unmount
    useEffect(() => {
        const originalBackground = scene.background
        return () => {
            scene.background = originalBackground
            gl.setClearColor(0x000000, 0)
        }
    }, [scene, gl])

    // Handle Transparency for Export
    useEffect(() => {
        if (transparent) {
            scene.background = null
            gl.setClearColor(0x000000, 0)
            return
        }

        if (background.type === 'color') {
            scene.background = new THREE.Color(background.value)
            gl.setClearColor(background.value, 1)
        } else if (background.type === 'transparent') {
            scene.background = null
            gl.setClearColor(0x000000, 0)
        }
    }, [background, gl, scene, transparent])

    if (transparent) return null

    if (background.type === 'image' && background.value) {
        return (
            <>
                <Environment files={background.value} background />
            </>
        )
    }

    return null
}
