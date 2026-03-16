import { Suspense } from 'react'
import { ErrorBoundary } from '../../components/common/ErrorBoundary'
import { EffectsRack } from '../components/EffectsRack'
import { Background } from './Background'
import CdSpinnerScene from './Scene'

export default function SceneWrapper() {
  return (
    <CdSpinnerScene>
      <Suspense fallback={null}>
        <Background />
      </Suspense>
      <ErrorBoundary fallback={null}>
        <EffectsRack />
      </ErrorBoundary>
    </CdSpinnerScene>
  )
}
