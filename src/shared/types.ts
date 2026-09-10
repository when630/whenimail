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
  tags: string[]
  created_at: string
  updated_at: string
}

export type ContactInput = Omit<Contact, 'id' | 'created_at' | 'updated_at'>

export interface TagCount {
  name: string
  count: number
}

export interface EmailTemplate {
  id: number
  name: string
  subject_tpl: string
  body_tpl: string
  attachments: TemplateAttachment[]
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export type TemplateInput = Pick<EmailTemplate, 'name' | 'subject_tpl' | 'body_tpl' | 'attachments'>

/** 템플릿 첨부 파일 — 앱 데이터 폴더(attachments/)로 복사된 사본을 가리킨다 */
export interface TemplateAttachment {
  /** 원본 파일명 (메일에 보이는 이름) */
  name: string
  /** 복사본 절대 경로 */
  path: string
  size: number
}

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

export interface UpdateState {
  status: 'idle' | 'checking' | 'available' | 'none' | 'downloading' | 'ready' | 'error'
  /** 새 버전 (available/downloading/ready) */
  version?: string
  /** 다운로드 진행률 0~100 */
  percent?: number
  message?: string
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

/** 설정에서 고른 Outlook 연동 방식. auto는 설치 여부로 자동 감지 */
export type OutlookModePref = 'auto' | 'com' | 'eml'

export interface AppSettings {
  outlookMode: OutlookModePref
  /** 본문 아래에 붙일 앱 자체 서명(HTML). 비우면 Outlook 기본 서명에 맡긴다 */
  signatureHtml: string
  /** 서명을 실제로 붙일지 — 끄면 값은 보존하되 적용하지 않는다 */
  signatureEnabled: boolean
  /** 초안 모달을 열 때 미리 채워지는 참조 주소 (쉼표/세미콜론 구분) */
  defaultCc: string
  defaultCcEnabled: boolean
  /** 초안 모달을 열 때 미리 채워지는 숨은 참조 주소 */
  defaultBcc: string
  defaultBccEnabled: boolean
}

/** 초안 생성 시 모든 수신자에게 공통 적용되는 옵션 */
export interface DraftOptions {
  /** 참조 — 쉼표/세미콜론 구분 */
  cc?: string
  /** 숨은 참조 — 쉼표/세미콜론 구분 */
  bcc?: string
  /** 이번 초안에 앱 서명을 붙일지 (기본: 설정의 서명 사용 여부) */
  includeSignature?: boolean
}

/** 여러 명함에 공통 적용하는 일괄 수정 내용 */
export interface BulkContactPatch {
  /** 값이 있는 키만 덮어쓴다 (빈 문자열도 "비우기"로 적용) */
  fields: Partial<
    Pick<ContactInput, 'company' | 'department' | 'title' | 'phone' | 'address' | 'website'>
  >
  tags?: {
    mode: 'add' | 'remove' | 'replace'
    values: string[]
  }
}
