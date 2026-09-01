import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { DialogProvider } from './components/dialogs'
import { installMockApiIfNeeded } from './mockApi'

installMockApiIfNeeded()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </StrictMode>
)
