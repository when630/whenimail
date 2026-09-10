import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ContactRound,
  Image as ImageIcon,
  Pencil,
  PencilRuler,
  Plus,
  Search,
  SendHorizontal,
  Trash2,
  Upload
} from 'lucide-react'
import type { BulkContactPatch, Contact, ContactInput, TagCount } from '../../../shared/types'
import Avatar from '../components/Avatar'
import { useDialog } from '../components/dialogs'
import ContactForm from './ContactForm'
import ComposeModal from './ComposeModal'
import ImportModal from './ImportModal'
import BulkEditModal from './BulkEditModal'

export default function ContactsView({
  newContactSignal = 0,
  importSignal = 0
}: {
  newContactSignal?: number
  importSignal?: number
}): React.JSX.Element {
  const [contacts, setContacts] = useState<Contact[] | null>(null)
  const [search, setSearch] = useState('')
  const [allTags, setAllTags] = useState<TagCount[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)
  const [composeTargets, setComposeTargets] = useState<Contact[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [bulkEditing, setBulkEditing] = useState(false)
  const { confirm, toast } = useDialog()

  const reload = useCallback(async (q?: string, tag?: string | null) => {
    const [list, tags] = await Promise.all([
      window.api.contacts.list(q, tag ?? undefined),
      window.api.tags.list()
    ])
    setContacts(list)
    setAllTags(tags)
  }, [])

  const firstLoad = useRef(true)
  useEffect(() => {
    // 첫 로드·태그 전환은 즉시, 검색 입력은 디바운스
    if (firstLoad.current) {
      firstLoad.current = false
      reload(search, activeTag)
      return
    }
    const t = setTimeout(() => reload(search, activeTag), 150)
    return () => clearTimeout(t)
  }, [search, activeTag, reload])

  useEffect(() => {
    if (newContactSignal > 0) setEditing('new')
  }, [newContactSignal])

  useEffect(() => {
    if (importSignal > 0) setImporting(true)
  }, [importSignal])

  const toggle = (id: number): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async (input: ContactInput): Promise<void> => {
    const isNew = editing === 'new'
    if (isNew) await window.api.contacts.create(input)
    else if (editing) await window.api.contacts.update(editing.id, input)
    setEditing(null)
    await reload(search, activeTag)
    toast(isNew ? '명함이 등록되었습니다' : '저장되었습니다')
  }

  const remove = async (contact: Contact): Promise<void> => {
    const ok = await confirm({
      title: '명함 삭제',
      message: `'${contact.name}' 명함을 삭제할까요?\n삭제한 명함은 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      danger: true
    })
    if (!ok) return
    await window.api.contacts.remove(contact.id)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(contact.id)
      return next
    })
    await reload(search, activeTag)
    toast('삭제되었습니다')
  }

  /** 현재 목록에 보이는 선택 명함만 일괄 처리 대상 (필터로 숨은 것은 제외) */
  const removeMany = async (targets: Contact[]): Promise<void> => {
    if (targets.length === 0) return
    const ok = await confirm({
      title: '명함 일괄 삭제',
      message: `선택한 명함 ${targets.length}개를 삭제할까요?
삭제한 명함은 되돌릴 수 없습니다.`,
      confirmLabel: `${targets.length}개 삭제`,
      danger: true
    })
    if (!ok) return
    try {
      const removed = await window.api.contacts.removeMany(targets.map((c) => c.id))
      setSelected(new Set())
      await reload(search, activeTag)
      toast(`${removed}개 명함을 삭제했습니다`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const applyBulk = async (targets: Contact[], patch: BulkContactPatch): Promise<void> => {
    try {
      const updated = await window.api.contacts.bulkUpdate(
        targets.map((c) => c.id),
        patch
      )
      setBulkEditing(false)
      await reload(search, activeTag)
      toast(`${updated}개 명함을 수정했습니다`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    }
  }

  const openCompose = (targets: Contact[]): void => {
    const withEmail = targets.filter((c) => c.email.trim())
    if (withEmail.length === 0) {
      toast('선택한 명함에 이메일 주소가 없습니다', 'warn')
      return
    }
    setComposeTargets(targets)
  }

  const list = contacts ?? []
  const selectedContacts = list.filter((c) => selected.has(c.id))

  return (
    <div className="view">
      <header className="view-header">
        <h1>명함</h1>
        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder="이름·회사·이메일 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            className="btn primary"
            disabled={selected.size === 0}
            onClick={() => openCompose(selectedContacts)}
          >
            <SendHorizontal size={15} />
            메일 쓰기{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          <button className="btn" onClick={() => setEditing('new')}>
            <Plus size={15} />
            명함 등록
          </button>
          <button
            className="btn"
            onClick={() => setImporting(true)}
            title="CSV/엑셀 가져오기"
            aria-label="CSV/엑셀 가져오기"
          >
            <Upload size={15} />
          </button>
        </div>
      </header>

      {selectedContacts.length > 0 && (
        <div className="selection-bar" role="toolbar" aria-label="선택한 명함 작업">
          <strong>{selectedContacts.length}개 선택</strong>
          <span className="spacer" />
          <button className="btn sm" onClick={() => setBulkEditing(true)}>
            <PencilRuler size={14} />
            일괄 수정
          </button>
          <button className="btn sm danger" onClick={() => removeMany(selectedContacts)}>
            <Trash2 size={14} />
            삭제
          </button>
          <button className="btn ghost sm" onClick={() => setSelected(new Set())}>
            선택 해제
          </button>
        </div>
      )}

      {allTags.length > 0 && (
        <div className="tag-filter">
          <button
            className={`chip ${activeTag === null ? 'chip-active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            전체
          </button>
          {allTags.map((t) => (
            <button
              key={t.name}
              className={`chip ${activeTag === t.name ? 'chip-active' : ''}`}
              onClick={() => setActiveTag(activeTag === t.name ? null : t.name)}
            >
              {t.name} <span className="chip-count">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {contacts === null ? null : list.length === 0 ? (
        <div className="empty">
          <ContactRound size={36} strokeWidth={1.4} />
          {search ? (
            <span className="empty-title">검색 결과가 없습니다</span>
          ) : (
            <>
              <span className="empty-title">아직 등록된 명함이 없습니다</span>
              <span>첫 명함을 등록해 보세요.</span>
              <button className="btn primary" onClick={() => setEditing('new')}>
                <Plus size={15} />
                명함 등록
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th className="col-check">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={selected.size > 0 && selected.size === list.length}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(list.map((c) => c.id)) : new Set())
                    }
                  />
                </th>
                <th>이름</th>
                <th>회사 / 부서</th>
                <th>직함</th>
                <th>이메일</th>
                <th>태그</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c, i) => (
                <tr
                  key={c.id}
                  className={selected.has(c.id) ? 'row-selected' : ''}
                  style={{ animationDelay: `${Math.min(i, 14) * 22}ms` }}
                >
                  <td className="col-check">
                    <input
                      type="checkbox"
                      aria-label={`${c.name} 선택`}
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td className="cell-name" onClick={() => setEditing(c)}>
                    <span className="name-with-avatar">
                      <Avatar name={c.name} />
                      {c.name}
                      {c.card_image_path && (
                        <ImageIcon size={13} className="muted" aria-label="명함 이미지 있음" />
                      )}
                    </span>
                  </td>
                  <td>
                    {c.company}
                    {c.department ? ` / ${c.department}` : ''}
                  </td>
                  <td>{c.title}</td>
                  <td className="cell-email" title={c.email}>
                    {c.email || <span className="badge warn">이메일 없음</span>}
                  </td>
                  <td className="cell-tags">
                    <span className="tag-list">
                      {c.tags.slice(0, 3).map((t) => (
                        <span key={t} className="badge neutral">
                          {t}
                        </span>
                      ))}
                      {c.tags.length > 3 && <span className="muted">+{c.tags.length - 3}</span>}
                    </span>
                  </td>
                  <td className="col-actions">
                    <button
                      className="btn ghost sm"
                      onClick={() => openCompose([c])}
                      disabled={!c.email.trim()}
                    >
                      <SendHorizontal size={14} />
                      메일
                    </button>
                    <button
                      className="btn ghost sm icon-only"
                      aria-label={`${c.name} 편집`}
                      onClick={() => setEditing(c)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn ghost sm icon-only danger"
                      aria-label={`${c.name} 삭제`}
                      onClick={() => remove(c)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ContactForm
          contact={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {composeTargets && (
        <ComposeModal contacts={composeTargets} onClose={() => setComposeTargets(null)} />
      )}
      {bulkEditing && selectedContacts.length > 0 && (
        <BulkEditModal
          count={selectedContacts.length}
          tagOptions={allTags.map((t) => t.name)}
          onApply={(patch) => applyBulk(selectedContacts, patch)}
          onClose={() => setBulkEditing(false)}
        />
      )}
      {importing && (
        <ImportModal
          onClose={(imported) => {
            setImporting(false)
            if (imported) reload(search, activeTag)
          }}
        />
      )}
    </div>
  )
}
