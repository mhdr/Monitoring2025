import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './linux-fonts.css'
import './iransansx-features.css'
import './styles/mobile.css' // Mobile enhancements
import { MuiThemeWrapper } from './contexts/MuiThemeProvider'
import { initLanguage } from './stores/languageStore'
import { createLogger } from './utils/logger'
import App from './App.tsx'

const logger = createLogger('Main');

// Initialize app with Zustand stores (no Context providers needed)
(async () => {
  try {
    // Initialize language from store (loads i18n, sets document direction)
    await initLanguage();
    
    logger.log('Application initialization complete');
    
    // Defer non-critical imports to after initial render
    // This improves Time to Interactive (TTI) by reducing initial bundle size
    setTimeout(() => {
      // ECharts configuration - only needed when charts are rendered
      import('./utils/echartsConfig');
    }, 0);
    
    // Render the app with only MUI theme wrapper (no Context providers)
    // All state is managed by Zustand stores with localStorage persistence
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <MuiThemeWrapper>
          <App />
        </MuiThemeWrapper>
      </StrictMode>,
    );
  } catch (error) {
    logger.error('CRITICAL: Failed to initialize application:', error);
    // Render error state
    document.getElementById('root')!.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: sans-serif;">
        <div style="text-align: center;">
          <h1 style="color: #d32f2f;">Failed to Initialize Application</h1>
          <p>Application initialization failed. Please refresh the page.</p>
          <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
            Refresh
          </button>
        </div>
      </div>
    `;
  }
})();
