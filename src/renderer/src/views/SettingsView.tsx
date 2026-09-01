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
  return (
    <div className="view">
      <header className="view-header">
        <h1>설정</h1>
      </header>
      <section className="settings-section">
        <h2>Outlook 연동</h2>
        <p>
          현재 모드:{' '}
          <span className={`mode-badge mode-${outlookMode ?? 'unknown'}`}>
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
        <h2>데이터</h2>
        <p className="muted">명함·템플릿·이력은 이 PC의 로컬 SQLite 파일에만 저장됩니다.</p>
        <button className="btn" onClick={() => window.api.system.openDataFolder()}>
          데이터 폴더 열기
        </button>
      </section>
    </div>
  )
}
