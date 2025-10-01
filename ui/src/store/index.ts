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
import storage from 'redux-persist/lib/storage'; // defaults to localStorage
import sessionStorage from 'redux-persist/lib/storage/session'; // sessionStorage

import authReducer from './slices/authSlice';
import languageReducer from './slices/languageSlice';
import monitoringReducer from './slices/monitoringSlice';

/**
 * Persistence configuration for language
 * Language preference is always stored in localStorage
 */
const languagePersistConfig = {
  key: 'language',
  storage, // localStorage
  whitelist: ['currentLanguage'], // Only persist language selection
};

/**
 * Persistence configuration for auth
 * Note: Auth is handled by authStorage utility for more control over localStorage vs sessionStorage
 * We don't persist auth in Redux to avoid conflicts with the existing storage mechanism
 */
const authPersistConfig = {
  key: 'auth',
  storage: sessionStorage, // Use sessionStorage to avoid conflicts
  blacklist: ['isLoading', 'error'], // Don't persist loading and error states
};

/**
 * Root reducer combining all slices
 */
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  language: persistReducer(languagePersistConfig, languageReducer),
  monitoring: monitoringReducer,
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
    }),
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
