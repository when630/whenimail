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
} from './types'

/** preload가 렌더러에 노출하는 window.api 계약 */
export interface WhenimailApi {
  contacts: {
    list: (search?: string) => Promise<Contact[]>
    recent: (limit?: number) => Promise<Contact[]>
    create: (input: ContactInput) => Promise<Contact>
    update: (id: number, input: ContactInput) => Promise<Contact>
    remove: (id: number) => Promise<void>
  }
  import: {
    /** 파일 선택 대화상자 → 파싱. 취소하면 null */
    pick: () => Promise<ImportParseResult | null>
    commit: (rows: ContactInput[], policy: DuplicatePolicy) => Promise<ImportSummary>
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
    outlookMode: () => Promise<OutlookAdapter>
    openDataFolder: () => Promise<string>
  }
}
