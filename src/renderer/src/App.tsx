import { useCallback, useEffect, useState } from 'react'
import { Contact as ContactIcon, History, Mail, Search, Send, Settings } from 'lucide-react'
import type { Contact, OutlookAdapter } from '../../shared/types'
import CommandPalette, { type ViewKey } from './components/CommandPalette'
import ComposeModal from './views/ComposeModal'
import ContactsView from './views/ContactsView'
import TemplatesView from './views/TemplatesView'
import HistoryView from './views/HistoryView'
import SettingsView from './views/SettingsView'

const NAV: { key: ViewKey; label: string; Icon: typeof ContactIcon }[] = [
  { key: 'contacts', label: '명함', Icon: ContactIcon },
  { key: 'templates', label: '템플릿', Icon: Mail },
  { key: 'history', label: '이력', Icon: History },
  { key: 'settings', label: '설정', Icon: Settings }
]

const MODE_LABEL: Record<OutlookAdapter, string> = {
  com: 'Outlook 연동 · COM',
  eml: 'Outlook 연동 · EML',
  mailto: 'Outlook 연동 · mailto'
}

const VIEW_KEYS: ViewKey[] = ['contacts', 'templates', 'history', 'settings']

function initialView(): ViewKey {
  const v = new URLSearchParams(window.location.search).get('view')
  return VIEW_KEYS.includes(v as ViewKey) ? (v as ViewKey) : 'contacts'
}

export default function App(): React.JSX.Element {
  const [view, setView] = useState<ViewKey>(initialView)
  const [outlookMode, setOutlookMode] = useState<OutlookAdapter | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(
    () => typeof window !== 'undefined' && window.location.search.includes('palette=1')
  )
  const [paletteCompose, setPaletteCompose] = useState<{
    contact: Contact
    templateId: number
  } | null>(null)
  const [newContactSignal, setNewContactSignal] = useState(0)

  useEffect(() => {
    window.api.system.outlookMode().then(setOutlookMode)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const openNewContact = useCallback(() => {
    setView('contacts')
    setNewContactSignal((n) => n + 1)
  }, [])

  return (
    <div className="app">
      <aside className="rail">
        <div className="logo-mark" title="whenimail">
          <Send size={15} color="#fff" strokeWidth={2.2} />
        </div>
        <button
          className="rail-item rail-search"
          data-tip="검색·실행 (Ctrl+K)"
          aria-label="검색 및 실행 (Ctrl+K)"
          onClick={() => setPaletteOpen(true)}
        >
          <Search size={18} strokeWidth={1.9} />
        </button>
        <nav className="rail-nav">
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`rail-item ${view === key ? 'active' : ''}`}
              data-tip={label}
              aria-label={label}
              onClick={() => setView(key)}
            >
              <Icon size={18} strokeWidth={1.9} />
            </button>
          ))}
        </nav>
        <div className="rail-footer">
          <span
            className={`mode-dot ${outlookMode ?? 'unknown'}`}
            data-tip={outlookMode ? MODE_LABEL[outlookMode] : '연동 확인 중…'}
            role="status"
            aria-label={outlookMode ? MODE_LABEL[outlookMode] : '연동 확인 중'}
          />
        </div>
      </aside>
      <main className="content">
        <div className="view-enter" key={view}>
          {view === 'contacts' && <ContactsView newContactSignal={newContactSignal} />}
          {view === 'templates' && <TemplatesView />}
          {view === 'history' && <HistoryView />}
          {view === 'settings' && <SettingsView outlookMode={outlookMode} />}
        </div>
      </main>

      {paletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onNavigate={setView}
          onCompose={(contact, templateId) => setPaletteCompose({ contact, templateId })}
          onNewContact={openNewContact}
        />
      )}
      {paletteCompose && (
        <ComposeModal
          contacts={[paletteCompose.contact]}
          initialTemplateId={paletteCompose.templateId}
          onClose={() => setPaletteCompose(null)}
        />
      )}
    </div>
  )
}
