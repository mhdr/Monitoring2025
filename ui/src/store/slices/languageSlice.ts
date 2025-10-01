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
     * Initialize language from localStorage
     * Called on app startup
     */
    initializeLanguage: (state) => {
      const savedLanguage = localStorage.getItem('i18nextLng') as Language;
      const language = savedLanguage || 'fa';
      
      state.currentLanguage = language;
      
      // Change i18next language
      i18n.changeLanguage(language);
      
      // Update document properties
      document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
      document.documentElement.lang = language;
      document.body.className = language === 'fa' ? 'rtl' : 'ltr';
    },
  },
});

export const { setLanguage, initializeLanguage } = languageSlice.actions;
export default languageSlice.reducer;
