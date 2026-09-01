import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import type { DraftLog } from '../../../shared/types'

export default function HistoryView(): React.JSX.Element {
  const [logs, setLogs] = useState<DraftLog[]>([])

  useEffect(() => {
    window.api.drafts.history().then(setLogs)
  }, [])

  return (
    <div className="view">
      <header className="view-header">
        <h1>초안 생성 이력</h1>
      </header>
      {logs.length === 0 ? (
        <div className="empty">
          <History size={36} strokeWidth={1.4} />
          <span className="empty-title">아직 이력이 없습니다</span>
          <span>명함을 선택해 메일 초안을 만들어 보세요.</span>
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
              {logs.map((log, i) => (
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
