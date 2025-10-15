import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Initialize i18next
i18n
  // Load translations using http backend
  .use(Backend)
  // Detect user language
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next
  .use(initReactI18next)
  // Init i18next
  .init({
    // Default language (Persian as specified in requirements)
    fallbackLng: 'fa',
    lng: 'fa', // Default to Persian
    
    // Debug mode for development
    debug: import.meta.env.DEV,
    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Backend configuration
    backend: {
      // Path to load translations from
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Namespaces
    ns: ['translation'], // Default namespace
    defaultNS: 'translation',
    
    // Language detection options
    detection: {
      // Order of language detection methods
      order: ['localStorage', 'navigator'],
      // Cache user language selection
      caches: ['localStorage'],
      // Key to store language in localStorage
      lookupLocalStorage: 'i18nextLng',
    },
    
    // React specific options
    react: {
      // Don't wait for translations to be loaded - render immediately with loading state
      // This prevents blocking the initial render and improves Time to Interactive
      useSuspense: false,
    },
    
    // Load options
    load: 'currentOnly', // Only load the current language, not all fallbacks
    preload: ['fa'], // Preload only default language
    
    // Partition translations into smaller chunks (if using multiple namespaces)
    partialBundledLanguages: true,
  });

export default i18n;
