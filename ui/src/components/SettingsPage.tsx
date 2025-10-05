import { Container, Row, Col, Card } from 'react-bootstrap';
import { useTranslation } from '../hooks/useTranslation';
import ThemeSwitcher from './ThemeSwitcher';
import './SettingsPage.css';

/**
 * SettingsPage Component
 * 
 * Displays user settings including theme and language preferences.
 * Accessible from the user dropdown menu.
 */
const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="settings-page" data-id-ref="settings-page-root">
      <Container fluid className="py-4" data-id-ref="settings-page-container">
        <Row data-id-ref="settings-page-header-row">
          <Col data-id-ref="settings-page-header-col">
            <div className="page-header mb-4" data-id-ref="settings-page-header">
              <h1 className="page-title" data-id-ref="settings-page-title">
                <i className="bi bi-gear-fill me-2" data-id-ref="settings-page-title-icon"></i>
                {t('settings.pageTitle')}
              </h1>
              <p className="page-description text-muted" data-id-ref="settings-page-description">
                {t('settings.pageDescription')}
              </p>
            </div>
          </Col>
        </Row>

        <Row className="g-4" data-id-ref="settings-page-content-row">
          {/* Theme Settings */}
          <Col xs={12} lg={6} data-id-ref="settings-page-theme-col">
            <Card className="h-100 shadow-sm settings-card" data-id-ref="settings-page-theme-card">
              <Card.Body data-id-ref="settings-page-theme-card-body">
                <Card.Title className="mb-4" data-id-ref="settings-page-theme-card-title">
                  <i className="bi bi-palette-fill me-2" data-id-ref="settings-page-theme-icon"></i>
                  {t('settings.theme.sectionTitle')}
                </Card.Title>
                <Card.Text className="text-muted mb-4" data-id-ref="settings-page-theme-description">
                  {t('settings.theme.sectionDescription')}
                </Card.Text>
                <ThemeSwitcher />
              </Card.Body>
            </Card>
          </Col>

          {/* Language Settings */}
          <Col xs={12} lg={6} data-id-ref="settings-page-language-col">
            <Card className="h-100 shadow-sm settings-card" data-id-ref="settings-page-language-card">
              <Card.Body data-id-ref="settings-page-language-card-body">
                <Card.Title className="mb-4" data-id-ref="settings-page-language-card-title">
                  <i className="bi bi-globe me-2" data-id-ref="settings-page-language-icon"></i>
                  {t('settings.language.sectionTitle')}
                </Card.Title>
                <Card.Text className="text-muted mb-4" data-id-ref="settings-page-language-description">
                  {t('settings.language.sectionDescription')}
                </Card.Text>
                <div className="language-switcher-section" data-id-ref="settings-page-language-switcher-section">
                  <LanguageOptions />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

/**
 * LanguageOptions Component
 * 
 * Displays language selection options for Persian and English.
 */
const LanguageOptions = () => {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();

  return (
    <div className="language-options-grid" data-id-ref="settings-language-options-grid">
      <button
        type="button"
        className={`language-option-btn ${language === 'fa' ? 'active' : ''}`}
        onClick={() => changeLanguage('fa')}
        aria-label="فارسی"
        data-id-ref="settings-language-option-fa"
      >
        <span className="language-flag" data-id-ref="settings-language-flag-fa">
          🇮🇷
        </span>
        <div className="language-info" data-id-ref="settings-language-info-fa">
          <span className="language-name" data-id-ref="settings-language-name-fa">
            فارسی
          </span>
          <span className="language-description" data-id-ref="settings-language-desc-fa">
            {t('settings.language.persianDescription')}
          </span>
        </div>
        {language === 'fa' && (
          <i className="bi bi-check-circle-fill language-check" data-id-ref="settings-language-check-fa"></i>
        )}
      </button>
      <button
        type="button"
        className={`language-option-btn ${language === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        aria-label="English"
        data-id-ref="settings-language-option-en"
      >
        <span className="language-flag" data-id-ref="settings-language-flag-en">
          🇬🇧
        </span>
        <div className="language-info" data-id-ref="settings-language-info-en">
          <span className="language-name" data-id-ref="settings-language-name-en">
            English
          </span>
          <span className="language-description" data-id-ref="settings-language-desc-en">
            {t('settings.language.englishDescription')}
          </span>
        </div>
        {language === 'en' && (
          <i className="bi bi-check-circle-fill language-check" data-id-ref="settings-language-check-en"></i>
        )}
      </button>
    </div>
  );
};

// Need to import useLanguage
import { useLanguage } from '../hooks/useLanguage';

export default SettingsPage;
