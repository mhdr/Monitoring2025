import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types/auth';
import { authStorageHelpers } from '../../utils/authStorage';
import { api } from '../../services/rtkApi';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AuthSlice');

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
  isLoading: true, // Start with loading=true, will be set false after initialization
  error: null,
};

// Note: Login and refresh token logic is now handled by RTK Query mutations
// The authentication state management remains in this slice for compatibility with AuthContext

/**
 * Async thunk to initialize auth state from IndexedDB storage
 * CRITICAL: This populates both Redux state AND the token cache (required for gRPC client)
 * Must be called and awaited before rendering the app to prevent 401 errors in gRPC streams
 */
export const initializeAuth = createAsyncThunk(
  'auth/initializeAuth',
  async (_, { rejectWithValue }) => {
    try {
      logger.log('Initializing auth from storage...');
      
      // Load auth data from IndexedDB
      // CRITICAL: This also populates the token cache via getStoredToken()
      const authState = await authStorageHelpers.getCurrentAuth();
      
      logger.log('Auth initialization complete:', {
        hasToken: !!authState.token,
        hasUser: !!authState.user,
        isAuthenticated: !!(authState.token && authState.user),
      });
      
      return {
        token: authState.token,
        refreshToken: authState.refreshToken,
        user: authState.user,
      };
    } catch (error) {
      logger.error('Failed to initialize auth from storage:', error);
      return rejectWithValue('Failed to load authentication data');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Synchronously set auth state (called by AuthContext after async load)
     * This keeps Redux state in sync with AuthContext
     */
    setAuthState: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
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
    // Handle initializeAuth async thunk
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.token && action.payload.user) {
          state.token = action.payload.token;
          state.user = action.payload.user;
          state.isAuthenticated = true;
        } else {
          // No stored auth found
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'Failed to initialize authentication';
        state.token = null;
        state.user = null;
        state.isAuthenticated = false;
      });

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

// Export synchronous actions
export const { setAuthState, logout, clearError, updateUser } = authSlice.actions;

export default authSlice.reducer;
