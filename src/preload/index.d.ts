import { ElectronAPI } from '@electron-toolkit/preload'
import type { WhenimailApi } from '../shared/api'

declare global {
  interface Window {
    electron: ElectronAPI
    api: WhenimailApi
  }
}
