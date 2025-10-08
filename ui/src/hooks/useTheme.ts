import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { initializeTheme } from '../store/slices/themeSlice';
import { getThemeById } from '../types/themes';
import { applyTheme } from '../utils/themeUtils';
import { useLanguage } from './useLanguage';

/**
 * useTheme Hook
 * 
 * Custom hook to manage Bootswatch theme initialization and application.
 * - Initializes theme from localStorage on mount
 * - Loads and applies Bootswatch theme CSS when theme changes
 * - Extracts and applies theme colors to custom CSS variables
 * - Supports RTL/LTR theme variants based on language
 * - Returns current theme information
 */
export const useTheme = () => {
  const dispatch = useAppDispatch();
  const currentThemeId = useAppSelector((state) => state.theme.currentThemeId);
  const { language } = useLanguage();

  // Initialize theme on mount (load from localStorage)
  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  // Apply theme whenever theme or language changes
  useEffect(() => {
    const theme = getThemeById(currentThemeId);
    if (theme) {
      // applyTheme is now async as it loads Bootswatch CSS
      // Pass language to load correct RTL/LTR variant
      applyTheme(theme, language).catch((error) => {
        console.error('Failed to apply theme:', error);
      });
    }
  }, [currentThemeId, language]);

  return {
    currentThemeId,
    currentTheme: getThemeById(currentThemeId),
  };
};
