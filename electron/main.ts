import { Notification, app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { VideoWriter } from './VideoWriter'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type {
  RenderCommandResult,
  RenderFinishRequest,
  RenderFinishResult,
  RenderFramePayload,
  RenderStartRequest,
  RenderStartResult,
} from '../src/types/export'

const __dirname_esm = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname_esm, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'app-icon.png'),
    webPreferences: {
      preload: path.join(__dirname_esm, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(process.env.VITE_PUBLIC, 'app-icon.png'))
  }

  createWindow()

  const videoWriter = new VideoWriter()
  let activeOutputPath: string | null = null

  ipcMain.handle('render-start', async (_, request: RenderStartRequest): Promise<RenderStartResult> => {
    try {
      const extension = request.format === 'webm' ? 'webm' : 'mp4'
      const defaultPath = path.join(
        app.getPath('downloads'),
        `muse-export-${Date.now()}.${extension}`,
      )
      const dialogOptions = {
        defaultPath,
        filters: [
          request.format === 'webm'
            ? { name: 'WebM Video', extensions: ['webm'] }
            : { name: 'MP4 Video', extensions: ['mp4'] },
        ],
      }
      const saveResult = win
        ? await dialog.showSaveDialog(win, dialogOptions)
        : await dialog.showSaveDialog(dialogOptions)

      if (saveResult.canceled || !saveResult.filePath) {
        return { success: false, cancelled: true }
      }

      await videoWriter.start({
        outputPath: saveResult.filePath,
        audioPath: request.audioPath,
        fps: request.fps,
        format: request.format,
        transparent: request.transparent,
        includeAudio: request.includeAudio,
        profile: request.profile,
        compression: request.compression,
      })
      activeOutputPath = saveResult.filePath

      return {
        success: true,
        cancelled: false,
        outputPath: saveResult.filePath,
      }
    } catch (error) {
      console.error('Render start failed:', error)
      return {
        success: false,
        cancelled: false,
        error: error instanceof Error ? error.message : 'Unknown render start failure',
      }
    }
  })

  ipcMain.handle('render-frame', async (_, payload: RenderFramePayload): Promise<RenderCommandResult> => {
    try {
      const buffer = Buffer.from(payload.data)
      videoWriter.writeFrame(buffer, payload.repeat ?? 1)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to write render frame',
      }
    }
  })

  ipcMain.handle(
    'render-finish',
    async (_, request: RenderFinishRequest): Promise<RenderFinishResult> => {
    try {
      const finishResult = await videoWriter.finish({
        cancelled: request.cancelled,
      })
      const resolvedOutputPath = finishResult.outputPath ?? activeOutputPath ?? undefined

      if (
        finishResult.completionKind === 'complete' &&
        resolvedOutputPath &&
        Notification.isSupported()
      ) {
        new Notification({
          title: 'Muse render complete',
          body: path.basename(resolvedOutputPath),
        }).show()
      }

      return {
        success: true,
        completionKind: finishResult.completionKind,
        outputPath: resolvedOutputPath,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to finish render',
      }
    } finally {
      activeOutputPath = null
    }
    },
  )

  ipcMain.handle('open-path', async (_, targetPath: string): Promise<boolean> => {
    const result = await shell.openPath(targetPath)
    return result === ''
  })

  ipcMain.handle(
    'show-item-in-folder',
    async (_, targetPath: string): Promise<boolean> => {
      shell.showItemInFolder(targetPath)
      return true
    },
  )
})
