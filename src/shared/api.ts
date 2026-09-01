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
  TagCount,
  TemplateInput,
  UpdateState
} from './types'

/** preload가 렌더러에 노출하는 window.api 계약 */
export interface WhenimailApi {
  contacts: {
    list: (search?: string, tag?: string) => Promise<Contact[]>
    recent: (limit?: number) => Promise<Contact[]>
    create: (input: ContactInput) => Promise<Contact>
    update: (id: number, input: ContactInput) => Promise<Contact>
    remove: (id: number) => Promise<void>
  }
  tags: {
    list: () => Promise<TagCount[]>
  }
  import: {
    /** 파일 선택 대화상자 → 파싱. 취소하면 null */
    pick: () => Promise<ImportParseResult | null>
    commit: (rows: ContactInput[], policy: DuplicatePolicy) => Promise<ImportSummary>
  }
  ocr: {
    /** 명함 이미지 선택 → OCR → 필드 추출. 취소하면 null */
    scanCard: () => Promise<OcrScanResult | null>
  }
  files: {
    /** 앱 데이터 폴더의 명함 이미지를 미리보기용 데이터 URL로 */
    imageDataUrl: (path: string) => Promise<string>
  }
  templates: {
    list: () => Promise<EmailTemplate[]>
    create: (input: TemplateInput) => Promise<EmailTemplate>
    update: (id: number, input: TemplateInput) => Promise<EmailTemplate>
    remove: (id: number) => Promise<void>
  }
  drafts: {
    create: (contactIds: number[], templateId: number) => Promise<DraftResult[]>
    history: () => Promise<DraftLog[]>
  }
  system: {
    version: () => Promise<string>
    outlookMode: () => Promise<OutlookAdapter>
    openDataFolder: () => Promise<string>
  }
  update: {
    /** 현재 업데이트 상태 조회 */
    state: () => Promise<UpdateState>
    /** 수동 업데이트 확인 트리거 */
    check: () => Promise<UpdateState>
    /** 다운로드된 업데이트 설치(앱 재시작) */
    install: () => Promise<void>
    /** 상태 변화 구독. 반환값은 구독 해제 함수 */
    onState: (cb: (state: UpdateState) => void) => () => void
  }
  backup: {
    /** zip으로 내보내기. 취소 시 null, 성공 시 저장 경로 */
    export: () => Promise<string | null>
    /** zip에서 복원. 성공하면 앱이 재시작된다. 취소 시 false */
    import: () => Promise<boolean>
  }
}
