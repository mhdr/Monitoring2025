/**
 * Language Store
 * 
 * Zustand store for managing language preferences with localStorage persistence.
 * Stores the current language (fa/en) and provides language switching functionality.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/config';
import { createLogger } from '../utils/logger';

const logger = createLogger('LanguageStore');

type Language = 'fa' | 'en';

/**
 * Language store state
 */
interface LanguageState {
  language: Language;
  isLoadingLanguage: boolean;
}

/**
 * Language store actions
 */
interface LanguageActions {
  changeLanguage: (lang: Language) => Promise<void>;
  setLoadingLanguage: (loading: boolean) => void;
}

/**
 * Zustand store for language preferences with localStorage persistence
 */
export const useLanguageStore = create<LanguageState & LanguageActions>()(
  persist(
    (set) => ({
      language: 'en',
      isLoadingLanguage: false,
      
      /**
       * Change the current language
       */
      changeLanguage: async (lang: Language) => {
        set({ isLoadingLanguage: true });
        
        try {
          await i18n.changeLanguage(lang);
          
          // Update document direction and language
          document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
          document.documentElement.lang = lang;
          
          // Update document title (use i18n.t directly)
          document.title = i18n.t('pageTitle');
          
          // Update body class for styling
          document.body.className = lang === 'fa' ? 'rtl' : 'ltr';
          
          // Update store
          set({ language: lang });
          
          logger.info('Language changed:', { language: lang, direction: lang === 'fa' ? 'rtl' : 'ltr' });
        } catch (error) {
          logger.error('Failed to change language:', error);
        } finally {
          set({ isLoadingLanguage: false });
        }
      },
      
      /**
       * Set loading state (used internally)
       */
      setLoadingLanguage: (loading: boolean) => {
        set({ isLoadingLanguage: loading });
      },
    }),
    {
      name: 'language-storage', // localStorage key
      version: 1,
      // Only persist the language, not loading state
      partialize: (state) => ({
        language: state.language,
      }),
    }
  )
);

/**
 * Initialize language from localStorage or default
 * Call this once on app startup
 */
export const initLanguage = async (): Promise<void> => {
  try {
    // Load both languages
    await i18n.loadLanguages(['en', 'fa']);
    
    // Check if there's a stored preference
    const storedLanguage = localStorage.getItem('language-storage');
    let targetLang: Language = 'en';
    
    if (storedLanguage) {
      try {
        const parsed = JSON.parse(storedLanguage);
        if (parsed.state?.language && (parsed.state.language === 'en' || parsed.state.language === 'fa')) {
          targetLang = parsed.state.language;
          logger.log('Stored language detected:', targetLang);
        }
      } catch {
        logger.warn('Failed to parse stored language, using default');
      }
    }
    
    // Set language in i18n
    if (i18n.language !== targetLang) {
      await i18n.changeLanguage(targetLang);
    }
    
    // Update document
    document.documentElement.dir = targetLang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = targetLang;
    document.body.className = targetLang === 'fa' ? 'rtl' : 'ltr';
    
    // Update store
    useLanguageStore.setState({ language: targetLang });
    
    logger.log('Language initialized:', {
      language: targetLang,
      direction: document.documentElement.dir,
    });
  } catch (error) {
    logger.error('Failed to initialize language:', error);
    // Fallback to English
    await i18n.changeLanguage('en');
    useLanguageStore.setState({ language: 'en' });
  }
};
