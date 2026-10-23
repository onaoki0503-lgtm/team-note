import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../shared/team-note-theme.css'
import './index.css'
import './glass.css'
import App from './App.tsx'
import { SharedIdeasProvider } from './lib/SharedIdeas'
import { NavigationProvider } from './lib/navigation'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SharedIdeasProvider><NavigationProvider><App /></NavigationProvider></SharedIdeasProvider>
  </StrictMode>,
)
