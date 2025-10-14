import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import './index.css'
import './iransansx-features.css'
import './i18n/config' // Initialize i18next
import './utils/echartsConfig' // Configure ECharts with tree-shaking (must be before any chart usage)
import { LanguageProvider } from './contexts/LanguageContext'
import { MuiThemeProvider } from './contexts/MuiThemeProvider'
import { AuthProvider } from './contexts/AuthContext'
import { store, persistor } from './store'
import { initializeAuth } from './store/slices/authSlice'
import { initializeLanguage } from './store/slices/languageSlice'
import { initializeMuiTheme } from './store/slices/muiThemeSlice'
import App from './App.tsx'

// Initialize Redux state from storage
store.dispatch(initializeAuth());
store.dispatch(initializeLanguage());
store.dispatch(initializeMuiTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LanguageProvider>
          <MuiThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </MuiThemeProvider>
        </LanguageProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
)
