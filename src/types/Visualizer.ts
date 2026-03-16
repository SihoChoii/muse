import type { ComponentType, LazyExoticComponent } from 'react'

export interface VisualizerModule {
  id: string
  name: string
  description?: string
  thumbnail: string
  component: ComponentType
  controls: ComponentType
}

export interface VisualizerManifest {
  id: string
  name: string
  description?: string
  thumbnail: string
  loadComponent: () => Promise<{
    default: ComponentType
  }>
  loadControls: () => Promise<{
    default: ComponentType
  }>
}

export type VisualizerSurface =
  | ComponentType
  | LazyExoticComponent<ComponentType>
