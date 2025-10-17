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
import { createLogger } from './utils/logger'
import App from './App.tsx'

const logger = createLogger('Main');

// Initialize IndexedDB storage first and wait for it to complete
// This is critical - the app needs IndexedDB ready before rendering
(async () => {
  try {
    // CRITICAL: Wait for IndexedDB to be fully initialized
    // This sets up the database, BroadcastChannel, and cleanup schedule
    await initIndexedDB();
    
    // CRITICAL: Wait for auth initialization to complete
    // This populates the token cache which is required for gRPC client
    // Must complete BEFORE rendering to prevent 401 errors in streaming connections
    await store.dispatch(initializeAuth()).unwrap();
    
    // Initialize language and theme from storage (can be async)
    store.dispatch(initializeLanguage());
    store.dispatch(initializeMuiTheme());
    
    // Initialize monitoring data from IndexedDB (async)
    store.dispatch(initializeMonitoringFromStorage());
    
    // Initialize automatic cleanup for expired data (TTL)
    await initAutoCleanup().catch((error) => {
      logger.error('Failed to initialize auto-cleanup:', error);
    });
    
    // NOTE: Background refresh service is now started in AuthContext
    // after authentication is confirmed to prevent 401 errors on startup
    
    // Defer non-critical imports to after initial render
    // This improves Time to Interactive (TTI) by reducing initial bundle size
    setTimeout(() => {
      // ECharts configuration - only needed when charts are rendered
      import('./utils/echartsConfig');
    }, 0);
    
    // NOW render the app - IndexedDB is ready
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
    );
  } catch (error) {
    logger.error('CRITICAL: Failed to initialize application:', error);
    // Render error state
    document.getElementById('root')!.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
        <div style="text-align: center;">
          <h1 style="color: #d32f2f;">Failed to Initialize Application</h1>
          <p>IndexedDB initialization failed. Please refresh the page.</p>
          <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            Refresh
          </button>
        </div>
      </div>
    `;
  }
})();
