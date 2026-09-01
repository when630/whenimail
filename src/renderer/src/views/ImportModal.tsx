import { useMemo, useState } from 'react'
import { CheckCircle2, FileSpreadsheet, X } from 'lucide-react'
import type {
  ContactInput,
  DuplicatePolicy,
  ImportParseResult,
  ImportSummary
} from '../../../shared/types'
import { useDialog } from '../components/dialogs'

const FIELDS: { key: keyof ContactInput; label: string; aliases: string[] }[] = [
  { key: 'name', label: '이름', aliases: ['이름', '성명', 'name', '담당자'] },
  { key: 'company', label: '회사', aliases: ['회사', '회사명', 'company', '거래처', '업체'] },
  { key: 'department', label: '부서', aliases: ['부서', 'department', '팀'] },
  { key: 'title', label: '직함', aliases: ['직함', '직책', '직위', 'title'] },
  { key: 'email', label: '이메일', aliases: ['이메일', 'email', 'e-mail', '메일', 'mail'] },
  { key: 'phone', label: '전화', aliases: ['전화', 'phone', 'tel', '전화번호', '유선'] },
  {
    key: 'mobile',
    label: '휴대폰',
    aliases: ['휴대폰', '핸드폰', 'mobile', '휴대전화', '모바일', 'hp']
  },
  { key: 'address', label: '주소', aliases: ['주소', 'address'] },
  { key: 'website', label: '웹사이트', aliases: ['웹사이트', 'website', 'url', '홈페이지'] },
  { key: 'memo', label: '메모', aliases: ['메모', '비고', 'memo', 'note', '노트'] }
]

/** 헤더명으로 필드 자동 매핑 */
function guessMapping(headers: string[]): Record<keyof ContactInput, number> {
  const mapping = {} as Record<keyof ContactInput, number>
  const used = new Set<number>()
  for (const field of FIELDS) {
    mapping[field.key] = -1
    for (const [i, header] of headers.entries()) {
      if (used.has(i)) continue
      const h = header.toLowerCase().replace(/\s/g, '')
      if (field.aliases.some((a) => h.includes(a.toLowerCase()))) {
        mapping[field.key] = i
        used.add(i)
        break
      }
    }
  }
  return mapping
}

interface Props {
  onClose: (imported: boolean) => void
}

export default function ImportModal({ onClose }: Props): React.JSX.Element {
  const [parsed, setParsed] = useState<ImportParseResult | null>(null)
  const [mapping, setMapping] = useState<Record<keyof ContactInput, number> | null>(null)
  const [policy, setPolicy] = useState<DuplicatePolicy>('skip')
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const { toast } = useDialog()

  const pickFile = async (): Promise<void> => {
    setBusy(true)
    try {
      const result = await window.api.import.pick()
      if (result) {
        setParsed(result)
        setMapping(guessMapping(result.headers))
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const mappedRows = useMemo<ContactInput[]>(() => {
    if (!parsed || !mapping) return []
    return parsed.rows.map((row) => {
      const input = {} as ContactInput
      for (const field of FIELDS) {
        const col = mapping[field.key]
        input[field.key] = col >= 0 ? (row[col] ?? '') : ''
      }
      return input
    })
  }, [parsed, mapping])

  const validCount = mappedRows.filter((r) => r.name.trim()).length

  const commit = async (): Promise<void> => {
    setBusy(true)
    try {
      setSummary(await window.api.import.commit(mappedRows, policy))
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => onClose(summary !== null)}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>CSV/엑셀 가져오기</h2>
          <button
            className="btn ghost sm icon-only"
            aria-label="닫기"
            onClick={() => onClose(summary !== null)}
          >
            <X size={16} />
          </button>
        </div>

        {summary ? (
          <div>
            <div className="import-summary">
              <CheckCircle2 size={20} />
              <span>
                {summary.inserted}건 추가
                {summary.updated > 0 && ` · ${summary.updated}건 덮어씀`}
                {summary.skipped > 0 && ` · 중복 ${summary.skipped}건 건너뜀`}
                {summary.invalid > 0 && ` · 이름 없는 ${summary.invalid}건 제외`}
              </span>
            </div>
            <div className="modal-actions">
              <button className="btn primary" onClick={() => onClose(true)}>
                완료
              </button>
            </div>
          </div>
        ) : !parsed ? (
          <div className="empty">
            <FileSpreadsheet size={36} strokeWidth={1.4} />
            <span className="empty-title">CSV 또는 엑셀 파일을 선택하세요</span>
            <span>첫 행은 열 이름(헤더)이어야 합니다.</span>
            <button className="btn primary" onClick={pickFile} disabled={busy}>
              파일 선택
            </button>
          </div>
        ) : (
          mapping && (
            <>
              <p className="muted import-file">
                <FileSpreadsheet size={15} /> {parsed.fileName} — {parsed.rows.length}행
              </p>
              <div className="mapping-grid">
                {FIELDS.map((field) => (
                  <label key={field.key} className="form-field">
                    <span>
                      {field.label}
                      {field.key === 'name' && <em className="req">*</em>}
                    </span>
                    <select
                      value={mapping[field.key]}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field.key]: Number(e.target.value) })
                      }
                    >
                      <option value={-1}>(가져오지 않음)</option>
                      {parsed.headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>

              <div className="import-preview">
                <div className="palette-group">미리보기 (처음 4행)</div>
                <div className="card table-scroll">
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        {FIELDS.filter((f) => mapping[f.key] >= 0).map((f) => (
                          <th key={f.key}>{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mappedRows.slice(0, 4).map((row, i) => (
                        <tr key={i}>
                          {FIELDS.filter((f) => mapping[f.key] >= 0).map((f) => (
                            <td key={f.key}>{row[f.key]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="import-policy">
                <span className="muted">이메일이 같은 명함이 이미 있으면:</span>
                <label>
                  <input
                    type="radio"
                    name="policy"
                    checked={policy === 'skip'}
                    onChange={() => setPolicy('skip')}
                  />
                  건너뛰기
                </label>
                <label>
                  <input
                    type="radio"
                    name="policy"
                    checked={policy === 'overwrite'}
                    onChange={() => setPolicy('overwrite')}
                  />
                  덮어쓰기
                </label>
              </div>

              <div className="modal-actions">
                <button className="btn" onClick={() => setParsed(null)} disabled={busy}>
                  다른 파일
                </button>
                <button
                  className="btn primary"
                  onClick={commit}
                  disabled={busy || validCount === 0 || mapping.name < 0}
                >
                  {validCount}건 가져오기
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
