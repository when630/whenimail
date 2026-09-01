import { useEffect, useState } from 'react'
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
        <div className="empty">아직 이력이 없습니다. 명함을 선택해 메일 초안을 만들어 보세요.</div>
      ) : (
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
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="nowrap">{log.created_at}</td>
                <td>
                  {log.contact_name}
                  <small className="muted"> {log.contact_email}</small>
                </td>
                <td>{log.template_name}</td>
                <td>{log.subject_rendered}</td>
                <td>
                  <span className={`mode-badge mode-${log.adapter}`}>{log.adapter}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
