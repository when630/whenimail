import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  Contact,
  ContactInput,
  DraftLog,
  DraftResult,
  DuplicatePolicy,
  EmailTemplate,
  ImportParseResult,
  ImportSummary,
  OcrScanResult,
  OutlookAdapter,
  TemplateInput,
  UpdateState
} from '../shared/types'
import type { WhenimailApi } from '../shared/api'

const api: WhenimailApi = {
  contacts: {
    list: (search?: string): Promise<Contact[]> => ipcRenderer.invoke('contacts:list', search),
    recent: (limit?: number): Promise<Contact[]> => ipcRenderer.invoke('contacts:recent', limit),
    create: (input: ContactInput): Promise<Contact> => ipcRenderer.invoke('contacts:create', input),
    update: (id: number, input: ContactInput): Promise<Contact> =>
      ipcRenderer.invoke('contacts:update', id, input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('contacts:delete', id)
  },
  import: {
    pick: (): Promise<ImportParseResult | null> => ipcRenderer.invoke('import:pick'),
    commit: (rows: ContactInput[], policy: DuplicatePolicy): Promise<ImportSummary> =>
      ipcRenderer.invoke('import:commit', rows, policy)
  },
  ocr: {
    scanCard: (): Promise<OcrScanResult | null> => ipcRenderer.invoke('ocr:scanCard')
  },
  files: {
    imageDataUrl: (path: string): Promise<string> =>
      ipcRenderer.invoke('files:imageDataUrl', path)
  },
  templates: {
    list: (): Promise<EmailTemplate[]> => ipcRenderer.invoke('templates:list'),
    create: (input: TemplateInput): Promise<EmailTemplate> =>
      ipcRenderer.invoke('templates:create', input),
    update: (id: number, input: TemplateInput): Promise<EmailTemplate> =>
      ipcRenderer.invoke('templates:update', id, input),
    remove: (id: number): Promise<void> => ipcRenderer.invoke('templates:delete', id)
  },
  drafts: {
    create: (contactIds: number[], templateId: number): Promise<DraftResult[]> =>
      ipcRenderer.invoke('drafts:create', contactIds, templateId),
    history: (): Promise<DraftLog[]> => ipcRenderer.invoke('drafts:history')
  },
  system: {
    version: (): Promise<string> => ipcRenderer.invoke('system:version'),
    outlookMode: (): Promise<OutlookAdapter> => ipcRenderer.invoke('system:outlookMode'),
    openDataFolder: (): Promise<string> => ipcRenderer.invoke('system:openDataFolder')
  },
  update: {
    state: (): Promise<UpdateState> => ipcRenderer.invoke('update:state'),
    check: (): Promise<UpdateState> => ipcRenderer.invoke('update:check'),
    install: (): Promise<void> => ipcRenderer.invoke('update:install'),
    onState: (cb: (state: UpdateState) => void): (() => void) => {
      const listener = (_e: Electron.IpcRendererEvent, state: UpdateState): void => cb(state)
      ipcRenderer.on('update:state', listener)
      return () => ipcRenderer.removeListener('update:state', listener)
    }
  },
  backup: {
    export: (): Promise<string | null> => ipcRenderer.invoke('backup:export'),
    import: (): Promise<boolean> => ipcRenderer.invoke('backup:import')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
