/**
 * Custom hook for MUI theme management
 */

import { useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { useAppDispatch, useAppSelector } from './useRedux';
import { setMuiTheme, selectCurrentMuiTheme } from '../store/slices/muiThemeSlice';
import type { MuiThemePreset } from '../types/muiThemes';
import { getMuiThemeConfig, getMuiThemesByCategory } from '../types/muiThemes';

interface UseMuiThemeReturn {
  theme: Theme;
  currentThemePreset: MuiThemePreset;
  changeTheme: (themePreset: MuiThemePreset) => void;
  getThemeConfig: typeof getMuiThemeConfig;
  getThemesByCategory: typeof getMuiThemesByCategory;
}

/**
 * Hook for accessing and managing MUI theme
 */
export function useMuiTheme(): UseMuiThemeReturn {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const currentThemePreset = useAppSelector(selectCurrentMuiTheme);

  const changeTheme = useCallback(
    (themePreset: MuiThemePreset) => {
      dispatch(setMuiTheme(themePreset));
      localStorage.setItem('muiTheme', themePreset);
    },
    [dispatch]
  );

  return {
    theme,
    currentThemePreset,
    changeTheme,
    getThemeConfig: getMuiThemeConfig,
    getThemesByCategory: getMuiThemesByCategory,
  };
}
