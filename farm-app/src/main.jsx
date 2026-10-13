import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { UIProvider } from './context/UIContext'
import Toaster from './components/ui/Toaster'
import { installAlertToasts } from './lib/notify'
import { installAppUpdates } from './lib/appUpdate'
import './index.css'
import App from './App.jsx'

// alert() calls across the app now show as friendly toasts instead of blocking pop-ups
installAlertToasts()

// Installed PWAs jump to the newest deploy as soon as they are opened
installAppUpdates()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <UIProvider>
              <App />
              <Toaster />
            </UIProvider>
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>,
)
