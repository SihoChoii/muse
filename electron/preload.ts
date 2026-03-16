import { contextBridge, ipcRenderer } from 'electron'
import type {
  MuseBridge,
  RenderFramePayload,
  RenderFinishRequest,
  RenderFinishResult,
  RenderStartRequest,
  RenderStartResult,
  RenderCommandResult,
} from '../src/types/export'

const museBridge: MuseBridge = {
  startRender: (request: RenderStartRequest): Promise<RenderStartResult> =>
    ipcRenderer.invoke('render-start', request),
  sendFrame: (payload: RenderFramePayload): Promise<RenderCommandResult> =>
    ipcRenderer.invoke('render-frame', payload),
  finishRender: (request: RenderFinishRequest): Promise<RenderFinishResult> =>
    ipcRenderer.invoke('render-finish', request),
  openPath: (targetPath: string): Promise<boolean> =>
    ipcRenderer.invoke('open-path', targetPath),
  showItemInFolder: (targetPath: string): Promise<boolean> =>
    ipcRenderer.invoke('show-item-in-folder', targetPath),
}

contextBridge.exposeInMainWorld('muse', museBridge)
