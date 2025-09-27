import React from 'react';
import { Button } from 'react-bootstrap';
import { useLanguage } from '../hooks/useLanguage';
import './LanguageSwitcher.css';

const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    const newLang = language === 'fa' ? 'en' : 'fa';
    changeLanguage(newLang);
  };

  return (
    <Button 
      variant="primary"
      size="sm"
      className="position-fixed language-switcher d-flex align-items-center gap-2 px-3 py-2 rounded-pill shadow-sm"
      onClick={toggleLanguage}
      title={`Switch to ${language === 'fa' ? 'English' : 'فارسی'}`}
    >
      <span className="language-text small fw-medium">{t('languageSwitch')}</span>
      <span className="language-icon">🌐</span>
    </Button>
  );
};

export default LanguageSwitcher;