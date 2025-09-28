import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginRequest, ApiError } from '../../types/auth';
import { apiClient } from '../../utils/apiClient';

// Define the initial state interface
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Define the initial state
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Async thunk for login
export const loginAsync = createAsyncThunk<
  { user: User; token: string },
  LoginRequest,
  { rejectValue: string }
>(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await apiClient.login(credentials);
      return { user: response.user, token: response.accessToken };
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.message || 'Login failed');
    }
  }
);

// Async thunk for logout
export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async () => {
    apiClient.logout();
  }
);

// Async thunk to initialize auth from stored state
export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async () => {
    const authState = apiClient.getCurrentAuth();
    if (authState.token && authState.user) {
      return { user: authState.user, token: authState.token };
    }
    return null;
  }
);

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Synchronous action to clear error
    clearError: (state) => {
      state.error = null;
    },
    // Synchronous action to reset auth state
    resetAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login cases
    builder
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action: PayloadAction<{ user: User; token: string }>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload || 'Login failed';
      })
      // Logout cases
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.isLoading = false;
        state.error = null;
      })
      // Initialize auth cases
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.isAuthenticated = true;
        }
      })
      .addCase(initializeAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

// Export actions
export const { clearError, resetAuth } = authSlice.actions;

// Export the reducer
export default authSlice.reducer;