import { useEffect, useState } from 'react'
import type { OutlookAdapter } from '../../shared/types'
import ContactsView from './views/ContactsView'
import TemplatesView from './views/TemplatesView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'

type ViewKey = 'contacts' | 'templates' | 'history' | 'settings'

const NAV: { key: ViewKey; label: string; icon: string }[] = [
  { key: 'contacts', label: '명함', icon: '👤' },
  { key: 'templates', label: '템플릿', icon: '✉️' },
  { key: 'history', label: '이력', icon: '🕘' },
  { key: 'settings', label: '설정', icon: '⚙️' }
]

export default function App(): React.JSX.Element {
  const [view, setView] = useState<ViewKey>('contacts')
  const [outlookMode, setOutlookMode] = useState<OutlookAdapter | null>(null)

  useEffect(() => {
    window.api.system.outlookMode().then(setOutlookMode)
  }, [])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">whenimail</div>
        <nav>
          {NAV.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              onClick={() => setView(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className={`mode-badge mode-${outlookMode ?? 'unknown'}`}>
            {outlookMode === 'com' && 'Outlook 연동: COM'}
            {outlookMode === 'eml' && 'Outlook 연동: EML'}
            {outlookMode === 'mailto' && 'Outlook 연동: mailto'}
            {outlookMode === null && '연동 확인 중…'}
          </span>
        </div>
      </aside>
      <main className="content">
        {view === 'contacts' && <ContactsView />}
        {view === 'templates' && <TemplatesView />}
        {view === 'history' && <HistoryView />}
        {view === 'settings' && <SettingsView outlookMode={outlookMode} />}
      </main>
    </div>
  )
}
