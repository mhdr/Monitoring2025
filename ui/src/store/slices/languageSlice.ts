import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Language } from '../../utils/translations';
import i18n from '../../i18n/config';

interface LanguageState {
  currentLanguage: Language;
}

const initialState: LanguageState = {
  currentLanguage: 'fa', // Persian is the default/primary language
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    /**
     * Change the application language
     * Also updates document properties (dir, lang, title)
     */
    setLanguage: (state, action: PayloadAction<Language>) => {
      state.currentLanguage = action.payload;
      
      // Change i18next language
      i18n.changeLanguage(action.payload);
      
      // Update document direction and language attributes
      document.documentElement.dir = action.payload === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = action.payload;
      
      // Update document title (will be updated by LanguageContext)
      // Update body class for styling
      document.body.className = action.payload === 'fa' ? 'rtl' : 'ltr';
    },

    /**
     * Initialize language from storage
     * Called on app startup
     * Note: Language detection priority:
     * 1. i18next's localStorage detection (most recent user choice)
     * 2. Redux persisted state from IndexedDB
     * 3. Default fallback to 'fa'
     */
    initializeLanguage: (state) => {
      // Use i18next's detected language as the source of truth
      // i18next already handles localStorage detection via LanguageDetector
      const detectedLanguage = (i18n.language || state.currentLanguage || 'fa') as Language;
      
      // Sync Redux state with detected language
      state.currentLanguage = detectedLanguage;
      
      // Update document properties
      document.documentElement.dir = detectedLanguage === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = detectedLanguage;
      document.body.className = detectedLanguage === 'fa' ? 'rtl' : 'ltr';
    },
  },
});

export const { setLanguage, initializeLanguage } = languageSlice.actions;
export default languageSlice.reducer;
