export interface Contact {
  id: number
  name: string
  company: string
  department: string
  title: string
  email: string
  phone: string
  mobile: string
  address: string
  website: string
  memo: string
  created_at: string
  updated_at: string
}

export type ContactInput = Omit<Contact, 'id' | 'created_at' | 'updated_at'>

export interface EmailTemplate {
  id: number
  name: string
  subject_tpl: string
  body_tpl: string
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export type TemplateInput = Pick<EmailTemplate, 'name' | 'subject_tpl' | 'body_tpl'>

export type OutlookAdapter = 'com' | 'eml' | 'mailto'

export interface DraftLog {
  id: number
  contact_id: number | null
  template_id: number | null
  contact_name: string
  contact_email: string
  template_name: string
  subject_rendered: string
  adapter: OutlookAdapter
  created_at: string
}

export interface DraftResult {
  contactId: number
  contactName: string
  ok: boolean
  adapter?: OutlookAdapter
  error?: string
}

export interface ImportParseResult {
  fileName: string
  headers: string[]
  rows: string[][]
}

export type DuplicatePolicy = 'skip' | 'overwrite'

export interface ImportSummary {
  inserted: number
  updated: number
  skipped: number
  /** 이름이 비어 건너뛴 행 수 */
  invalid: number
}

export interface RenderWarning {
  variable: string
  /** 값이 비어 기본값이 쓰였으면 그 기본값, 기본값도 없으면 null */
  usedDefault: string | null
}
