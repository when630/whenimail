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
  OutlookAdapter,
  TemplateInput
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
    outlookMode: (): Promise<OutlookAdapter> => ipcRenderer.invoke('system:outlookMode'),
    openDataFolder: (): Promise<string> => ipcRenderer.invoke('system:openDataFolder')
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
