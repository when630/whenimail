import { getDb } from './db'
import type {
  Contact,
  ContactInput,
  DraftLog,
  EmailTemplate,
  OutlookAdapter,
  TemplateInput
} from '../shared/types'

const CONTACT_FIELDS = [
  'name',
  'company',
  'department',
  'title',
  'email',
  'phone',
  'mobile',
  'address',
  'website',
  'memo'
] as const

function normalizeContact(input: ContactInput): Record<string, string> {
  const row: Record<string, string> = {}
  for (const f of CONTACT_FIELDS) row[f] = String(input[f] ?? '').trim()
  return row
}

export function listContacts(search?: string): Contact[] {
  const db = getDb()
  if (search && search.trim()) {
    const q = `%${search.trim()}%`
    return db
      .prepare(
        `SELECT * FROM contact
         WHERE name LIKE ? OR company LIKE ? OR email LIKE ? OR title LIKE ? OR memo LIKE ?
         ORDER BY name`
      )
      .all(q, q, q, q, q) as Contact[]
  }
  return db.prepare('SELECT * FROM contact ORDER BY name').all() as Contact[]
}

export function getContacts(ids: number[]): Contact[] {
  if (ids.length === 0) return []
  const db = getDb()
  const placeholders = ids.map(() => '?').join(',')
  return db.prepare(`SELECT * FROM contact WHERE id IN (${placeholders})`).all(...ids) as Contact[]
}

export function createContact(input: ContactInput): Contact {
  const db = getDb()
  const row = normalizeContact(input)
  if (!row.name) throw new Error('이름은 필수입니다')
  const cols = CONTACT_FIELDS.join(', ')
  const params = CONTACT_FIELDS.map((f) => `@${f}`).join(', ')
  const info = db.prepare(`INSERT INTO contact (${cols}) VALUES (${params})`).run(row)
  return db.prepare('SELECT * FROM contact WHERE id = ?').get(info.lastInsertRowid) as Contact
}

export function updateContact(id: number, input: ContactInput): Contact {
  const db = getDb()
  const row = normalizeContact(input)
  if (!row.name) throw new Error('이름은 필수입니다')
  const sets = CONTACT_FIELDS.map((f) => `${f} = @${f}`).join(', ')
  db.prepare(
    `UPDATE contact SET ${sets}, updated_at = datetime('now','localtime') WHERE id = @id`
  ).run({ ...row, id })
  return db.prepare('SELECT * FROM contact WHERE id = ?').get(id) as Contact
}

export function deleteContact(id: number): void {
  getDb().prepare('DELETE FROM contact WHERE id = ?').run(id)
}

export function listTemplates(): EmailTemplate[] {
  return getDb()
    .prepare('SELECT * FROM template ORDER BY last_used_at DESC NULLS LAST, updated_at DESC')
    .all() as EmailTemplate[]
}

export function getTemplate(id: number): EmailTemplate | undefined {
  return getDb().prepare('SELECT * FROM template WHERE id = ?').get(id) as
    | EmailTemplate
    | undefined
}

export function createTemplate(input: TemplateInput): EmailTemplate {
  const db = getDb()
  if (!input.name?.trim()) throw new Error('템플릿 이름은 필수입니다')
  const info = db
    .prepare('INSERT INTO template (name, subject_tpl, body_tpl) VALUES (?, ?, ?)')
    .run(input.name.trim(), input.subject_tpl ?? '', input.body_tpl ?? '')
  return getTemplate(Number(info.lastInsertRowid))!
}

export function updateTemplate(id: number, input: TemplateInput): EmailTemplate {
  const db = getDb()
  if (!input.name?.trim()) throw new Error('템플릿 이름은 필수입니다')
  db.prepare(
    `UPDATE template SET name = ?, subject_tpl = ?, body_tpl = ?,
     updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(input.name.trim(), input.subject_tpl ?? '', input.body_tpl ?? '', id)
  return getTemplate(id)!
}

export function deleteTemplate(id: number): void {
  getDb().prepare('DELETE FROM template WHERE id = ?').run(id)
}

export function touchTemplateUsed(id: number): void {
  getDb()
    .prepare(`UPDATE template SET last_used_at = datetime('now','localtime') WHERE id = ?`)
    .run(id)
}

export function insertDraftLog(entry: {
  contactId: number
  templateId: number
  contactName: string
  contactEmail: string
  templateName: string
  subjectRendered: string
  adapter: OutlookAdapter
}): void {
  getDb()
    .prepare(
      `INSERT INTO draft_log
       (contact_id, template_id, contact_name, contact_email, template_name, subject_rendered, adapter)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      entry.contactId,
      entry.templateId,
      entry.contactName,
      entry.contactEmail,
      entry.templateName,
      entry.subjectRendered,
      entry.adapter
    )
}

export function listDraftLogs(limit = 200): DraftLog[] {
  return getDb()
    .prepare('SELECT * FROM draft_log ORDER BY id DESC LIMIT ?')
    .all(limit) as DraftLog[]
}
