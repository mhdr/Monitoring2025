import './App.css'
import { useLanguage } from './hooks/useLanguage'
import LanguageSwitcher from './components/LanguageSwitcher'

function App() {
  const { t } = useLanguage()

  return (
    <>
      <LanguageSwitcher />
      <div className="app-container">
        <header className="app-header">
          <h1>{t('monitoring')} {t('warehouse')}</h1>
        </header>
        
        <nav className="app-nav">
          <button className="nav-button">{t('dashboard')}</button>
          <button className="nav-button">{t('warehouse')}</button>
          <button className="nav-button">{t('reports')}</button>
          <button className="nav-button">{t('settings')}</button>
        </nav>
        
        <main className="app-main">
          <div className="welcome-section">
            <h2>{t('welcome')}</h2>
            <p>{t('systemDescription')}</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <h3>{t('notifications')}</h3>
              <p>{t('notificationDescription')}</p>
            </div>
            <div className="feature-card">
              <h3>{t('users')}</h3>
              <p>{t('userDescription')}</p>
            </div>
            <div className="feature-card">
              <h3>{t('reports')}</h3>
              <p>{t('reportDescription')}</p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

export default App
