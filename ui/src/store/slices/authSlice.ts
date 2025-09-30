import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/auth';
import { authStorageHelpers } from '../../utils/authStorage';

// Define the initial state interface
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Get initial state from storage
const initializeFromStorage = () => {
  const authState = authStorageHelpers.getCurrentAuth();
  return {
    user: authState.user,
    token: authState.token,
    isAuthenticated: Boolean(authState.token && authState.user),
    isLoading: false,
  };
};

// Define the initial state
const initialState: AuthState = initializeFromStorage();

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Set auth state (called after successful login)
    setAuth: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
    },
    
    // Clear auth state (called on logout)
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      // Also clear from storage
      authStorageHelpers.clearStoredAuth();
    },
    
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Initialize auth from storage (called on app start)
    initializeAuth: (state) => {
      const authState = authStorageHelpers.getCurrentAuth();
      state.user = authState.user;
      state.token = authState.token;
      state.isAuthenticated = Boolean(authState.token && authState.user);
      state.isLoading = false;
    },
  },
});

// Export actions
export const { setAuth, clearAuth, setLoading, initializeAuth } = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;

// Export the reducer
export default authSlice.reducer;