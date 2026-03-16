import type { VisualizerModule } from '../../types/Visualizer'
import { Controls } from './Controls'
import SceneWrapper from './SceneWrapper'

const CdSpinnerModule: VisualizerModule = {
  id: 'cd-spinner',
  name: 'CD Spinner',
  description: 'Spin Spin Spin',
  thumbnail: '/assets/thumbnails/cd-spinner.mp4',
  component: SceneWrapper,
  controls: Controls,
}

export default CdSpinnerModule
