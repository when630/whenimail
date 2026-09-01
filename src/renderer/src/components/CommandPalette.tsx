import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Contact as ContactIcon,
  FolderOpen,
  History,
  Mail,
  Plus,
  Search,
  SendHorizontal,
  Settings
} from 'lucide-react'
import type { Contact } from '../../../shared/types'
import Avatar from './Avatar'

export type ViewKey = 'contacts' | 'templates' | 'history' | 'settings'

interface Props {
  onClose: () => void
  onNavigate: (view: ViewKey) => void
  onCompose: (contact: Contact) => void
  onNewContact: () => void
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

type Item = ActionItem | ContactItem

export default function CommandPalette({
  onClose,
  onNavigate,
  onCompose,
  onNewContact
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const t = setTimeout(async () => {
      setContacts(await window.api.contacts.list(query))
    }, 80)
    return () => clearTimeout(t)
  }, [query])

  const actions = useMemo<ActionItem[]>(() => {
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
  }, [query, onNavigate, onNewContact])

  const contactItems = useMemo<ContactItem[]>(
    () =>
      contacts.slice(0, 6).map((c) => ({ kind: 'contact', id: `contact-${c.id}`, contact: c })),
    [contacts]
  )

  const items = useMemo<Item[]>(() => [...contactItems, ...actions], [contactItems, actions])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const run = (item: Item): void => {
    if (item.kind === 'action') {
      item.run()
      onClose()
      return
    }
    if (item.contact.email.trim()) {
      onCompose(item.contact)
      onClose()
    } else {
      onNavigate('contacts')
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
          <input
            ref={inputRef}
            value={query}
            placeholder="이름·회사 검색 또는 명령 실행…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="palette-list" ref={listRef}>
          {contactItems.length > 0 && <div className="palette-group">명함</div>}
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
                    <SendHorizontal size={13} />
                    초안 열기
                  </span>
                ) : (
                  <span className="badge warn">이메일 없음</span>
                )}
              </button>
            )
          })}
          {actions.length > 0 && <div className="palette-group">액션</div>}
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
          {items.length === 0 && <div className="palette-empty">결과가 없습니다</div>}
        </div>
        <div className="palette-footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 이동
          </span>
          <span>
            <kbd>Enter</kbd> 실행
          </span>
        </div>
      </div>
    </div>
  )
}
