import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';

// Configure the store
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
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