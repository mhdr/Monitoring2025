import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './linux-fonts.css'
import './iransansx-features.css'
import './styles/mobile.css' // Mobile enhancements
import i18n from './i18n/config' // Initialize i18next
import { LanguageProvider } from './contexts/LanguageContext'
import { MuiThemeProvider } from './contexts/MuiThemeProvider'
import { AuthProvider } from './contexts/AuthContext'
import { MonitoringProvider } from './contexts/MonitoringContext'
import { createLogger } from './utils/logger'
import App from './App.tsx'

const logger = createLogger('Main');

// Initialize app (no IndexedDB needed - using Zustand + localStorage now)
(async () => {
  try {
    // CRITICAL: Ensure language is properly initialized before React renders
    // Wait for i18n to be fully initialized
    await i18n.loadLanguages(['en', 'fa']);
    
    // Check if user has a language preference stored
    const storedLanguage = localStorage.getItem('i18nextLng');
    if (storedLanguage && (storedLanguage === 'en' || storedLanguage === 'fa')) {
      // User has a stored preference - use it
      logger.log('Stored language detected:', storedLanguage);
      if (i18n.language !== storedLanguage) {
        await i18n.changeLanguage(storedLanguage);
      }
    } else {
      // First time user - default to English
      logger.log('First load detected, setting default language to English');
      await i18n.changeLanguage('en');
      localStorage.setItem('i18nextLng', 'en');
    }
    
    // Set document direction based on language
    const isRTL = i18n.language === 'fa';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
    logger.log('Language initialized:', {
      language: i18n.language,
      direction: document.documentElement.dir,
      storedLanguage
    });
    
    // NOTE: No cleanup needed with localStorage (unlike IndexedDB TTL)
    // Zustand persist middleware handles localStorage automatically
    
    // NOTE: Background refresh service is now started in AuthContext
    // after authentication is confirmed to prevent 401 errors on startup
    
    // Defer non-critical imports to after initial render
    // This improves Time to Interactive (TTI) by reducing initial bundle size
    setTimeout(() => {
      // ECharts configuration - only needed when charts are rendered
      import('./utils/echartsConfig');
    }, 0);
    
    // NOW render the app - IndexedDB is ready
    // Context providers handle their own initialization from IndexedDB
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <LanguageProvider>
          <MuiThemeProvider>
            <AuthProvider>
              <MonitoringProvider>
                <App />
              </MonitoringProvider>
            </AuthProvider>
          </MuiThemeProvider>
        </LanguageProvider>
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
