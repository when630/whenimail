import { useCallback, useEffect, useState } from 'react'
import type { Contact, ContactInput } from '../../../shared/types'
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
          <input
            className="search"
            placeholder="이름·회사·이메일 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            className="btn primary"
            disabled={selected.size === 0}
            onClick={() => openCompose(selectedContacts)}
          >
            ✉️ 메일 쓰기{selected.size > 0 ? ` (${selected.size})` : ''}
          </button>
          <button className="btn" onClick={() => setEditing('new')}>
            + 명함 등록
          </button>
        </div>
      </header>

      {contacts.length === 0 ? (
        <div className="empty">
          {search ? '검색 결과가 없습니다.' : '아직 등록된 명함이 없습니다. 첫 명함을 등록해 보세요.'}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th className="col-check">
                <input
                  type="checkbox"
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
            {contacts.map((c) => (
              <tr key={c.id} className={selected.has(c.id) ? 'row-selected' : ''}>
                <td className="col-check">
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                </td>
                <td className="cell-name" onClick={() => setEditing(c)}>
                  {c.name}
                </td>
                <td>
                  {c.company}
                  {c.department ? ` / ${c.department}` : ''}
                </td>
                <td>{c.title}</td>
                <td>{c.email || <span className="warn-badge">이메일 없음</span>}</td>
                <td className="col-actions">
                  <button className="btn sm" onClick={() => openCompose([c])} disabled={!c.email.trim()}>
                    메일
                  </button>
                  <button className="btn sm" onClick={() => setEditing(c)}>
                    편집
                  </button>
                  <button className="btn sm danger" onClick={() => remove(c)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
