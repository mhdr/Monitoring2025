/**
 * Custom hook to get translation function from Redux
 * Use this to access translations in your components
 */
import { useAppSelector } from './useRedux';
import { translations, type TranslationKey } from '../utils/translations';

export const useTranslation = () => {
  const currentLanguage = useAppSelector(state => state.language.currentLanguage);
  
  const t = (key: TranslationKey): string => {
    return translations[currentLanguage][key] || key;
  };
  
  return { t, language: currentLanguage };
};
