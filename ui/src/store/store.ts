import { configureStore } from '@reduxjs/toolkit';
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
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';

// Persist configuration for the API slice
// This will persist the RTK Query cache data
const apiPersistConfig = {
  key: 'api',
  storage,
  // Only persist the cached queries we want to keep
  whitelist: ['queries'],
  // Blacklist any sensitive data if needed
  blacklist: ['mutations', 'provided', 'subscriptions', 'config'],
};

// Create a persisted reducer for the API slice
const persistedApiReducer = persistReducer(apiPersistConfig, apiSlice.reducer);

// Configure the store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Use the persisted reducer for the API slice
    [apiSlice.reducerPath]: persistedApiReducer,
  },
  // Adding the api middleware enables caching, invalidation, polling and other useful features of RTK Query
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from redux-persist
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apiSlice.middleware),
  // Enable Redux DevTools in development with enhanced options
  devTools: import.meta.env.DEV && {
    name: 'Monitoring2025 UI',
    trace: true,
    traceLimit: 25,
  },
});

// Create a persistor
export const persistor = persistStore(store);

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;