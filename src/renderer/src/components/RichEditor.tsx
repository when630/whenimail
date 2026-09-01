import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Underline,
  Undo2
} from 'lucide-react'

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

const FONT_SIZES: { label: string; value: string }[] = [
  { label: '작게', value: '2' },
  { label: '보통', value: '3' },
  { label: '크게', value: '5' },
  { label: '아주 크게', value: '6' }
]

interface ToolButton {
  cmd: string
  label: string
  Icon: typeof Bold
  /** queryCommandState로 활성 표시할지 */
  stateful?: boolean
}

const GROUP_HISTORY: ToolButton[] = [
  { cmd: 'undo', label: '실행 취소', Icon: Undo2 },
  { cmd: 'redo', label: '다시 실행', Icon: Redo2 }
]

const GROUP_STYLE: ToolButton[] = [
  { cmd: 'bold', label: '굵게', Icon: Bold, stateful: true },
  { cmd: 'italic', label: '기울임', Icon: Italic, stateful: true },
  { cmd: 'underline', label: '밑줄', Icon: Underline, stateful: true },
  { cmd: 'strikeThrough', label: '취소선', Icon: Strikethrough, stateful: true }
]

const GROUP_ALIGN: ToolButton[] = [
  { cmd: 'justifyLeft', label: '왼쪽 정렬', Icon: AlignLeft, stateful: true },
  { cmd: 'justifyCenter', label: '가운데 정렬', Icon: AlignCenter, stateful: true },
  { cmd: 'justifyRight', label: '오른쪽 정렬', Icon: AlignRight, stateful: true }
]

const GROUP_LIST: ToolButton[] = [
  { cmd: 'insertUnorderedList', label: '글머리 기호', Icon: List, stateful: true },
  { cmd: 'insertOrderedList', label: '번호 목록', Icon: ListOrdered, stateful: true }
]

const STATEFUL_CMDS = [...GROUP_STYLE, ...GROUP_ALIGN, ...GROUP_LIST]
  .filter((t) => t.stateful)
  .map((t) => t.cmd)

const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { value, onChange, placeholder },
  ref
): React.JSX.Element {
  const divRef = useRef<HTMLDivElement>(null)
  const lastHtml = useRef('')
  const savedRange = useRef<Range | null>(null)
  const [active, setActive] = useState<Record<string, boolean>>({})
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  useEffect(() => {
    const el = divRef.current
    if (!el || document.activeElement === el) return
    const html = toEditorHtml(value)
    if (html !== lastHtml.current && html !== el.innerHTML) {
      el.innerHTML = html
      lastHtml.current = html
    }
  }, [value])

  // 선택 영역 변화에 따라 툴바 활성 상태 갱신
  useEffect(() => {
    const onSelectionChange = (): void => {
      const el = divRef.current
      const sel = window.getSelection()
      if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return
      const next: Record<string, boolean> = {}
      for (const cmd of STATEFUL_CMDS) {
        try {
          next[cmd] = document.queryCommandState(cmd)
        } catch {
          next[cmd] = false
        }
      }
      setActive(next)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => document.removeEventListener('selectionchange', onSelectionChange)
  }, [])

  const emit = (): void => {
    const el = divRef.current
    if (!el || el.innerHTML === lastHtml.current) return
    lastHtml.current = el.innerHTML
    onChange(el.innerHTML)
  }

  /** 색상 선택기·셀렉트·링크 입력으로 포커스가 떠나기 전에 선택 영역 보관 */
  const saveSelection = (): void => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && divRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }

  const restoreSelection = (): void => {
    const range = savedRange.current
    if (!range) return
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  const exec = (cmd: string, arg?: string): void => {
    divRef.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const execWithRestore = (cmd: string, arg?: string): void => {
    divRef.current?.focus()
    restoreSelection()
    document.execCommand(cmd, false, arg)
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

  const applyLink = (): void => {
    const url = linkUrl.trim()
    setLinkOpen(false)
    setLinkUrl('')
    if (!url) return
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    divRef.current?.focus()
    restoreSelection()
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${href}" target="_blank">${href}</a>`
      )
    } else {
      document.execCommand('createLink', false, href)
    }
    emit()
  }

  const renderGroup = (tools: ToolButton[]): React.JSX.Element[] =>
    tools.map(({ cmd, label, Icon, stateful }) => (
      <button
        key={cmd}
        type="button"
        className={`btn ghost sm icon-only ${stateful && active[cmd] ? 'tool-active' : ''}`}
        aria-label={label}
        aria-pressed={stateful ? Boolean(active[cmd]) : undefined}
        title={label}
        onMouseDown={(e) => {
          e.preventDefault()
          exec(cmd)
        }}
      >
        <Icon size={14} />
      </button>
    ))

  return (
    <div className="rich-wrap">
      <div className="rich-toolbar">
        {renderGroup(GROUP_HISTORY)}
        <span className="rich-sep" />
        <select
          className="rich-select"
          title="글자 크기"
          aria-label="글자 크기"
          value=""
          onMouseDown={saveSelection}
          onChange={(e) => {
            if (e.target.value) execWithRestore('fontSize', e.target.value)
          }}
        >
          <option value="" disabled>
            크기
          </option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="rich-sep" />
        {renderGroup(GROUP_STYLE)}
        <span className="rich-sep" />
        <label className="rich-color" title="글자색" onMouseDown={saveSelection}>
          <span className="rich-color-icon" aria-hidden="true">
            가
          </span>
          <input
            type="color"
            aria-label="글자색"
            defaultValue="#d92d20"
            onChange={(e) => execWithRestore('foreColor', e.target.value)}
          />
        </label>
        <label className="rich-color" title="형광펜" onMouseDown={saveSelection}>
          <Highlighter size={14} aria-hidden="true" />
          <input
            type="color"
            aria-label="형광펜"
            defaultValue="#fef08a"
            onChange={(e) => execWithRestore('hiliteColor', e.target.value)}
          />
        </label>
        <span className="rich-sep" />
        {renderGroup(GROUP_ALIGN)}
        <span className="rich-sep" />
        {renderGroup(GROUP_LIST)}
        <span className="rich-sep" />
        <button
          type="button"
          className={`btn ghost sm icon-only ${linkOpen ? 'tool-active' : ''}`}
          aria-label="링크"
          title="링크"
          onMouseDown={(e) => {
            e.preventDefault()
            saveSelection()
            setLinkOpen((v) => !v)
          }}
        >
          <LinkIcon size={14} />
        </button>
        <button
          type="button"
          className="btn ghost sm icon-only"
          aria-label="서식 지우기"
          title="서식 지우기"
          onMouseDown={(e) => {
            e.preventDefault()
            exec('removeFormat')
            exec('unlink')
          }}
        >
          <Eraser size={14} />
        </button>
      </div>
      {linkOpen && (
        <div className="rich-linkbar">
          <input
            autoFocus
            placeholder="https://…"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              } else if (e.key === 'Escape') {
                setLinkOpen(false)
              }
            }}
          />
          <button type="button" className="btn sm primary" onClick={applyLink}>
            적용
          </button>
        </div>
      )}
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
