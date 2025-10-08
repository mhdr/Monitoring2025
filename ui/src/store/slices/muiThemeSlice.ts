/**
 * MUI Theme Redux Slice
 * Manages MUI theme state and persistence
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { getDefaultMuiTheme } from '../../types/muiThemes';
import type { MuiThemePreset } from '../../types/muiThemes';

interface MuiThemeState {
  currentTheme: MuiThemePreset;
}

const initialState: MuiThemeState = {
  currentTheme: getDefaultMuiTheme(),
};

const muiThemeSlice = createSlice({
  name: 'muiTheme',
  initialState,
  reducers: {
    setMuiTheme: (state, action: PayloadAction<MuiThemePreset>) => {
      state.currentTheme = action.payload;
    },
    initializeMuiTheme: (state) => {
      // Load from localStorage if available
      const stored = localStorage.getItem('muiTheme');
      if (stored) {
        state.currentTheme = stored as MuiThemePreset;
      }
    },
  },
});

export const { setMuiTheme, initializeMuiTheme } = muiThemeSlice.actions;

// Selectors
export const selectCurrentMuiTheme = (state: RootState): MuiThemePreset =>
  state.muiTheme.currentTheme;

export default muiThemeSlice.reducer;
