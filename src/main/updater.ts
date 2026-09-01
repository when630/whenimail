import { BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import type { UpdateState } from '../shared/types'

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000 // 4시간

let state: UpdateState = { status: 'idle' }

function broadcast(next: UpdateState): void {
  state = next
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:state', state)
  }
}

/** GitHub 릴리즈 기반 자동 업데이트. 개발 모드에서는 동작하지 않음 */
export function initUpdater(): void {
  ipcMain.handle('update:state', () => state)
  ipcMain.handle('update:check', () => {
    if (is.dev) return state
    autoUpdater.checkForUpdates().catch(() => undefined)
    return state
  })
  ipcMain.handle('update:install', () => autoUpdater.quitAndInstall())

  if (is.dev) return

  autoUpdater.autoDownload = true

  autoUpdater.on('checking-for-update', () => broadcast({ status: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    broadcast({ status: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => broadcast({ status: 'none' }))
  autoUpdater.on('download-progress', (p) =>
    broadcast({ status: 'downloading', version: state.version, percent: Math.round(p.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    broadcast({ status: 'ready', version: info.version })
  )
  autoUpdater.on('error', (e) =>
    broadcast({ status: 'error', message: e instanceof Error ? e.message : String(e) })
  )

  // 시작 3초 뒤 첫 확인, 이후 주기 확인
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => undefined), 3000)
  setInterval(() => autoUpdater.checkForUpdates().catch(() => undefined), CHECK_INTERVAL_MS)
}
