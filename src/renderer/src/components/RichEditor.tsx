import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { Bold, Italic, List, Underline } from 'lucide-react'

export interface RichEditorHandle {
  /** 캐럿 위치에 텍스트 삽입 (변수 토큰용) */
  insertText: (text: string) => void
}

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

/** 기존 플레인 텍스트 템플릿도 에디터에서 자연스럽게 보이도록 변환 */
function toEditorHtml(value: string): string {
  if (/<[a-z][^>]*>/i.test(value)) return value
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
}

const TOOLS: { cmd: string; label: string; Icon: typeof Bold }[] = [
  { cmd: 'bold', label: '굵게', Icon: Bold },
  { cmd: 'italic', label: '기울임', Icon: Italic },
  { cmd: 'underline', label: '밑줄', Icon: Underline },
  { cmd: 'insertUnorderedList', label: '목록', Icon: List }
]

const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { value, onChange, placeholder },
  ref
): React.JSX.Element {
  const divRef = useRef<HTMLDivElement>(null)
  const lastHtml = useRef('')

  // 외부에서 value가 바뀌었을 때만 반영 (편집 중 caret 보존을 위해 포커스 시엔 건드리지 않음)
  useEffect(() => {
    const el = divRef.current
    if (!el || document.activeElement === el) return
    const html = toEditorHtml(value)
    if (html !== lastHtml.current && html !== el.innerHTML) {
      el.innerHTML = html
      lastHtml.current = html
    }
  }, [value])

  const emit = (): void => {
    const el = divRef.current
    if (!el || el.innerHTML === lastHtml.current) return
    lastHtml.current = el.innerHTML
    onChange(el.innerHTML)
  }

  const exec = (cmd: string): void => {
    divRef.current?.focus()
    document.execCommand(cmd)
    emit()
  }

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      const el = divRef.current
      if (!el) return
      el.focus()
      document.execCommand('insertText', false, text)
      emit()
    }
  }))

  return (
    <div className="rich-wrap">
      <div className="rich-toolbar">
        {TOOLS.map(({ cmd, label, Icon }) => (
          <button
            key={cmd}
            type="button"
            className="btn ghost sm icon-only"
            aria-label={label}
            title={label}
            onMouseDown={(e) => {
              e.preventDefault()
              exec(cmd)
            }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
      <div
        ref={divRef}
        className="rich-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder ?? ''}
        onInput={emit}
        onBlur={emit}
      />
    </div>
  )
})

export default RichEditor
