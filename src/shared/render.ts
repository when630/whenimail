import type { Contact, RenderWarning } from './types'

/** 템플릿 변수명(한글) → Contact 필드 매핑 */
export const TEMPLATE_VARIABLES: Record<string, keyof Contact | '__date__'> = {
  이름: 'name',
  회사: 'company',
  부서: 'department',
  직함: 'title',
  이메일: 'email',
  전화: 'phone',
  휴대폰: 'mobile',
  주소: 'address',
  웹사이트: 'website',
  메모: 'memo',
  보내는날짜: '__date__'
}

const VAR_PATTERN = /\{\{\s*([^{}|\s]+)\s*(?:\|([^{}]*))?\}\}/g

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export interface RenderResult {
  text: string
  warnings: RenderWarning[]
}

/**
 * `{{변수}}` / `{{변수|기본값}}` 치환.
 * - 값이 비면 기본값 사용(경고 수집), 기본값도 없으면 원문 유지 + 경고
 * - 알 수 없는 변수는 치환하지 않고 경고
 */
export function renderTemplate(tpl: string, contact: Contact): RenderResult {
  const warnings: RenderWarning[] = []
  const text = tpl.replace(VAR_PATTERN, (raw, name: string, fallback?: string) => {
    const field = TEMPLATE_VARIABLES[name]
    if (field === undefined) {
      warnings.push({ variable: name, usedDefault: null })
      return raw
    }
    const value = field === '__date__' ? todayString() : String(contact[field] ?? '').trim()
    if (value) return value
    if (fallback !== undefined && fallback !== '') {
      warnings.push({ variable: name, usedDefault: fallback })
      return fallback
    }
    warnings.push({ variable: name, usedDefault: null })
    return raw
  })
  return { text, warnings }
}

/** 본문(줄바꿈 텍스트)을 Outlook용 HTML로 변환 */
export function bodyToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const paragraphs = escaped
    .split(/\r?\n/)
    .map((line) => (line.trim() === '' ? '<p>&nbsp;</p>' : `<p>${line}</p>`))
    .join('\n')
  return `<html><body style="font-family:'Malgun Gothic',sans-serif;font-size:10.5pt;">${paragraphs}</body></html>`
}
