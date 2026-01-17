import { VisualizerModule } from '../../types/Visualizer';
import { Controls } from './Controls';
import CdSpinnerScene from './Scene';
import { Background } from './Background';
import { EffectsRack } from '../components/EffectsRack';
import { Suspense } from 'react';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// Create a wrapper component to include Background and Effects
const SceneWrapper = () => {
    return (
        <CdSpinnerScene>
            <Suspense fallback={null}>
                <Background />
            </Suspense>
            <ErrorBoundary fallback={null}>
                <EffectsRack />
            </ErrorBoundary>
        </CdSpinnerScene >
    );
};

const CdSpinnerModule: VisualizerModule = {
    id: 'cd-spinner',
    name: 'CD Spinner',
    description: 'A 3D CD inspired by Kanye West\'s Yeezus album cover with interactive particles.',
    thumbnail: '/assets/thumbnails/cd-spinner.jpg',
    component: SceneWrapper,
    controls: Controls,
};

export default CdSpinnerModule;
export { CdSpinnerScene };
