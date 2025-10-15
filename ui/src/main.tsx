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
import { initializeMonitoringFromStorage } from './store/slices/monitoringSlice'
import { initAutoCleanup } from './utils/monitoringStorage'
import { initIndexedDB } from './utils/indexedDbStorage'
import { initBackgroundRefresh } from './services/backgroundRefreshService'
import App from './App.tsx'

// Initialize IndexedDB storage first (async, but starts immediately)
// This sets up the database, BroadcastChannel, and cleanup schedule
initIndexedDB().catch((error) => {
  console.error('Failed to initialize IndexedDB:', error);
});

// Initialize Redux state from storage for auth/language/theme
// These are critical for initial render
store.dispatch(initializeAuth());
store.dispatch(initializeLanguage());
store.dispatch(initializeMuiTheme());

// Initialize monitoring data from IndexedDB (async)
store.dispatch(initializeMonitoringFromStorage());

// Initialize automatic cleanup for expired data (TTL)
initAutoCleanup().catch((error) => {
  console.error('Failed to initialize auto-cleanup:', error);
});

// Initialize background refresh service (checks data freshness)
initBackgroundRefresh({
  enabled: true,
  refreshInterval: 5 * 60 * 1000, // Check every 5 minutes
  dataStaleThreshold: 30 * 60 * 1000, // Refresh if data older than 30 minutes
});

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
