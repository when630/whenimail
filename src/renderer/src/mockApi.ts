import type { WhenimailApi } from '../../shared/api'
import type { Contact, DraftLog, EmailTemplate } from '../../shared/types'

/**
 * preload 없이(순수 브라우저에서) 렌더러를 열었을 때만 활성화되는 목 API.
 * UI 개발·디자인 확인용이며, Electron 안에서는 preload의 실제 API가 우선한다.
 */
export function installMockApiIfNeeded(): void {
  if (typeof window === 'undefined' || window.api) return

  const now = '2026-09-01 10:00:00'
  const contacts: Contact[] = [
    {
      id: 1,
      name: '김서연',
      company: '한빛물산',
      department: '구매팀',
      title: '팀장',
      email: 'sy.kim@hanbit.example',
      phone: '02-1234-5678',
      mobile: '010-1234-5678',
      address: '서울 중구',
      website: '',
      memo: '9월 전시회에서 인사',
      created_at: now,
      updated_at: now
    },
    {
      id: 2,
      name: '박준호',
      company: '대성테크',
      department: '',
      title: '대표',
      email: 'jh.park@daesung.example',
      phone: '',
      mobile: '010-9876-5432',
      address: '',
      website: 'daesung.example',
      memo: '',
      created_at: now,
      updated_at: now
    },
    {
      id: 3,
      name: '이하은',
      company: '미래로지스',
      department: '영업본부',
      title: '과장',
      email: '',
      phone: '031-555-0100',
      mobile: '',
      address: '',
      website: '',
      memo: '이메일 미확보',
      created_at: now,
      updated_at: now
    }
  ]
  const templates: EmailTemplate[] = [
    {
      id: 1,
      name: '첫 인사 메일',
      subject_tpl: '[{{회사|whenimail}}] {{이름}}님, 반갑습니다',
      body_tpl:
        '{{이름|고객}}님, 안녕하세요.\n\n지난 미팅에서 인사드린 whenimail입니다.\n{{회사|귀사}}의 {{직함|담당자}}님께 도움이 될 자료를 보내드립니다.\n\n감사합니다.',
      last_used_at: now,
      created_at: now,
      updated_at: now
    }
  ]
  const logs: DraftLog[] = [
    {
      id: 1,
      contact_id: 1,
      template_id: 1,
      contact_name: '김서연',
      contact_email: 'sy.kim@hanbit.example',
      template_name: '첫 인사 메일',
      subject_rendered: '[한빛물산] 김서연님, 반갑습니다',
      adapter: 'eml',
      created_at: now
    }
  ]

  const api: WhenimailApi = {
    contacts: {
      list: async (search?: string) =>
        search?.trim()
          ? contacts.filter((c) => [c.name, c.company, c.email].some((v) => v.includes(search)))
          : contacts,
      create: async (input) => ({ ...contacts[0], ...input, id: Date.now() }),
      update: async (id, input) => ({ ...contacts[0], ...input, id }),
      remove: async () => undefined
    },
    templates: {
      list: async () => templates,
      create: async (input) => ({ ...templates[0], ...input, id: Date.now() }),
      update: async (id, input) => ({ ...templates[0], ...input, id }),
      remove: async () => undefined
    },
    drafts: {
      create: async (contactIds) =>
        contactIds.map((id) => ({
          contactId: id,
          contactName: contacts.find((c) => c.id === id)?.name ?? '?',
          ok: true,
          adapter: 'eml' as const
        })),
      history: async () => logs
    },
    system: {
      outlookMode: async () => 'eml',
      openDataFolder: async () => ''
    }
  }

  window.api = api
}
