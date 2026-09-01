import { app, ipcMain, shell } from 'electron'
import { renderTemplate, bodyToHtml } from '../shared/render'
import type { ContactInput, DraftResult, DuplicatePolicy, TemplateInput } from '../shared/types'
import * as repo from './repo'
import { detectOutlookMode, openDraft } from './outlook'
import { pickAndParse } from './importer'

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function registerIpcHandlers(): void {
  ipcMain.handle('contacts:list', (_e, search?: string) => repo.listContacts(search))
  ipcMain.handle('contacts:create', (_e, input: ContactInput) => repo.createContact(input))
  ipcMain.handle('contacts:update', (_e, id: number, input: ContactInput) =>
    repo.updateContact(id, input)
  )
  ipcMain.handle('contacts:delete', (_e, id: number) => repo.deleteContact(id))
  ipcMain.handle('contacts:recent', (_e, limit?: number) => repo.recentContacts(limit))

  ipcMain.handle('import:pick', () => pickAndParse())
  ipcMain.handle('import:commit', (_e, rows: ContactInput[], policy: DuplicatePolicy) =>
    repo.importContacts(rows, policy)
  )

  ipcMain.handle('templates:list', () => repo.listTemplates())
  ipcMain.handle('templates:create', (_e, input: TemplateInput) => repo.createTemplate(input))
  ipcMain.handle('templates:update', (_e, id: number, input: TemplateInput) =>
    repo.updateTemplate(id, input)
  )
  ipcMain.handle('templates:delete', (_e, id: number) => repo.deleteTemplate(id))

  ipcMain.handle(
    'drafts:create',
    async (_e, contactIds: number[], templateId: number): Promise<DraftResult[]> => {
      const template = repo.getTemplate(templateId)
      if (!template) throw new Error('템플릿을 찾을 수 없습니다')
      const contacts = repo.getContacts(contactIds)
      const results: DraftResult[] = []

      for (const [i, contact] of contacts.entries()) {
        if (!contact.email.trim()) {
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            ok: false,
            error: '이메일 주소가 없습니다'
          })
          continue
        }
        try {
          const subject = renderTemplate(template.subject_tpl, contact).text
          const bodyText = renderTemplate(template.body_tpl, contact).text
          const adapter = await openDraft({
            to: contact.email.trim(),
            subject,
            html: bodyToHtml(bodyText),
            text: bodyText
          })
          repo.insertDraftLog({
            contactId: contact.id,
            templateId: template.id,
            contactName: contact.name,
            contactEmail: contact.email,
            templateName: template.name,
            subjectRendered: subject,
            adapter
          })
          results.push({ contactId: contact.id, contactName: contact.name, ok: true, adapter })
        } catch (e) {
          results.push({
            contactId: contact.id,
            contactName: contact.name,
            ok: false,
            error: e instanceof Error ? e.message : String(e)
          })
        }
        // 초안 창이 연속으로 뜰 때 Outlook이 놓치지 않도록 간격을 둔다
        if (i < contacts.length - 1) await sleep(800)
      }

      if (results.some((r) => r.ok)) repo.touchTemplateUsed(template.id)
      return results
    }
  )

  ipcMain.handle('drafts:history', () => repo.listDraftLogs())

  ipcMain.handle('system:outlookMode', () => detectOutlookMode())
  ipcMain.handle('system:openDataFolder', () => shell.openPath(app.getPath('userData')))
}
