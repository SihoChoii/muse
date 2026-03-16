import { createContext, useContext, type ReactNode } from 'react'

export type VisualizerSurfaceKind = 'interactive' | 'export'

const VisualizerSurfaceContext = createContext<VisualizerSurfaceKind>('interactive')

export function VisualizerSurfaceProvider({
  value,
  children,
}: {
  value: VisualizerSurfaceKind
  children: ReactNode
}) {
  return (
    <VisualizerSurfaceContext.Provider value={value}>
      {children}
    </VisualizerSurfaceContext.Provider>
  )
}

export function useVisualizerSurfaceKind() {
  return useContext(VisualizerSurfaceContext)
}
