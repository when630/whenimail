import { useState } from 'react'
import { Archive, Database, FolderOpen, Loader2, MailCheck, RotateCcw } from 'lucide-react'
import type { OutlookAdapter } from '../../../shared/types'

const MODE_DESC: Record<OutlookAdapter, string> = {
  com: '클래식 Outlook이 설치되어 있어 COM 자동화로 초안을 엽니다. HTML 본문이 완전하게 지원됩니다.',
  eml: '클래식 Outlook이 없어 .eml(X-Unsent) 파일로 초안을 엽니다. 신형 Outlook 환경에 따라 HTML 본문이 제한될 수 있습니다.',
  mailto: 'mailto 링크로 기본 메일 앱을 엽니다. 제목·텍스트 본문만 전달됩니다.'
}

export default function SettingsView({
  outlookMode
}: {
  outlookMode: OutlookAdapter | null
}): React.JSX.Element {
  const [busy, setBusy] = useState<'export' | 'import' | null>(null)

  const exportBackup = async (): Promise<void> => {
    setBusy('export')
    try {
      const saved = await window.api.backup.export()
      if (saved) alert(`백업이 저장되었습니다:\n${saved}`)
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const importBackup = async (): Promise<void> => {
    if (
      !confirm(
        '복원하면 현재 명함·템플릿·이력이 백업 파일 내용으로 교체되고 앱이 다시 시작됩니다.\n계속할까요?'
      )
    )
      return
    setBusy('import')
    try {
      await window.api.backup.import()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="view">
      <header className="view-header">
        <h1>설정</h1>
      </header>
      <section className="settings-section">
        <h2>
          <MailCheck size={16} />
          Outlook 연동
        </h2>
        <p>
          현재 모드:{' '}
          <span className={`badge ${outlookMode ? `mode-${outlookMode}` : 'neutral'}`}>
            {outlookMode ?? '확인 중…'}
          </span>
        </p>
        {outlookMode && <p className="muted">{MODE_DESC[outlookMode]}</p>}
        <p className="muted">
          whenimail은 메일을 자동 전송하지 않습니다. 항상 Outlook 초안을 열어 확인 후 직접
          전송합니다.
        </p>
      </section>
      <section className="settings-section">
        <h2>
          <Database size={16} />
          데이터
        </h2>
        <p className="muted">
          명함·템플릿·이력·명함 이미지는 이 PC의 로컬 데이터 폴더에만 저장됩니다.
        </p>
        <div className="settings-actions">
          <button className="btn" onClick={() => window.api.system.openDataFolder()}>
            <FolderOpen size={15} />
            데이터 폴더 열기
          </button>
          <button className="btn" onClick={exportBackup} disabled={busy !== null}>
            {busy === 'export' ? <Loader2 size={15} className="spin" /> : <Archive size={15} />}
            백업 내보내기 (zip)
          </button>
          <button className="btn" onClick={importBackup} disabled={busy !== null}>
            {busy === 'import' ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}
            백업에서 복원…
          </button>
        </div>
      </section>
    </div>
  )
}
