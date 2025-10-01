/**
 * Custom hook wrapper for react-i18next
 * Provides translation function with type safety
 */
import { useTranslation as useI18nextTranslation } from 'react-i18next';

export const useTranslation = () => {
  const { t, i18n } = useI18nextTranslation();
  
  return { 
    t, 
    language: i18n.language as 'fa' | 'en' 
  };
};
