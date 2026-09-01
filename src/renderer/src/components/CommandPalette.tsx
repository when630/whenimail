import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Contact as ContactIcon,
  CornerDownLeft,
  FolderOpen,
  History,
  Mail,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Upload
} from 'lucide-react'
import type { Contact, EmailTemplate } from '../../../shared/types'
import Avatar from './Avatar'

export type ViewKey = 'contacts' | 'templates' | 'history' | 'settings'

interface Props {
  onClose: () => void
  onNavigate: (view: ViewKey) => void
  onCompose: (contact: Contact, templateId: number) => void
  onNewContact: () => void
  onImport: () => void
}

interface ActionItem {
  kind: 'action'
  id: string
  label: string
  hint: string
  Icon: typeof Plus
  run: () => void
}

interface ContactItem {
  kind: 'contact'
  id: string
  contact: Contact
}

interface TemplateItem {
  kind: 'template'
  id: string
  template: EmailTemplate
}

type Item = ActionItem | ContactItem | TemplateItem

export default function CommandPalette({
  onClose,
  onNavigate,
  onCompose,
  onNewContact,
  onImport
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null)
  const [pickedContact, setPickedContact] = useState<Contact | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const step: 'root' | 'template' = pickedContact ? 'template' : 'root'

  useEffect(() => {
    inputRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (step !== 'root') return
    const t = setTimeout(async () => {
      // 검색어가 없으면 최근 사용 명함을 기본으로 보여준다
      setContacts(
        query.trim() ? await window.api.contacts.list(query) : await window.api.contacts.recent(5)
      )
    }, 80)
    return () => clearTimeout(t)
  }, [query, step])

  useEffect(() => {
    if (step === 'template' && templates === null) {
      window.api.templates.list().then(setTemplates)
    }
  }, [step, templates])

  const actions = useMemo<ActionItem[]>(() => {
    if (step !== 'root') return []
    const all: ActionItem[] = [
      {
        kind: 'action',
        id: 'new-contact',
        label: '명함 등록',
        hint: '새 명함을 추가합니다',
        Icon: Plus,
        run: onNewContact
      },
      {
        kind: 'action',
        id: 'import',
        label: 'CSV/엑셀 가져오기',
        hint: '연락처 파일 일괄 등록',
        Icon: Upload,
        run: onImport
      },
      {
        kind: 'action',
        id: 'go-contacts',
        label: '명함으로 이동',
        hint: '명함 목록',
        Icon: ContactIcon,
        run: () => onNavigate('contacts')
      },
      {
        kind: 'action',
        id: 'go-templates',
        label: '템플릿으로 이동',
        hint: '이메일 템플릿 관리',
        Icon: Mail,
        run: () => onNavigate('templates')
      },
      {
        kind: 'action',
        id: 'go-history',
        label: '이력으로 이동',
        hint: '초안 생성 기록',
        Icon: History,
        run: () => onNavigate('history')
      },
      {
        kind: 'action',
        id: 'go-settings',
        label: '설정으로 이동',
        hint: 'Outlook 연동·데이터',
        Icon: Settings,
        run: () => onNavigate('settings')
      },
      {
        kind: 'action',
        id: 'open-data',
        label: '데이터 폴더 열기',
        hint: '로컬 저장 위치',
        Icon: FolderOpen,
        run: () => window.api.system.openDataFolder()
      }
    ]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((a) => a.label.toLowerCase().includes(q))
  }, [step, query, onNavigate, onNewContact])

  const contactItems = useMemo<ContactItem[]>(() => {
    if (step !== 'root') return []
    return contacts.slice(0, 6).map((c) => ({ kind: 'contact', id: `contact-${c.id}`, contact: c }))
  }, [step, contacts])

  const templateItems = useMemo<TemplateItem[]>(() => {
    if (step !== 'template' || templates === null) return []
    const q = query.trim().toLowerCase()
    const list = q
      ? templates.filter(
          (t) => t.name.toLowerCase().includes(q) || t.subject_tpl.toLowerCase().includes(q)
        )
      : templates
    return list.slice(0, 8).map((t) => ({ kind: 'template', id: `template-${t.id}`, template: t }))
  }, [step, templates, query])

  const items = useMemo<Item[]>(
    () => (step === 'root' ? [...contactItems, ...actions] : templateItems),
    [step, contactItems, actions, templateItems]
  )

  useEffect(() => {
    setActiveIdx(0)
  }, [query, step])

  const pickContact = (contact: Contact): void => {
    if (contact.email.trim()) {
      setPickedContact(contact)
      setQuery('')
    } else {
      onNavigate('contacts')
      onClose()
    }
  }

  const run = (item: Item): void => {
    if (item.kind === 'action') {
      item.run()
      onClose()
    } else if (item.kind === 'contact') {
      pickContact(item.contact)
    } else if (pickedContact) {
      onCompose(pickedContact, item.template.id)
      onClose()
    }
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[activeIdx]) run(items[activeIdx])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Backspace' && query === '' && step === 'template') {
      e.preventDefault()
      setPickedContact(null)
    }
  }

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-idx="${activeIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  let idx = -1

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="검색 및 실행"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-input">
          <Search size={17} />
          {pickedContact && (
            <button
              className="palette-crumb"
              title="다시 선택 (Backspace)"
              onClick={() => setPickedContact(null)}
            >
              <Avatar name={pickedContact.name} />
              {pickedContact.name}
            </button>
          )}
          <input
            ref={inputRef}
            value={query}
            placeholder={
              step === 'root' ? '이름·회사 검색 또는 명령 실행…' : '보낼 템플릿 검색…'
            }
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef}>
          {step === 'root' && contactItems.length > 0 && (
            <div className="palette-group">{query.trim() ? '명함' : '최근 명함'}</div>
          )}
          {contactItems.map((item) => {
            idx += 1
            const i = idx
            const c = item.contact
            const hasEmail = Boolean(c.email.trim())
            return (
              <button
                key={item.id}
                data-idx={i}
                className={`palette-item ${i === activeIdx ? 'active' : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => run(item)}
              >
                <Avatar name={c.name} />
                <span className="palette-item-main">
                  <span className="palette-item-label">{c.name}</span>
                  <span className="palette-item-hint">
                    {[c.company, c.title].filter(Boolean).join(' · ') || c.email}
                  </span>
                </span>
                {hasEmail ? (
                  <span className="palette-item-action">
                    <CornerDownLeft size={13} />
                    템플릿 선택
                  </span>
                ) : (
                  <span className="badge warn">이메일 없음</span>
                )}
              </button>
            )
          })}
          {step === 'root' && actions.length > 0 && <div className="palette-group">액션</div>}
          {actions.map((item) => {
            idx += 1
            const i = idx
            return (
              <button
                key={item.id}
                data-idx={i}
                className={`palette-item ${i === activeIdx ? 'active' : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => run(item)}
              >
                <span className="palette-item-icon">
                  <item.Icon size={16} />
                </span>
                <span className="palette-item-main">
                  <span className="palette-item-label">{item.label}</span>
                  <span className="palette-item-hint">{item.hint}</span>
                </span>
              </button>
            )
          })}
          {step === 'template' && templateItems.length > 0 && (
            <div className="palette-group">템플릿 — {pickedContact?.name}님에게 보낼 메일</div>
          )}
          {templateItems.map((item) => {
            idx += 1
            const i = idx
            const t = item.template
            return (
              <button
                key={item.id}
                data-idx={i}
                className={`palette-item ${i === activeIdx ? 'active' : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => run(item)}
              >
                <span className="palette-item-icon">
                  <Mail size={16} />
                </span>
                <span className="palette-item-main">
                  <span className="palette-item-label">{t.name}</span>
                  <span className="palette-item-hint">{t.subject_tpl || '(제목 없음)'}</span>
                </span>
                <span className="palette-item-action">
                  <SendHorizontal size={13} />
                  초안 열기
                </span>
              </button>
            )
          })}
          {step === 'template' && templates !== null && templateItems.length === 0 && (
            <div className="palette-empty">
              {templates.length === 0
                ? '템플릿이 없습니다. 템플릿 메뉴에서 먼저 만들어 주세요.'
                : '검색 결과가 없습니다'}
            </div>
          )}
          {step === 'root' && items.length === 0 && (
            <div className="palette-empty">결과가 없습니다</div>
          )}
        </div>
        <div className="palette-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 이동
          </span>
          <span>
            <kbd>Enter</kbd> {step === 'root' ? '선택' : '초안 열기'}
          </span>
          {step === 'template' && (
            <span>
              <kbd>⌫</kbd> 뒤로
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
