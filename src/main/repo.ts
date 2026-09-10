import { getDb } from './db'
import { pruneAttachments } from './attachments'
import type {
  AppSettings,
  BulkContactPatch,
  Contact,
  ContactInput,
  DraftLog,
  DuplicatePolicy,
  EmailTemplate,
  ImportSummary,
  OutlookAdapter,
  TemplateAttachment,
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
  pruneTags()
}

/** 어디에도 안 쓰이는 태그 정리 */
function pruneTags(): void {
  getDb().prepare('DELETE FROM tag WHERE id NOT IN (SELECT DISTINCT tag_id FROM contact_tag)').run()
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
  pruneTags()
}

/** 여러 명함을 한 트랜잭션으로 삭제. 실제 삭제된 수를 반환 */
export function deleteContacts(ids: number[]): number {
  if (ids.length === 0) return 0
  const db = getDb()
  const run = db.transaction((targets: number[]) => {
    const placeholders = targets.map(() => '?').join(',')
    const info = db.prepare(`DELETE FROM contact WHERE id IN (${placeholders})`).run(...targets)
    pruneTags()
    return info.changes
  })
  return run(ids)
}

const BULK_FIELDS = ['company', 'department', 'title', 'phone', 'address', 'website'] as const

/**
 * 여러 명함에 공통 값을 일괄 적용. 지정된 필드만 덮어쓰고 태그는 추가/제거/교체.
 * 한 트랜잭션으로 처리하며 수정된 명함 수를 반환한다.
 */
