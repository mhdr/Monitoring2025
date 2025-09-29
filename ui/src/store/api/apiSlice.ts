import { createApi, fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import type { LoginRequest, LoginResponse, ApiError, User } from '../../types/auth';
import type { 
  DashboardData, 
  Alarm, 
  AlarmLogEntry, 
  AuditTrailEntry, 
  PaginatedResponse,
  AlarmAcknowledgeRequest,
  AlarmToggleRequest 
} from '../../types/api';

// API configuration
const API_BASE_URL = 'https://localhost:7136';

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
  tagTypes: ['Auth', 'User', 'Alarm', 'Dashboard', 'AuditTrail'],
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

    // Get current user profile (if needed for protected routes)
    getCurrentUser: builder.query<User, void>({
      query: () => '/api/auth/profile',
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['User'],
    }),

    // Refresh token endpoint (if your API supports it)
    refreshToken: builder.mutation<{ accessToken: string }, void>({
      query: () => ({
        url: '/api/auth/refresh',
        method: 'POST',
      }),
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Update stored token
          const currentUser = authStorageHelpers.getStoredUser();
          if (currentUser) {
            const isRemembered = !!localStorage.getItem('auth_token');
            authStorageHelpers.setStoredAuth(data.accessToken, currentUser, isRemembered);
          }
        } catch {
          // Token refresh failed, clear auth
          authStorageHelpers.clearStoredAuth();
        }
      },
      invalidatesTags: ['Auth'],
    }),

    // Add more endpoints as needed for your application
    // Examples for common monitoring system endpoints:
    
    // Dashboard data
    getDashboardData: builder.query<DashboardData, void>({
      query: () => '/api/dashboard',
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['Dashboard'],
    }),

    // Active alarms
    getActiveAlarms: builder.query<Alarm[], void>({
      query: () => '/api/alarms/active',
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['Alarm'],
    }),

    // Alarm log
    getAlarmLog: builder.query<PaginatedResponse<AlarmLogEntry>, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 50 } = {}) => `/api/alarms/log?page=${page}&limit=${limit}`,
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['Alarm'],
    }),

    // Audit trail
    getAuditTrail: builder.query<PaginatedResponse<AuditTrailEntry>, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 50 } = {}) => `/api/audit?page=${page}&limit=${limit}`,
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      providesTags: ['AuditTrail'],
    }),

    // Acknowledge alarm
    acknowledgeAlarm: builder.mutation<void, { alarmId: string; note?: string }>({
      query: ({ alarmId, note }) => ({
        url: `/api/alarms/${alarmId}/acknowledge`,
        method: 'POST',
        body: { note } as AlarmAcknowledgeRequest,
      }),
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      invalidatesTags: ['Alarm'],
    }),

    // Disable/Enable alarm
    toggleAlarm: builder.mutation<void, { alarmId: string; enabled: boolean }>({
      query: ({ alarmId, enabled }) => ({
        url: `/api/alarms/${alarmId}/toggle`,
        method: 'PUT',
        body: { enabled } as AlarmToggleRequest,
      }),
      transformErrorResponse: (error: FetchBaseQueryError) => transformApiError(error),
      invalidatesTags: ['Alarm'],
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  useLoginMutation,
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
  useGetDashboardDataQuery,
  useGetActiveAlarmsQuery,
  useGetAlarmLogQuery,
  useGetAuditTrailQuery,
  useAcknowledgeAlarmMutation,
  useToggleAlarmMutation,
} = apiSlice;

// Export the reducer
export default apiSlice.reducer;