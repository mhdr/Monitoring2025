import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import indexedDBReduxStorage from '../utils/indexedDbReduxStorage';

import authReducer from './slices/authSlice';
import languageReducer from './slices/languageSlice';
import monitoringReducer from './slices/monitoringSlice';
import muiThemeReducer from './slices/muiThemeSlice';
import { api } from '../services/rtkApi';

/**
 * Persistence configuration for language
 * Language preference is stored in IndexedDB
 */
const languagePersistConfig = {
  key: 'language',
  storage: indexedDBReduxStorage,
  whitelist: ['currentLanguage'], // Only persist language selection
};

/**
 * Persistence configuration for MUI theme
 * Theme preference is stored in IndexedDB
 */
const muiThemePersistConfig = {
  key: 'muiTheme',
  storage: indexedDBReduxStorage,
  whitelist: ['currentTheme'], // Only persist theme selection
};

/**
 * Persistence configuration for auth
 * Note: Auth is handled by authStorage utility
 * We use minimal persistence in Redux to avoid conflicts with the storage utility
 */
const authPersistConfig = {
  key: 'auth',
  storage: indexedDBReduxStorage,
  blacklist: ['isLoading', 'error'], // Don't persist loading and error states
};

/**
 * Root reducer combining all slices
 */
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  language: persistReducer(languagePersistConfig, languageReducer),
  muiTheme: persistReducer(muiThemePersistConfig, muiThemeReducer),
  monitoring: monitoringReducer,
  // Add RTK Query API reducer
  [api.reducerPath]: api.reducer,
});

/**
 * Configure Redux store with middleware
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
    // Add RTK Query middleware for caching, invalidation, polling, and more
    .concat(api.middleware),
  devTools: import.meta.env.DEV, // Enable Redux DevTools in development
});

/**
 * Create persistor for redux-persist
 */
export const persistor = persistStore(store);

/**
 * Infer types from store
 */
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
