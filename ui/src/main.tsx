import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import './index.css'
import './iransansx-features.css'
import './i18n/config' // Initialize i18next
import { LanguageProvider } from './contexts/LanguageContext'
import { MuiThemeProvider } from './contexts/MuiThemeProvider'
import { AuthProvider } from './contexts/AuthContext'
import { store, persistor } from './store'
import { initializeAuth } from './store/slices/authSlice'
import { initializeLanguage } from './store/slices/languageSlice'
import { initializeMuiTheme } from './store/slices/muiThemeSlice'
import App from './App.tsx'

// Initialize Redux state from storage synchronously for auth/language/theme
// These are critical for initial render
store.dispatch(initializeAuth());
store.dispatch(initializeLanguage());
store.dispatch(initializeMuiTheme());

// Defer non-critical imports to after initial render
// This improves Time to Interactive (TTI) by reducing initial bundle size
setTimeout(() => {
  // ECharts configuration - only needed when charts are rendered
  import('./utils/echartsConfig');
}, 0);

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
