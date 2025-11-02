/**
 * useMuiTheme Hook
 * 
 * Hook for accessing and managing MUI theme.
 * Uses Zustand store instead of React Context.
 */

import { useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { useThemeStore } from '../stores/themeStore';
import type { MuiThemePreset } from '../types/muiThemes';
import { getMuiThemeConfig, getMuiThemesByCategory } from '../types/muiThemes';

interface UseMuiThemeReturn {
  theme: Theme;
  currentThemePreset: MuiThemePreset;
  changeTheme: (themePreset: MuiThemePreset) => Promise<void>;
  getThemeConfig: typeof getMuiThemeConfig;
  getThemesByCategory: typeof getMuiThemesByCategory;
}

/**
 * Hook for accessing and managing MUI theme
 */
export function useMuiTheme(): UseMuiThemeReturn {
  const theme = useTheme();
  const currentThemePreset = useThemeStore((state) => state.currentTheme);
  const setTheme = useThemeStore((state) => state.setTheme);

  const changeTheme = useCallback(
    async (themePreset: MuiThemePreset) => {
      setTheme(themePreset);
    },
    [setTheme]
  );

  return {
    theme,
    currentThemePreset,
    changeTheme,
    getThemeConfig: getMuiThemeConfig,
    getThemesByCategory: getMuiThemesByCategory,
  };
}
