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
      // Theme is now persisted via redux-persist with IndexedDB
      // This reducer is kept for compatibility but state.currentTheme
      // will already be restored by the time this is called
      // No need to manually load from storage
      if (!state.currentTheme) {
        state.currentTheme = getDefaultMuiTheme();
      }
    },
  },
});

export const { setMuiTheme, initializeMuiTheme } = muiThemeSlice.actions;

// Selectors
export const selectCurrentMuiTheme = (state: RootState): MuiThemePreset =>
  state.muiTheme.currentTheme;

export default muiThemeSlice.reducer;
