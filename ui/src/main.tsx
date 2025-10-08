import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import 'bootstrap/dist/css/bootstrap.min.css' // Bootstrap CSS - base styles
import './index.css'
import './iransansx-features.css'
import './i18n/config' // Initialize i18next
import { LanguageProvider } from './contexts/LanguageContext'
import { AuthProvider } from './contexts/AuthContext'
import { store, persistor } from './store'
import { initializeAuth } from './store/slices/authSlice'
import { initializeLanguage } from './store/slices/languageSlice'
import App from './App.tsx'

// Initialize Redux state from storage
store.dispatch(initializeAuth());
store.dispatch(initializeLanguage());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
)
