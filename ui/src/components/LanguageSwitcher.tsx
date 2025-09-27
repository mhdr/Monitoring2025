import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import './LanguageSwitcher.css';

const LanguageSwitcher: React.FC = () => {
  const { language, changeLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    const newLang = language === 'fa' ? 'en' : 'fa';
    changeLanguage(newLang);
  };

  return (
    <button 
      className="language-switcher"
      onClick={toggleLanguage}
      title={`Switch to ${language === 'fa' ? 'English' : 'فارسی'}`}
    >
      <span className="language-text">{t('languageSwitch')}</span>
      <span className="language-icon">🌐</span>
    </button>
  );
};

export default LanguageSwitcher;