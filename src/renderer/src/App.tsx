import { useEffect, useState } from 'react'
import { Contact, History, Mail, Send, Settings } from 'lucide-react'
import type { OutlookAdapter } from '../../shared/types'
import ContactsView from './views/ContactsView'
import TemplatesView from './views/TemplatesView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'

type ViewKey = 'contacts' | 'templates' | 'history' | 'settings'

const NAV: { key: ViewKey; label: string; Icon: typeof Contact }[] = [
  { key: 'contacts', label: '명함', Icon: Contact },
  { key: 'templates', label: '템플릿', Icon: Mail },
  { key: 'history', label: '이력', Icon: History },
  { key: 'settings', label: '설정', Icon: Settings }
]

const MODE_LABEL: Record<OutlookAdapter, string> = {
  com: 'Outlook 연동 · COM',
  eml: 'Outlook 연동 · EML',
  mailto: 'Outlook 연동 · mailto'
}

export default function App(): React.JSX.Element {
  const [view, setView] = useState<ViewKey>('contacts')
  const [outlookMode, setOutlookMode] = useState<OutlookAdapter | null>(null)

  useEffect(() => {
    window.api.system.outlookMode().then(setOutlookMode)
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark">
            <Send size={15} color="#fff" strokeWidth={2.2} />
          </span>
          <span className="logo-name">whenimail</span>
        </div>
        <nav>
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`nav-item ${view === key ? 'active' : ''}`}
              onClick={() => setView(key)}
            >
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="mode-line">
            <span className={`mode-dot ${outlookMode ?? 'unknown'}`} />
            {outlookMode ? MODE_LABEL[outlookMode] : '연동 확인 중…'}
          </span>
        </div>
      </aside>
      <main className="content">
        <div className="view-enter" key={view}>
          {view === 'contacts' && <ContactsView />}
          {view === 'templates' && <TemplatesView />}
          {view === 'history' && <HistoryView />}
          {view === 'settings' && <SettingsView outlookMode={outlookMode} />}
        </div>
      </main>
    </div>
  )
}
