import { useState } from 'react'
import { X } from 'lucide-react'
import type { Contact, ContactInput } from '../../../shared/types'

const EMPTY: ContactInput = {
  name: '',
  company: '',
  department: '',
  title: '',
  email: '',
  phone: '',
  mobile: '',
  address: '',
  website: '',
  memo: ''
}

const FIELDS: { key: keyof ContactInput; label: string; required?: boolean }[] = [
  { key: 'name', label: '이름', required: true },
  { key: 'company', label: '회사' },
  { key: 'department', label: '부서' },
  { key: 'title', label: '직함' },
  { key: 'email', label: '이메일' },
  { key: 'phone', label: '전화' },
  { key: 'mobile', label: '휴대폰' },
  { key: 'address', label: '주소' },
  { key: 'website', label: '웹사이트' }
]

interface Props {
  contact: Contact | null
  onSave: (input: ContactInput) => Promise<void>
  onClose: () => void
}

export default function ContactForm({ contact, onSave, onClose }: Props): React.JSX.Element {
  const [form, setForm] = useState<ContactInput>(
    contact
      ? {
          name: contact.name,
          company: contact.company,
          department: contact.department,
          title: contact.title,
          email: contact.email,
          phone: contact.phone,
          mobile: contact.mobile,
          address: contact.address,
          website: contact.website,
          memo: contact.memo
        }
      : EMPTY
  )
  const [saving, setSaving] = useState(false)

  const set = (key: keyof ContactInput, value: string): void =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{contact ? '명함 편집' : '명함 등록'}</h2>
          <button type="button" className="btn ghost sm icon-only" aria-label="닫기" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            {FIELDS.map((f) => (
              <label key={f.key} className="form-field">
                <span>
                  {f.label}
                  {f.required && <em className="req">*</em>}
                </span>
                <input
                  value={form[f.key]}
                  required={f.required}
                  type={f.key === 'email' ? 'email' : 'text'}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              </label>
            ))}
            <label className="form-field form-field-wide">
              <span>메모</span>
              <textarea rows={3} value={form.memo} onChange={(e) => set('memo', e.target.value)} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="btn primary" disabled={saving || !form.name.trim()}>
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
