import { useCallback, useEffect, useState } from 'react'
import { ContactRound, Pencil, Plus, Search, SendHorizontal, Trash2 } from 'lucide-react'
import type { Contact, ContactInput } from '../../../shared/types'
import Avatar from '../components/Avatar'
import ContactForm from './ContactForm'
import ComposeModal from './ComposeModal'

export default function ContactsView(): React.JSX.Element {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<Contact | 'new' | null>(null)
  const [composeTargets, setComposeTargets] = useState<Contact[] | null>(null)

  const reload = useCallback(async (q?: string) => {
    setContacts(await window.api.contacts.list(q))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => reload(search), 150)
    return () => clearTimeout(t)
  }, [search, reload])

  const toggle = (id: number): void => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async (input: ContactInput): Promise<void> => {
    if (editing === 'new') await window.api.contacts.create(input)
    else if (editing) await window.api.contacts.update(editing.id, input)
    setEditing(null)
    await reload(search)
  }

  const remove = async (contact: Contact): Promise<void> => {
    if (!confirm(`'${contact.name}' 명함을 삭제할까요?`)) return
    await window.api.contacts.remove(contact.id)
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(contact.id)
      return next
    })
    await reload(search)
  }

  const openCompose = (targets: Contact[]): void => {
    const withEmail = targets.filter((c) => c.email.trim())
    if (withEmail.length === 0) {
      alert('선택한 명함에 이메일 주소가 없습니다.')
      return
    }
    setComposeTargets(targets)
  }

  const selectedContacts = contacts.filter((c) => selected.has(c.id))

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
        </div>
      </header>

      {contacts.length === 0 ? (
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
                    checked={selected.size > 0 && selected.size === contacts.length}
                    onChange={(e) =>
                      setSelected(e.target.checked ? new Set(contacts.map((c) => c.id)) : new Set())
                    }
                  />
                </th>
                <th>이름</th>
                <th>회사 / 부서</th>
                <th>직함</th>
                <th>이메일</th>
                <th className="col-actions"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => (
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
                    </span>
                  </td>
                  <td>
                    {c.company}
                    {c.department ? ` / ${c.department}` : ''}
                  </td>
                  <td>{c.title}</td>
                  <td>{c.email || <span className="badge warn">이메일 없음</span>}</td>
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
    </div>
  )
}
