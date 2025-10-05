import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { initializeTheme } from '../store/slices/themeSlice';
import { getThemeById } from '../types/themes';
import { applyTheme } from '../utils/themeUtils';

/**
 * useTheme Hook
 * 
 * Custom hook to manage theme initialization and application.
 * - Initializes theme from localStorage on mount
 * - Applies theme colors when theme changes
 * - Returns current theme information
 */
export const useTheme = () => {
  const dispatch = useAppDispatch();
  const currentThemeId = useAppSelector((state) => state.theme.currentThemeId);

  // Initialize theme on mount (load from localStorage)
  useEffect(() => {
    dispatch(initializeTheme());
  }, [dispatch]);

  // Apply theme colors whenever theme changes
  useEffect(() => {
    const theme = getThemeById(currentThemeId);
    if (theme) {
      applyTheme(theme);
    }
  }, [currentThemeId]);

  return {
    currentThemeId,
    currentTheme: getThemeById(currentThemeId),
  };
};
