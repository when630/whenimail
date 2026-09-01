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
  card_image_path: string
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

export interface OcrScanResult {
  /** 추출된 필드 (확신 없는 필드는 없음) */
  fields: Partial<ContactInput>
  /** 앱 데이터 폴더로 복사된 명함 이미지 경로 */
  imagePath: string
  /** 미리보기용 데이터 URL */
  imageDataUrl: string
  rawText: string
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
