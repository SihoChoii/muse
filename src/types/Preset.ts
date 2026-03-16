import type { PresetData } from './visualizerConfig'

export interface Preset {
  id: string
  name: string
  visualizerId: string
  version: number
  createdAt: number
  updatedAt: number
  data: PresetData
}
