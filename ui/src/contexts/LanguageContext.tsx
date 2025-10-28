import React, { createContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';

type Language = 'fa' | 'en';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  isLoadingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export { LanguageContext };

// Bootstrap CSS loading removed - MUI handles RTL through MuiThemeProvider

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const currentLanguage = i18n.language as Language;
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(false);

  const changeLanguage = async (lang: Language) => {
    setIsLoadingLanguage(true);
    
    try {
      await i18n.changeLanguage(lang);
      
      // Update document direction and language
      document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      
      // Update document title
      document.title = t('pageTitle');
      
      // Update body class for styling
      document.body.className = lang === 'fa' ? 'rtl' : 'ltr';
    } finally {
      setIsLoadingLanguage(false);
    }
  };

  useEffect(() => {
    // Set initial direction based on current language
    const lang = i18n.language as Language;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    
    // Set initial document title
    document.title = t('pageTitle');
    
    document.body.className = lang === 'fa' ? 'rtl' : 'ltr';
    
    // Listen for language changes
    const handleLanguageChanged = (lng: string) => {
      const newLang = lng as Language;
      document.documentElement.dir = newLang === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = newLang;
      document.title = t('pageTitle');
      document.body.className = newLang === 'fa' ? 'rtl' : 'ltr';
    };
    
    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [t]);

  return (
    <LanguageContext.Provider value={{ language: currentLanguage, changeLanguage, t, isLoadingLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};