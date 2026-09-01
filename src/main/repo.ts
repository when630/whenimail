import { getDb } from './db'
import type {
  Contact,
  ContactInput,
  DraftLog,
  DuplicatePolicy,
  EmailTemplate,
  ImportSummary,
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
  'memo',
  'card_image_path'
] as const

function normalizeContact(input: ContactInput): Record<string, string> {
  const row: Record<string, string> = {}
  for (const f of CONTACT_FIELDS) row[f] = String(input[f] ?? '').trim()
  return row
}

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((t) => t.trim()).filter(Boolean))]
}

/** 조회된 명함들에 태그 배열을 붙인다 */
function attachTags(rows: Omit<Contact, 'tags'>[]): Contact[] {
  if (rows.length === 0) return []
  const db = getDb()
  const placeholders = rows.map(() => '?').join(',')
  const links = db
    .prepare(
      `SELECT ct.contact_id, t.name FROM contact_tag ct
       JOIN tag t ON t.id = ct.tag_id
       WHERE ct.contact_id IN (${placeholders}) ORDER BY t.name`
    )
    .all(...rows.map((r) => r.id)) as { contact_id: number; name: string }[]
  const byId = new Map<number, string[]>()
  for (const l of links) {
    const arr = byId.get(l.contact_id) ?? []
    arr.push(l.name)
    byId.set(l.contact_id, arr)
  }
  return rows.map((r) => ({ ...r, tags: byId.get(r.id) ?? [] }))
}

function saveTags(contactId: number, tags: string[] | undefined): void {
  const db = getDb()
  const names = normalizeTags(tags)
  db.prepare('DELETE FROM contact_tag WHERE contact_id = ?').run(contactId)
  const insertTag = db.prepare('INSERT OR IGNORE INTO tag (name) VALUES (?)')
  const getTag = db.prepare('SELECT id FROM tag WHERE name = ?')
  const link = db.prepare('INSERT INTO contact_tag (contact_id, tag_id) VALUES (?, ?)')
  for (const name of names) {
    insertTag.run(name)
    const t = getTag.get(name) as { id: number }
    link.run(contactId, t.id)
  }
  // 어디에도 안 쓰이는 태그 정리
  db.prepare('DELETE FROM tag WHERE id NOT IN (SELECT DISTINCT tag_id FROM contact_tag)').run()
}

export function listContacts(search?: string, tag?: string): Contact[] {
  const db = getDb()
  const where: string[] = []
  const params: string[] = []
  if (search && search.trim()) {
    const q = `%${search.trim()}%`
    where.push(`(name LIKE ? OR company LIKE ? OR email LIKE ? OR title LIKE ? OR memo LIKE ?
      OR EXISTS (SELECT 1 FROM contact_tag ct JOIN tag t ON t.id = ct.tag_id
                 WHERE ct.contact_id = contact.id AND t.name LIKE ?))`)
    params.push(q, q, q, q, q, q)
  }
  if (tag && tag.trim()) {
    where.push(`EXISTS (SELECT 1 FROM contact_tag ct JOIN tag t ON t.id = ct.tag_id
                WHERE ct.contact_id = contact.id AND t.name = ?)`)
    params.push(tag.trim())
  }
  const sql = `SELECT * FROM contact ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name`
  return attachTags(db.prepare(sql).all(...params) as Omit<Contact, 'tags'>[])
}

export function listTags(): { name: string; count: number }[] {
  return getDb()
    .prepare(
      `SELECT t.name, COUNT(ct.contact_id) AS count FROM tag t
       JOIN contact_tag ct ON ct.tag_id = t.id
       GROUP BY t.id ORDER BY count DESC, t.name`
    )
    .all() as { name: string; count: number }[]
}

export function getContacts(ids: number[]): Contact[] {
  if (ids.length === 0) return []
  const db = getDb()
  const placeholders = ids.map(() => '?').join(',')
  return attachTags(
    db.prepare(`SELECT * FROM contact WHERE id IN (${placeholders})`).all(...ids) as Omit<
      Contact,
      'tags'
    >[]
  )
}

export function createContact(input: ContactInput): Contact {
  const db = getDb()
  const row = normalizeContact(input)
  if (!row.name) throw new Error('이름은 필수입니다')
  const cols = CONTACT_FIELDS.join(', ')
  const params = CONTACT_FIELDS.map((f) => `@${f}`).join(', ')
  const info = db.prepare(`INSERT INTO contact (${cols}) VALUES (${params})`).run(row)
  const id = Number(info.lastInsertRowid)
  saveTags(id, input.tags)
  return getContacts([id])[0]
}

export function updateContact(id: number, input: ContactInput): Contact {
  const db = getDb()
  const row = normalizeContact(input)
  if (!row.name) throw new Error('이름은 필수입니다')
  const sets = CONTACT_FIELDS.map((f) => `${f} = @${f}`).join(', ')
  db.prepare(
    `UPDATE contact SET ${sets}, updated_at = datetime('now','localtime') WHERE id = @id`
  ).run({ ...row, id })
  saveTags(id, input.tags)
  return getContacts([id])[0]
}

export function deleteContact(id: number): void {
  getDb().prepare('DELETE FROM contact WHERE id = ?').run(id)
}

/** 최근 초안을 보낸 명함 우선, 그다음 최근 수정 명함 */
export function recentContacts(limit = 5): Contact[] {
  const rows = getDb()
    .prepare(
      `SELECT c.*, MAX(d.created_at) AS last_drafted
       FROM contact c LEFT JOIN draft_log d ON d.contact_id = c.id
       GROUP BY c.id
       ORDER BY (last_drafted IS NULL), last_drafted DESC, c.updated_at DESC
       LIMIT ?`
    )
    .all(limit) as Omit<Contact, 'tags'>[]
  return attachTags(rows)
}

/** 일괄 가져오기 — email 기준 중복 판정. 트랜잭션으로 처리 */
export function importContacts(rows: ContactInput[], policy: DuplicatePolicy): ImportSummary {
  const db = getDb()
  const summary: ImportSummary = { inserted: 0, updated: 0, skipped: 0, invalid: 0 }
  const findByEmail = db.prepare('SELECT id FROM contact WHERE email = ? LIMIT 1')

  const run = db.transaction((items: ContactInput[]) => {
    for (const item of items) {
      const row = normalizeContact(item)
      if (!row.name) {
        summary.invalid += 1
        continue
      }
      const existing = row.email
        ? (findByEmail.get(row.email) as { id: number } | undefined)
        : undefined
      if (existing) {
        if (policy === 'overwrite') {
          updateContact(existing.id, item)
          summary.updated += 1
        } else {
          summary.skipped += 1
        }
        continue
      }
      createContact(item)
      summary.inserted += 1
    }
  })
  run(rows)
  return summary
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
