import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginRequest, ApiError } from '../../types/auth';
import { authApi } from '../../services/api';
import { authStorageHelpers } from '../../utils/authStorage';

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

/**
 * Async thunk for user login
 * Handles API call and storage management
 */
export const loginAsync = createAsyncThunk<
  { user: User; accessToken: string },
  LoginRequest,
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'خطا در ورود به سیستم');
    }
  }
);

/**
 * Async thunk for token refresh
 */
export const refreshTokenAsync = createAsyncThunk<
  { accessToken: string; user: User },
  { accessToken: string; refreshToken: string },
  { rejectValue: string }
>(
  'auth/refreshToken',
  async (tokens, { rejectWithValue }) => {
    try {
      const response = await authApi.refreshToken(tokens);
      return response;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'خطا در بازیابی توکن');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Initialize auth state from storage
     * Called on app startup
     */
    initializeAuth: (state) => {
      const authState = authStorageHelpers.getCurrentAuth();
      state.user = authState.user;
      state.token = authState.token;
      state.isAuthenticated = Boolean(authState.token && authState.user);
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
          const isRemembered = Boolean(localStorage.getItem('auth_token'));
          authStorageHelpers.setStoredAuth(state.token, state.user, isRemembered);
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Login async thunk handlers
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'خطا در ورود به سیستم';
        state.isAuthenticated = false;
      });

    // Refresh token async thunk handlers
    builder
      .addCase(refreshTokenAsync.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(refreshTokenAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'خطا در بازیابی توکن';
        // Don't clear auth on refresh failure - let the user stay logged in
      });
  },
});

export const { initializeAuth, logout, clearError, updateUser } = authSlice.actions;
export default authSlice.reducer;
