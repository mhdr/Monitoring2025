/**
 * Theme Store
 * 
 * Zustand store for managing MUI theme preferences with localStorage persistence.
 * Stores the current theme preset (light/dark mode).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MuiThemePreset } from '../types/muiThemes';
import { getDefaultMuiTheme } from '../types/muiThemes';
import { createLogger } from '../utils/logger';

const logger = createLogger('ThemeStore');

/**
 * Theme store state and actions
 */
interface ThemeStore {
  currentTheme: MuiThemePreset;
  setTheme: (theme: MuiThemePreset) => void;
}

/**
 * Zustand store for theme preferences with localStorage persistence
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: getDefaultMuiTheme(),
      
      /**
       * Set the current theme
       */
      setTheme: (theme: MuiThemePreset) => {
        logger.info('Setting theme:', theme);
        set({ currentTheme: theme });
      },
    }),
    {
      name: 'mui-theme-storage', // localStorage key
      version: 1,
    }
  )
);

/**
 * Helper functions for backward compatibility
 */
export const getCurrentTheme = async (): Promise<MuiThemePreset> => {
  return useThemeStore.getState().currentTheme;
};

export const setCurrentTheme = async (theme: MuiThemePreset): Promise<void> => {
  useThemeStore.getState().setTheme(theme);
};
