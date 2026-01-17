import { VisualizerModule } from '../types/Visualizer';
import CdSpinnerModule from './CdSpinner';

export const visualizers: VisualizerModule[] = [
    CdSpinnerModule,
    // Future visualizers can be added here
];

export function getVisualizerById(id: string): VisualizerModule | undefined {
    return visualizers.find(v => v.id === id);
}
