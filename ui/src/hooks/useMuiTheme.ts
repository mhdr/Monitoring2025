/**
 * Custom hook for MUI theme management
 */

import { useContext, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { MuiThemeContext } from '../contexts/MuiThemeProvider';
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
  const themeContext = useContext(MuiThemeContext);

  if (!themeContext) {
    throw new Error('useMuiTheme must be used within MuiThemeProvider');
  }

  const { currentTheme, setTheme } = themeContext;

  const changeTheme = useCallback(
    async (themePreset: MuiThemePreset) => {
      await setTheme(themePreset);
    },
    [setTheme]
  );

  return {
    theme,
    currentThemePreset: currentTheme,
    changeTheme,
    getThemeConfig: getMuiThemeConfig,
    getThemesByCategory: getMuiThemesByCategory,
  };
}