export function bulkUpdateContacts(ids: number[], patch: BulkContactPatch): number {
  if (ids.length === 0) return 0
  const db = getDb()
  const fields = BULK_FIELDS.filter((f) => patch.fields[f] !== undefined)
  const tagPatch = patch.tags
  if (fields.length === 0 && !tagPatch) return 0

  const update =
    fields.length > 0
      ? db.prepare(
          `UPDATE contact SET ${fields.map((f) => `${f} = @${f}`).join(', ')},
           updated_at = datetime('now','localtime') WHERE id = @id`
        )
      : null
  const touch = db.prepare(
    `UPDATE contact SET updated_at = datetime('now','localtime') WHERE id = ?`
  )
  const values: Record<string, string> = {}
  for (const f of fields) values[f] = String(patch.fields[f] ?? '').trim()
  const patchTags = normalizeTags(tagPatch?.values)

  const run = db.transaction((targets: number[]) => {
    const existing = getContacts(targets)
    for (const c of existing) {
      if (update) update.run({ ...values, id: c.id })
      if (tagPatch) {
        let next: string[]
        if (tagPatch.mode === 'replace') next = patchTags
        else if (tagPatch.mode === 'remove') next = c.tags.filter((t) => !patchTags.includes(t))
        else next = [...c.tags, ...patchTags]
        saveTags(c.id, next)
        if (!update) touch.run(c.id)
      }
    }
    return existing.length
  })
  return run(ids)
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
          // 파일에 태그 열이 없으면 기존 태그를 지우지 않고 유지
          const tags = item.tags?.length ? item.tags : (getContacts([existing.id])[0]?.tags ?? [])
          updateContact(existing.id, { ...item, tags })
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

type TemplateRow = Omit<EmailTemplate, 'attachments'> & { attachments: string }

function parseAttachments(json: string): TemplateAttachment[] {
  try {
    const arr = JSON.parse(json)
    if (!Array.isArray(arr)) return []
    return arr
      .filter((a) => a && typeof a.path === 'string' && typeof a.name === 'string')
      .map((a) => ({ name: a.name, path: a.path, size: Number(a.size) || 0 }))
  } catch {
    return []
  }
}

function rowToTemplate(row: TemplateRow): EmailTemplate {
  return { ...row, attachments: parseAttachments(row.attachments) }
}

function serializeAttachments(list: TemplateAttachment[] | undefined): string {
  return JSON.stringify(
    (list ?? []).map((a) => ({ name: a.name, path: a.path, size: Number(a.size) || 0 }))
  )
}

/** 모든 템플릿이 참조하는 첨부 경로로 앱 데이터 폴더의 첨부 파일을 정리 */
function pruneTemplateAttachments(): void {
  const rows = getDb().prepare('SELECT attachments FROM template').all() as {
    attachments: string
  }[]
  pruneAttachments(rows.flatMap((r) => parseAttachments(r.attachments).map((a) => a.path)))
}

export function listTemplates(): EmailTemplate[] {
  return (
    getDb()
      .prepare('SELECT * FROM template ORDER BY last_used_at DESC NULLS LAST, updated_at DESC')
      .all() as TemplateRow[]
  ).map(rowToTemplate)
}

export function getTemplate(id: number): EmailTemplate | undefined {
  const row = getDb().prepare('SELECT * FROM template WHERE id = ?').get(id) as
    TemplateRow | undefined
  return row ? rowToTemplate(row) : undefined
}

export function createTemplate(input: TemplateInput): EmailTemplate {
  const db = getDb()
  if (!input.name?.trim()) throw new Error('템플릿 이름은 필수입니다')
  const info = db
    .prepare('INSERT INTO template (name, subject_tpl, body_tpl, attachments) VALUES (?, ?, ?, ?)')
    .run(
      input.name.trim(),
      input.subject_tpl ?? '',
      input.body_tpl ?? '',
      serializeAttachments(input.attachments)
    )
  pruneTemplateAttachments()
  return getTemplate(Number(info.lastInsertRowid))!
}

export function updateTemplate(id: number, input: TemplateInput): EmailTemplate {
  const db = getDb()
  if (!input.name?.trim()) throw new Error('템플릿 이름은 필수입니다')
  db.prepare(
    `UPDATE template SET name = ?, subject_tpl = ?, body_tpl = ?, attachments = ?,
     updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(
    input.name.trim(),
    input.subject_tpl ?? '',
    input.body_tpl ?? '',
    serializeAttachments(input.attachments),
    id
  )
  pruneTemplateAttachments()
  return getTemplate(id)!
}

export function deleteTemplate(id: number): void {
  getDb().prepare('DELETE FROM template WHERE id = ?').run(id)
  pruneTemplateAttachments()
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

const DEFAULT_SETTINGS: AppSettings = {
  outlookMode: 'auto',
  signatureHtml: '',
  signatureEnabled: true,
  defaultCc: '',
  defaultCcEnabled: true,
  defaultBcc: '',
  defaultBccEnabled: true
}

/** '1'/'0'로 저장된 불리언 설정. 값이 없으면 기본값 */
const flag = (v: string | undefined, fallback: boolean): boolean =>
  v === undefined ? fallback : v === '1'

export function getSettings(): AppSettings {
  const rows = getDb().prepare('SELECT key, value FROM setting').all() as {
    key: string
    value: string
  }[]
  const map = new Map(rows.map((r) => [r.key, r.value]))
  const mode = map.get('outlook_mode')
  return {
    outlookMode: mode === 'com' || mode === 'eml' ? mode : DEFAULT_SETTINGS.outlookMode,
    signatureHtml: map.get('signature_html') ?? DEFAULT_SETTINGS.signatureHtml,
    signatureEnabled: flag(map.get('signature_enabled'), DEFAULT_SETTINGS.signatureEnabled),
    defaultCc: map.get('default_cc') ?? DEFAULT_SETTINGS.defaultCc,
    defaultCcEnabled: flag(map.get('default_cc_enabled'), DEFAULT_SETTINGS.defaultCcEnabled),
    defaultBcc: map.get('default_bcc') ?? DEFAULT_SETTINGS.defaultBcc,
    defaultBccEnabled: flag(map.get('default_bcc_enabled'), DEFAULT_SETTINGS.defaultBccEnabled)
  }
}

export function saveSettings(input: AppSettings): AppSettings {
  const db = getDb()
  const upsert = db.prepare(
    'INSERT INTO setting (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  )
  const mode =
    input.outlookMode === 'com' || input.outlookMode === 'eml' ? input.outlookMode : 'auto'
  db.transaction(() => {
    upsert.run('outlook_mode', mode)
    upsert.run('signature_html', String(input.signatureHtml ?? ''))
    upsert.run('signature_enabled', input.signatureEnabled === false ? '0' : '1')
    upsert.run('default_cc', String(input.defaultCc ?? '').trim())
    upsert.run('default_cc_enabled', input.defaultCcEnabled === false ? '0' : '1')
    upsert.run('default_bcc', String(input.defaultBcc ?? '').trim())
    upsert.run('default_bcc_enabled', input.defaultBccEnabled === false ? '0' : '1')
  })()
  return getSettings()
}
