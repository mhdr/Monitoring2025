import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/auth';
import { authStorageHelpers } from '../../utils/authStorage';
import { api } from '../../services/rtkApi';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Note: Login and refresh token logic is now handled by RTK Query mutations
// The authentication state management remains in this slice for compatibility

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Initialize auth state from storage
     * Called on app startup
     * NOTE: This doesn't properly await getCurrentAuth() because Redux reducers must be synchronous.
     * The actual auth initialization happens in AuthContext which properly awaits.
     * This Redux state is kept for compatibility with existing code but AuthContext is the source of truth.
     */
    initializeAuth: (state) => {
      // getCurrentAuth is async but we can't await in a reducer
      // AuthContext handles the actual async initialization
      // This just sets initial loading state
      state.isLoading = false;
    },

    /**
     * Logout user and clear storage
     */
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      authStorageHelpers.clearStoredAuth();
    },

    /**
     * Clear any error messages
     */
    clearError: (state) => {
      state.error = null;
    },

    /**
     * Update user profile
     */
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Update storage
        if (state.token) {
          authStorageHelpers.setStoredAuth(state.token, state.user);
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Handle RTK Query login mutation
    builder
      .addMatcher(
        api.endpoints.login.matchPending,
        (state) => {
          state.isLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        api.endpoints.login.matchFulfilled,
        (state, action) => {
          state.isLoading = false;
          state.user = action.payload.user;
          state.token = action.payload.accessToken;
          state.isAuthenticated = true;
          state.error = null;
        }
      )
      .addMatcher(
        api.endpoints.login.matchRejected,
        (state, action) => {
          state.isLoading = false;
          const errorData = action.payload as { message?: string };
          state.error = errorData?.message || 'خطا در ورود به سیستم';
          state.isAuthenticated = false;
        }
      );

    // Handle RTK Query refresh token mutation
    builder
      .addMatcher(
        api.endpoints.refreshToken.matchPending,
        (state) => {
          state.isLoading = true;
        }
      )
      .addMatcher(
        api.endpoints.refreshToken.matchFulfilled,
        (state, action) => {
          state.isLoading = false;
          state.user = action.payload.user;
          state.token = action.payload.accessToken;
          state.isAuthenticated = true;
          state.error = null;
        }
      )
      .addMatcher(
        api.endpoints.refreshToken.matchRejected,
        (state, action) => {
          state.isLoading = false;
          const errorData = action.payload as { message?: string };
          state.error = errorData?.message || 'خطا در بازیابی توکن';
          // Don't clear auth on refresh failure - let the user stay logged in
        }
      );
  },
});

export const { initializeAuth, logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
