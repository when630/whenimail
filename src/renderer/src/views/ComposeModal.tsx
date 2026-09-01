import { useEffect, useMemo, useState } from 'react'
import type { Contact, DraftResult, EmailTemplate } from '../../../shared/types'
import { renderTemplate } from '../../../shared/render'

interface Props {
  contacts: Contact[]
  onClose: () => void
}

export default function ComposeModal({ contacts, onClose }: Props): React.JSX.Element {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [previewIdx, setPreviewIdx] = useState(0)
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<DraftResult[] | null>(null)

  useEffect(() => {
    window.api.templates.list().then((list) => {
      setTemplates(list)
      if (list.length > 0) setTemplateId(list[0].id)
    })
  }, [])

  const targets = useMemo(() => contacts.filter((c) => c.email.trim()), [contacts])
  const skipped = contacts.length - targets.length
  const template = templates.find((t) => t.id === templateId) ?? null
  const previewContact = targets[Math.min(previewIdx, targets.length - 1)] ?? null

  const preview = useMemo(() => {
    if (!template || !previewContact) return null
    const subject = renderTemplate(template.subject_tpl, previewContact)
    const body = renderTemplate(template.body_tpl, previewContact)
    return { subject, body, warnings: [...subject.warnings, ...body.warnings] }
  }, [template, previewContact])

  const createDrafts = async (): Promise<void> => {
    if (!template) return
    setSending(true)
    try {
      setResults(
        await window.api.drafts.create(
          targets.map((c) => c.id),
          template.id
        )
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <h2>메일 초안 만들기</h2>

        {results ? (
          <div className="compose-results">
            <ul className="result-list">
              {results.map((r) => (
                <li key={r.contactId} className={r.ok ? 'ok' : 'fail'}>
                  {r.ok ? '✅' : '❌'} {r.contactName}
                  {r.ok ? ` — 초안 열림 (${r.adapter})` : ` — ${r.error}`}
                </li>
              ))}
            </ul>
            <p className="hint">Outlook에서 각 초안을 확인한 뒤 직접 전송하세요.</p>
            <div className="modal-actions">
              <button className="btn primary" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        ) : templates.length === 0 ? (
          <div className="empty">
            템플릿이 없습니다. 템플릿 메뉴에서 먼저 템플릿을 만들어 주세요.
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>
                닫기
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="compose-meta">
              <label className="form-field">
                <span>템플릿</span>
                <select
                  value={templateId ?? ''}
                  onChange={(e) => setTemplateId(Number(e.target.value))}
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="compose-recipients">
                받는 사람 {targets.length}명
                {skipped > 0 && <span className="warn-badge">이메일 없는 {skipped}명 제외됨</span>}
              </div>
            </div>

            {targets.length > 1 && (
              <div className="preview-nav">
                <button
                  className="btn sm"
                  disabled={previewIdx === 0}
                  onClick={() => setPreviewIdx((i) => i - 1)}
                >
                  ◀
                </button>
                <span>
                  미리보기 {previewIdx + 1} / {targets.length} — {previewContact?.name}
                </span>
                <button
                  className="btn sm"
                  disabled={previewIdx >= targets.length - 1}
                  onClick={() => setPreviewIdx((i) => i + 1)}
                >
                  ▶
                </button>
              </div>
            )}

            {preview && previewContact && (
              <div className="preview">
                <div className="preview-row">
                  <span className="preview-label">받는 사람</span>
                  <span>
                    {previewContact.name} &lt;{previewContact.email}&gt;
                  </span>
                </div>
                <div className="preview-row">
                  <span className="preview-label">제목</span>
                  <span>{preview.subject.text}</span>
                </div>
                <pre className="preview-body">{preview.body.text}</pre>
                {preview.warnings.length > 0 && (
                  <ul className="warning-list">
                    {preview.warnings.map((w, i) => (
                      <li key={i}>
                        ⚠️ <code>{`{{${w.variable}}}`}</code>
                        {w.usedDefault !== null
                          ? ` 값이 비어 기본값 '${w.usedDefault}'이(가) 사용됩니다`
                          : ' 값이 비어 있어 치환되지 않습니다'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn" onClick={onClose} disabled={sending}>
                취소
              </button>
              <button
                className="btn primary"
                onClick={createDrafts}
                disabled={sending || !template || targets.length === 0}
              >
                {sending
                  ? '초안 생성 중…'
                  : `Outlook 초안 열기${targets.length > 1 ? ` (${targets.length}건)` : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
