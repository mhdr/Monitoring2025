/**
 * Theme Redux Slice
 * 
 * Manages theme state and persistence
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_THEME_ID } from '../../types/themes';

interface ThemeState {
  currentThemeId: string;
  initialized: boolean;
}

const initialState: ThemeState = {
  currentThemeId: DEFAULT_THEME_ID,
  initialized: false,
};

// Local storage key
const THEME_STORAGE_KEY = 'monitoring2025_theme';

/**
 * Load theme from localStorage
 */
export const loadThemeFromStorage = (): string => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved || DEFAULT_THEME_ID;
  } catch (error) {
    console.error('Error loading theme from storage:', error);
    return DEFAULT_THEME_ID;
  }
};

/**
 * Save theme to localStorage
 */
export const saveThemeToStorage = (themeId: string): void => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch (error) {
    console.error('Error saving theme to storage:', error);
  }
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    /**
     * Initialize theme from localStorage
     */
    initializeTheme: (state) => {
      const savedThemeId = loadThemeFromStorage();
      state.currentThemeId = savedThemeId;
      state.initialized = true;
    },

    /**
     * Set current theme
     */
    setTheme: (state, action: PayloadAction<string>) => {
      const themeId = action.payload;
      state.currentThemeId = themeId;
      saveThemeToStorage(themeId);
    },

    /**
     * Reset theme to default
     */
    resetTheme: (state) => {
      state.currentThemeId = DEFAULT_THEME_ID;
      saveThemeToStorage(DEFAULT_THEME_ID);
    },
  },
});

export const { initializeTheme, setTheme, resetTheme } = themeSlice.actions;
export default themeSlice.reducer;
