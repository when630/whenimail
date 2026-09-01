import { useEffect, useRef, useState } from 'react'
import { CircleAlert, Mail, Plus, Save, Trash2 } from 'lucide-react'
import type { EmailTemplate, TemplateInput } from '../../../shared/types'
import { TEMPLATE_VARIABLES } from '../../../shared/render'
import { useDialog } from '../components/dialogs'

const EMPTY: TemplateInput = { name: '', subject_tpl: '', body_tpl: '' }

export default function TemplatesView(): React.JSX.Element {
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null)
  const [selectedId, setSelectedId] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<TemplateInput>(EMPTY)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const { confirm, toast } = useDialog()

  const reload = async (keepId?: number): Promise<void> => {
    const list = await window.api.templates.list()
    setTemplates(list)
    if (keepId !== undefined) await selectTemplate(list.find((t) => t.id === keepId) ?? null)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectTemplate = async (t: EmailTemplate | null | 'new'): Promise<void> => {
    if (dirty) {
      const ok = await confirm({
        title: '저장하지 않은 변경',
        message: '저장하지 않은 변경이 있습니다. 이동하면 변경 내용이 사라집니다.',
        confirmLabel: '이동'
      })
      if (!ok) return
    }
    if (t === 'new') {
      setSelectedId('new')
      setForm(EMPTY)
    } else if (t) {
      setSelectedId(t.id)
      setForm({ name: t.name, subject_tpl: t.subject_tpl, body_tpl: t.body_tpl })
    } else {
      setSelectedId(null)
      setForm(EMPTY)
    }
    setDirty(false)
  }

  const set = (key: keyof TemplateInput, value: string): void => {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
  }

  const insertVariable = (name: string): void => {
    const ta = bodyRef.current
    const token = `{{${name}}}`
    if (!ta) {
      set('body_tpl', form.body_tpl + token)
      return
    }
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const next = form.body_tpl.slice(0, start) + token + form.body_tpl.slice(end)
    set('body_tpl', next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + token.length
    })
  }

  const save = async (): Promise<void> => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (selectedId === 'new') {
        const created = await window.api.templates.create(form)
        await reload(created.id)
      } else if (typeof selectedId === 'number') {
        await window.api.templates.update(selectedId, form)
        await reload(selectedId)
      }
      setDirty(false)
      toast('저장되었습니다')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (t: EmailTemplate): Promise<void> => {
    const ok = await confirm({
      title: '템플릿 삭제',
      message: `'${t.name}' 템플릿을 삭제할까요?`,
      confirmLabel: '삭제',
      danger: true
    })
    if (!ok) return
    await window.api.templates.remove(t.id)
    setSelectedId(null)
    setForm(EMPTY)
    setDirty(false)
    await reload()
    toast('삭제되었습니다')
  }

  return (
    <div className="view view-split">
      <div className="split-list">
        <header className="view-header">
          <h1>템플릿</h1>
          <button className="btn" onClick={() => selectTemplate('new')}>
            <Plus size={15} />새 템플릿
          </button>
        </header>
        {templates === null ? null : templates.length === 0 ? (
          <div className="empty">
            <Mail size={32} strokeWidth={1.4} />
            <span className="empty-title">템플릿이 없습니다</span>
          </div>
        ) : (
          <ul className="side-list">
            {templates.map((t) => (
              <li
                key={t.id}
                className={selectedId === t.id ? 'active' : ''}
                onClick={() => selectTemplate(t)}
              >
                <strong>{t.name}</strong>
                <small>{t.subject_tpl || '(제목 없음)'}</small>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="split-editor">
        {selectedId === null ? (
          <div className="empty">
            <Mail size={32} strokeWidth={1.4} />
            <span className="empty-title">템플릿을 선택하세요</span>
            <span>왼쪽 목록에서 선택하거나 새로 만들 수 있습니다.</span>
          </div>
        ) : (
          <>
            <label className="form-field">
              <span>템플릿 이름</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label className="form-field">
              <span>제목</span>
              <input
                value={form.subject_tpl}
                placeholder="예: [{{회사|whenimail}}] {{이름}}님, 안녕하세요"
                onChange={(e) => set('subject_tpl', e.target.value)}
              />
            </label>
            <div className="variable-bar">
              {Object.keys(TEMPLATE_VARIABLES).map((v) => (
                <button key={v} className="chip" onClick={() => insertVariable(v)}>
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
            <label className="form-field form-field-grow">
              <span>본문 — 변수는 {'{{이름}}'} 또는 기본값 포함 {'{{이름|고객}}'} 형식</span>
              <textarea
                ref={bodyRef}
                value={form.body_tpl}
                placeholder={'{{이름|고객}}님, 안녕하세요.\n지난번 미팅에서 인사드린 ...'}
                onChange={(e) => set('body_tpl', e.target.value)}
              />
            </label>
            <div className="editor-actions">
              {typeof selectedId === 'number' && (
                <button
                  className="btn ghost danger"
                  onClick={() => {
                    const t = templates?.find((x) => x.id === selectedId)
                    if (t) remove(t)
                  }}
                >
                  <Trash2 size={15} />
                  삭제
                </button>
              )}
              <span className="spacer" />
              {dirty && (
                <span className="dirty-hint">
                  <CircleAlert size={14} />
                  저장되지 않음
                </span>
              )}
              <button className="btn primary" onClick={save} disabled={saving || !form.name.trim()}>
                <Save size={15} />
                저장
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
