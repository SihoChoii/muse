import type { VisualizerManifest } from '../types/Visualizer'

export const visualizers: VisualizerManifest[] = [
  {
    id: 'cd-spinner',
    name: 'CD Spinner',
    description: 'Spin Spin Spin',
    thumbnail: '/assets/thumbnails/cd-spinner.mp4',
    loadComponent: () => import('./CdSpinner/SceneWrapper'),
    loadControls: () =>
      import('./CdSpinner/Controls').then((module) => ({
        default: module.Controls,
      })),
  },
]

export function getVisualizerManifestById(id: string) {
  return visualizers.find((visualizer) => visualizer.id === id)
}
