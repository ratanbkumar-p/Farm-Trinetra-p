import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SettingsProvider } from './context/SettingsContext'
import { AuthProvider } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <DataProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DataProvider>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>,
)
