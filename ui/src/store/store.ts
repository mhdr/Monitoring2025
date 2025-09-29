import { configureStore } from '@reduxjs/toolkit';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';

// Configure the store
export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add the generated reducer as a specific top-level slice
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling and other useful features of RTK Query
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
  // Enable Redux DevTools in development with enhanced options
  devTools: import.meta.env.DEV && {
    name: 'Monitoring2025 UI',
    trace: true,
    traceLimit: 25,
  },
});

// Define RootState and AppDispatch types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;