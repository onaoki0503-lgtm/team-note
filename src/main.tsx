import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/team-note-theme.css'
import './index.css'
import './glass.css'
import App from './App.tsx'
import { SharedIdeasProvider } from './lib/SharedIdeas'
import { NavigationProvider } from './lib/navigation'
import { ScreenSkeleton } from './components/ScreenLoading'
export const ManagementApp = lazy(() => import('./management/ManagementApp'))
const management = new URLSearchParams(location.search).get('view') === 'management'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {management ? <Suspense fallback={<div className="shared-login-loading"><ScreenSkeleton label="管理画面を読み込み中" /></div>}><ManagementApp /></Suspense> : <SharedIdeasProvider><NavigationProvider><App /></NavigationProvider></SharedIdeasProvider>}
  </StrictMode>,
)
