import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Language } from '../../utils/translations';
import { translations } from '../../utils/translations';

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
      
      // Update document direction and language attributes
      document.documentElement.dir = action.payload === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = action.payload;
      
      // Update document title
      document.title = translations[action.payload].pageTitle;
      
      // Update body class for styling
      document.body.className = action.payload === 'fa' ? 'rtl' : 'ltr';
    },

    /**
     * Initialize language from localStorage
     * Called on app startup
     */
    initializeLanguage: (state) => {
      const savedLanguage = localStorage.getItem('language') as Language;
      const language = savedLanguage || 'fa';
      
      state.currentLanguage = language;
      
      // Update document properties
      document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
      document.title = translations[language].pageTitle;
      document.body.className = language === 'fa' ? 'rtl' : 'ltr';
    },
  },
});

export const { setLanguage, initializeLanguage } = languageSlice.actions;
export default languageSlice.reducer;
