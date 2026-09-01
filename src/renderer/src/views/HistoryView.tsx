import { useEffect, useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'
import type { DraftLog } from '../../../shared/types'

export default function HistoryView(): React.JSX.Element {
  const [logs, setLogs] = useState<DraftLog[] | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    window.api.drafts.history().then(setLogs)
  }, [])

  const filtered = useMemo(() => {
    if (!logs) return null
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((log) =>
      [log.contact_name, log.contact_email, log.subject_rendered, log.template_name].some((v) =>
        v.toLowerCase().includes(q)
      )
    )
  }, [logs, search])

  return (
    <div className="view">
      <header className="view-header">
        <h1>초안 생성 이력</h1>
        <div className="toolbar">
          <div className="search-box">
            <Search size={15} />
            <input
              placeholder="받는 사람·제목·템플릿 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>
      {filtered === null ? null : filtered.length === 0 ? (
        <div className="empty">
          <History size={36} strokeWidth={1.4} />
          <span className="empty-title">
            {search ? '검색 결과가 없습니다' : '아직 이력이 없습니다'}
          </span>
          {!search && <span>명함을 선택해 메일 초안을 만들어 보세요.</span>}
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>일시</th>
                <th>받는 사람</th>
                <th>템플릿</th>
                <th>제목</th>
                <th>방식</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id} style={{ animationDelay: `${Math.min(i, 14) * 22}ms` }}>
                  <td className="nowrap">{log.created_at}</td>
                  <td>
                    {log.contact_name}
                    <small className="muted"> {log.contact_email}</small>
                  </td>
                  <td>{log.template_name}</td>
                  <td>{log.subject_rendered}</td>
                  <td>
                    <span className={`badge mode-${log.adapter}`}>{log.adapter}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
