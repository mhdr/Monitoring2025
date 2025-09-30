import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { LoginRequest, LoginResponse, ApiError, User, RefreshTokenRequest } from '../../types/auth';
import type { GroupsRequestDto, GroupsResponseDto, ItemsRequestDto, ItemsResponseDto } from '../../types/api';

// API configuration - Use relative path for development with Vite proxy
// In production, this should be set to the actual API server URL
const API_BASE_URL = import.meta.env.PROD ? 'https://localhost:7136' : '';

// Custom base query with authentication handling
const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 10000,
  prepareHeaders: (headers) => {
    // Set content type
    headers.set('Content-Type', 'application/json');
    
    // Get token from localStorage or sessionStorage
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  },
});

// Enhanced base query with error handling and auto-logout
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    const { status } = result.error;
    
    if (status === 401) {
      // Determine if this is a login request
      const url = typeof args === 'string' ? args : args.url;
      const isLoginRequest = /\/api\/auth\/login/i.test(url);

      // Only handle logout for non-login 401s
      if (!isLoginRequest) {
        const hadToken = !!(localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token'));
        
        // Clear auth storage when token was present (expired/invalid)
        if (hadToken) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('auth_user');
        }
        
        // Redirect to login if not already there
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
  }

  return result;
};

// Helper function to transform API errors
const transformApiError = (error: FetchBaseQueryError): ApiError => {
  if ('status' in error) {
    if (error.status === 'FETCH_ERROR') {
      return {
        message: 'Network error - please check your connection',
        status: 0,
      };
    }
    
    if (error.status === 'TIMEOUT_ERROR') {
      return {
        message: 'Request timeout - please try again',
        status: 0,
      };
    }
    
    if (typeof error.status === 'number') {
      const errorData = error.data as { message?: string; errors?: Record<string, string[]> };
      return {
        message: errorData?.message || 'Server error occurred',
        status: error.status,
        errors: errorData?.errors,
      };
    }
  }
  
  return {
    message: 'An unexpected error occurred',
  };
};

// Helper functions for auth storage
export const authStorageHelpers = {
  getStoredToken: (): string | null => {
    return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  },

  getStoredUser: (): User | null => {
    const userData = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
  },

  setStoredAuth: (token: string, user: User, rememberMe: boolean = true): void => {
    if (rememberMe) {
      // Persistent storage - survives browser restart
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      // Clear any existing session storage
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
    } else {
      // Session storage - cleared when browser/tab is closed
      sessionStorage.setItem('auth_token', token);
      sessionStorage.setItem('auth_user', JSON.stringify(user));
      // Clear any existing persistent storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  },

  clearStoredAuth: (): void => {
    // Clear both localStorage and sessionStorage to ensure complete logout
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
  },

  getCurrentAuth: () => {
    return {
      token: authStorageHelpers.getStoredToken(),
      user: authStorageHelpers.getStoredUser(),
    };
  },
};

// Main API slice
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  // Define tag types for cache invalidation
  tagTypes: ['Auth', 'User', 'Groups', 'Items'],
  endpoints: (builder) => ({
    // Authentication endpoints
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: LoginResponse) => {
        // Check if login was successful
        if (!response.success) {
          throw new Error(response.errorMessage || 'Login failed');
        }
        return response;
      },
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      // Handle successful login - store auth data
      async onQueryStarted(credentials, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Store token and user data based on rememberMe preference
          authStorageHelpers.setStoredAuth(data.accessToken, data.user, credentials.rememberMe || false);
        } catch {
          // Error is already handled by transformErrorResponse
        }
      },
      invalidatesTags: ['Auth', 'User'],
    }),

    // Get current user profile
    getCurrentUser: builder.query<User, void>({
      query: () => '/api/Auth/me',
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['User'],
    }),

    // Refresh token endpoint
    refreshToken: builder.mutation<LoginResponse, RefreshTokenRequest>({
      query: (tokens) => ({
        url: '/api/Auth/refresh-token',
        method: 'POST',
        body: tokens,
      }),
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Update stored token
          const currentUser = authStorageHelpers.getStoredUser();
          if (currentUser && data.success) {
            const isRemembered = !!localStorage.getItem('auth_token');
            authStorageHelpers.setStoredAuth(data.accessToken, data.user, isRemembered);
          }
        } catch {
          // Token refresh failed, clear auth
          authStorageHelpers.clearStoredAuth();
        }
      },
      invalidatesTags: ['Auth'],
    }),

    // Get monitoring groups accessible to the current user
    getGroups: builder.query<GroupsResponseDto, GroupsRequestDto | void>({
      query: (params) => ({
        url: '/api/Monitoring/Groups',
        method: 'POST',
        body: params || {},
      }),
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['Groups'],
    }),

    // Get monitoring items accessible to the current user
    getItems: builder.query<ItemsResponseDto, ItemsRequestDto | void>({
      query: (params) => ({
        url: '/api/Monitoring/Items',
        method: 'POST',
        body: params || { showOrphans: false },
      }),
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['Items'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useLoginMutation,
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
  useGetGroupsQuery,
  useLazyGetGroupsQuery,
  useGetItemsQuery,
  useLazyGetItemsQuery,
} = apiSlice;

// Export the reducer
export default apiSlice.reducer;