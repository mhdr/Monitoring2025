/**
 * useLanguage Hook
 * 
 * Hook for accessing and managing language preferences.
 * Uses Zustand store instead of React Context.
 */

import { useLanguageStore } from '../stores/languageStore';
import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const language = useLanguageStore((state) => state.language);
  const isLoadingLanguage = useLanguageStore((state) => state.isLoadingLanguage);
  const changeLanguage = useLanguageStore((state) => state.changeLanguage);
  const { t } = useTranslation();
  
  return {
    language,
    isLoadingLanguage,
    changeLanguage,
    t,
  };
};