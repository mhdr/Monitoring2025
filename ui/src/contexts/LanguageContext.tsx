import React, { createContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/config';

type Language = 'fa' | 'en';

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isLoadingLanguage: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export { LanguageContext };

/**
 * Dynamically load Bootstrap CSS (LTR or RTL variant)
 * Replaces the base Bootstrap stylesheet with RTL variant when needed
 */
const loadBootstrapCSS = async (lang: Language) => {
  const BOOTSTRAP_LINK_ID = 'bootstrap-stylesheet';
  
  // For Persian (RTL), load Bootstrap RTL stylesheet
  // For English (LTR), the default bootstrap.min.css from main.tsx is used
  if (lang === 'fa') {
    // Dynamically import Bootstrap RTL CSS
    const bootstrapRTL = await import('bootstrap/dist/css/bootstrap.rtl.min.css?url');
    
    // Find or create the Bootstrap stylesheet link
    let link = document.getElementById(BOOTSTRAP_LINK_ID) as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.id = BOOTSTRAP_LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    
    // Update href to RTL version
    link.href = bootstrapRTL.default;
  } else {
    // For LTR, load standard Bootstrap CSS
    const bootstrapLTR = await import('bootstrap/dist/css/bootstrap.min.css?url');
    
    let link = document.getElementById(BOOTSTRAP_LINK_ID) as HTMLLinkElement;
    
    if (!link) {
      link = document.createElement('link');
      link.id = BOOTSTRAP_LINK_ID;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    
    // Update href to LTR version
    link.href = bootstrapLTR.default;
  }
};

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
      
      // Load appropriate Bootstrap CSS (RTL for Persian, default LTR for English)
      loadBootstrapCSS(lang);
      
      // Small delay to ensure CSS is fully applied
      await new Promise(resolve => setTimeout(resolve, 200));
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
    
    // Load appropriate Bootstrap CSS on initial load
    loadBootstrapCSS(lang);
    
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