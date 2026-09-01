import { useEffect, useState } from 'react'
import {
  Archive,
  Database,
  DownloadCloud,
  FolderOpen,
  Loader2,
  MailCheck,
  RefreshCw,
  RotateCcw
} from 'lucide-react'
import type { OutlookAdapter, UpdateState } from '../../../shared/types'
import { useDialog } from '../components/dialogs'

const UPDATE_LABEL: Record<UpdateState['status'], string> = {
  idle: '확인 전',
  checking: '확인 중…',
  available: '새 버전 발견',
  none: '최신 버전입니다',
  downloading: '다운로드 중',
  ready: '업데이트 준비 완료 — 재시작하면 적용됩니다',
  error: '확인 실패'
}

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
  const [version, setVersion] = useState('')
  const [update, setUpdate] = useState<UpdateState>({ status: 'idle' })
  const { confirm, toast } = useDialog()

  useEffect(() => {
    window.api.system.version().then(setVersion)
    window.api.update.state().then(setUpdate)
    return window.api.update.onState(setUpdate)
  }, [])

  const exportBackup = async (): Promise<void> => {
    setBusy('export')
    try {
      const saved = await window.api.backup.export()
      if (saved) toast(`백업이 저장되었습니다 — ${saved}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  const importBackup = async (): Promise<void> => {
    const ok = await confirm({
      title: '백업에서 복원',
      message:
        '복원하면 현재 명함·템플릿·이력이 백업 파일 내용으로 교체되고 앱이 다시 시작됩니다.\n계속할까요?',
      confirmLabel: '복원',
      danger: true
    })
    if (!ok) return
    setBusy('import')
    try {
      await window.api.backup.import()
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error')
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
          <DownloadCloud size={16} />
          업데이트
        </h2>
        <p>
          현재 버전: <span className="badge neutral">v{version || '…'}</span>{' '}
          <span className="muted">
            {UPDATE_LABEL[update.status]}
            {update.status === 'downloading' && update.percent !== undefined
              ? ` (${update.percent}%)`
              : ''}
            {update.status === 'error' && update.message ? ` — ${update.message}` : ''}
          </span>
        </p>
        <p className="muted">새 버전이 GitHub 릴리즈에 올라오면 자동으로 내려받아 둡니다.</p>
        <div className="settings-actions">
          <button
            className="btn"
            onClick={() => window.api.update.check()}
            disabled={update.status === 'checking' || update.status === 'downloading'}
          >
            {update.status === 'checking' || update.status === 'downloading' ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            업데이트 확인
          </button>
          {update.status === 'ready' && (
            <button className="btn primary" onClick={() => window.api.update.install()}>
              지금 재시작하여 v{update.version} 적용
            </button>
          )}
        </div>
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
