import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { LoginRequest, LoginResponse, User, RefreshTokenRequest } from '../types/auth';
import type { 
  GroupsRequestDto, 
  GroupsResponseDto, 
  ItemsRequestDto, 
  ItemsResponseDto, 
  ValuesRequestDto, 
  ValuesResponseDto, 
  HistoryRequestDto, 
  HistoryResponseDto 
} from '../types/api';
import { authStorageHelpers } from '../utils/authStorage';

// API configuration - Use relative path for development with Vite proxy
// In production, this should be set to the actual API server URL
const API_BASE_URL = import.meta.env.PROD ? 'https://localhost:7136' : '';

/**
 * Custom base query with authentication and token refresh logic
 */
const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    timeout: 10000,
    prepareHeaders: (headers) => {
      const token = authStorageHelpers.getStoredToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        // Extend expiration on each API call (user activity)
        authStorageHelpers.extendAuthExpiration();
      }
      return headers;
    },
  });

  const result = await baseQuery(args, api, extraOptions);

  // Handle 401 errors - auto-logout except for login requests
  if (result.error && result.error.status === 401) {
    // Determine if this is a login request
    const url = typeof args === 'string' ? args : args.url;
    const isLoginRequest = /\/api\/auth\/login/i.test(url || '');

    // Only handle logout for non-login 401s
    if (!isLoginRequest) {
      const isExpired = authStorageHelpers.isAuthExpired();
      const hadToken = !!authStorageHelpers.getStoredToken();

      // Clear auth storage when token was present (expired/invalid)
      if (hadToken || isExpired) {
        authStorageHelpers.clearStoredAuth();
      }

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return result;
};

/**
 * RTK Query API definition
 * Defines all endpoints for authentication and monitoring
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithAuth,
  tagTypes: ['Auth', 'User', 'Groups', 'Items', 'Values', 'History'],
  endpoints: (builder) => ({
    // ==================== Authentication Endpoints ====================
    
    /**
     * Login with username and password
     */
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
      transformResponse: (response: LoginResponse, _meta, arg) => {
        // Check if login was successful
        if (response.success) {
          // Store token and user data based on rememberMe preference
          authStorageHelpers.setStoredAuth(
            response.accessToken,
            response.user,
            arg.rememberMe || false
          );
        }
        return response;
      },
      transformErrorResponse: (response: FetchBaseQueryError) => {
        if (response.status === 'FETCH_ERROR') {
          return {
            message: 'Network error - please check your connection',
            status: 0,
          };
        }
        if (response.status === 'TIMEOUT_ERROR') {
          return {
            message: 'Request timeout - please try again',
            status: 0,
          };
        }
        const data = response.data as { message?: string; errors?: Record<string, string[]> };
        return {
          message: data?.message || 'Login failed',
          status: typeof response.status === 'number' ? response.status : 500,
          errors: data?.errors,
        };
      },
      invalidatesTags: ['Auth', 'User'],
    }),

    /**
     * Get current user profile
     */
    getCurrentUser: builder.query<User, void>({
      query: () => '/api/Auth/me',
      providesTags: ['User'],
    }),

    /**
     * Refresh access token
     */
    refreshToken: builder.mutation<LoginResponse, RefreshTokenRequest>({
      query: (tokens) => ({
        url: '/api/Auth/refresh-token',
        method: 'POST',
        body: tokens,
      }),
      transformResponse: (response: LoginResponse) => {
        // Update stored token
        const currentUser = authStorageHelpers.getStoredUser();
        if (currentUser && response.success) {
          const isRemembered = !!localStorage.getItem('auth_token');
          authStorageHelpers.setStoredAuth(
            response.accessToken,
            response.user,
            isRemembered
          );
        }
        return response;
      },
      transformErrorResponse: () => {
        // Token refresh failed, clear auth
        authStorageHelpers.clearStoredAuth();
        return {
          message: 'Failed to refresh token',
          status: 401,
        };
      },
      invalidatesTags: ['Auth'],
    }),

    /**
     * Change user password
     */
    changePassword: builder.mutation<
      { isSuccessful: boolean },
      { currentPassword: string; newPassword: string }
    >({
      query: ({ currentPassword, newPassword }) => ({
        url: '/api/Auth/change-password',
        method: 'POST',
        body: { currentPassword, newPassword },
      }),
    }),

    // ==================== Monitoring Endpoints ====================

    /**
     * Get monitoring groups accessible to the current user
     * Implements caching via RTK Query's built-in cache
     */
    getGroups: builder.query<GroupsResponseDto, GroupsRequestDto | void>({
      query: (params = {}) => ({
        url: '/api/Monitoring/Groups',
        method: 'POST',
        body: params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.groups.map(({ id }) => ({ type: 'Groups' as const, id })),
              { type: 'Groups', id: 'LIST' },
            ]
          : [{ type: 'Groups', id: 'LIST' }],
      // Keep cached data for 5 minutes
      keepUnusedDataFor: 300,
    }),

    /**
     * Get monitoring items accessible to the current user
     * Implements caching via RTK Query's built-in cache
     */
    getItems: builder.query<ItemsResponseDto, ItemsRequestDto | void>({
      query: (params = { showOrphans: false }) => ({
        url: '/api/Monitoring/Items',
        method: 'POST',
        body: params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Items' as const, id })),
              { type: 'Items', id: 'LIST' },
            ]
          : [{ type: 'Items', id: 'LIST' }],
      // Keep cached data for 5 minutes
      keepUnusedDataFor: 300,
    }),

    /**
     * Get current values for monitoring items
     * No caching - always fetch fresh data
     * Note: Use pollingInterval option in components to enable auto-refresh
     */
    getValues: builder.query<ValuesResponseDto, ValuesRequestDto | void>({
      query: (params = { itemIds: null }) => ({
        url: '/api/Monitoring/Values',
        method: 'POST',
        body: params,
      }),
      providesTags: ['Values'],
      // Don't cache values - they should be fresh
      keepUnusedDataFor: 0,
    }),

    /**
     * Get historical data for a monitoring item within a date range
     * Implements caching based on query parameters
     */
    getHistory: builder.query<HistoryResponseDto, HistoryRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/History',
        method: 'POST',
        body: params,
      }),
      providesTags: (_result, _error, arg) => [
        { type: 'History', id: `${arg.itemId}-${arg.startDate}-${arg.endDate}` },
      ],
      // Keep cached historical data for 10 minutes
      keepUnusedDataFor: 600,
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // Auth hooks
  useLoginMutation,
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
  useChangePasswordMutation,
  
  // Monitoring hooks
  useGetGroupsQuery,
  useGetItemsQuery,
  useGetValuesQuery,
  useGetHistoryQuery,
  useLazyGetHistoryQuery,
} = api;

// Export API endpoints for manual usage if needed
export const { endpoints } = api;
