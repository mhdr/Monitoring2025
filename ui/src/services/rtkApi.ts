import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { 
  LoginRequest, 
  LoginResponse, 
  User, 
  RefreshTokenRequest,
  RegisterRequestDto,
  AuthResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
  DisableUserRequestDto,
  UpdateUserRequestDto,
  OperationResponseDto,
  UserInfoDto
} from '../types/auth';
import type { 
  GroupsRequestDto, 
  GroupsResponseDto, 
  ItemsRequestDto, 
  ItemsResponseDto, 
  ValuesRequestDto, 
  ValuesResponseDto, 
  HistoryRequestDto, 
  HistoryResponseDto,
  // Item Management
  AddPointAsAdminRequestDto,
  EditPointRequestDto,
  EditPointAsAdminRequestDto,
  EditPointResponseDto,
  DeletePointRequestDto,
  MovePointRequestDto,
  // Alarm Management
  AlarmsRequestDto,
  AlarmsResponseDto,
  AddAlarmRequestDto,
  EditAlarmRequestDto,
  EditAlarmResponseDto,
  DeleteAlarmRequestDto,
  GetExternalAlarmsRequestDto,
  BatchEditExternalAlarmsRequestDto,
  ActiveAlarmsRequestDto,
  ActiveAlarmsResponseDto,
  AlarmHistoryRequestDto,
  AlarmHistoryResponseDto,
  // User Management
  GetUsersResponseDto,
  AddUserRequestDto,
  AddUserResponseDto,
  EditUserRequestDto,
  EditUserResponseDto,
  GetUserRequestDto,
  GetUserResponseDto,
  GetRolesResponseDto,
  SetRolesRequestDto,
  SetRolesResponseDto,
  SavePermissionsRequestDto,
  SavePermissionsResponseDto,
  // Group Management
  AddGroupRequestDto,
  AddGroupResponseDto,
  EditGroupRequestDto,
  DeleteGroupRequestDto,
  MoveGroupRequestDto,
  // Controller Management
  GetControllersResponseDto,
  AddControllerRequestDto,
  AddControllerResponseDto,
  EditControllerRequestDto,
  DeleteControllerRequestDto,
  GetControllerMappingsRequestDto,
  BatchEditMappingsRequestDto,
  // Job/Scheduler
  GetJobTriggersRequestDto,
  GetJobDetailsRequestDto,
  SaveJobRequestDto,
  DeleteJobRequestDto,
  // PID Controller
  GetPidControllersRequestDto,
  EditPidControllerRequestDto,
  EditPidSetPointRequestDto,
  GetPidControllerRequestDto,
  // Value Operations
  ValueRequestDto,
  ValueResponseDto,
  WriteValueRequestDto,
  AddValueRequestDto,
  WriteOrAddValueRequestDto,
  // SVG Layout
  GetSvgLayoutRequestDto,
  GetSvgLayoutsRequestDto,
  // Audit and System
  AuditLogRequestDto,
  AuditLogResponseDto,
  SettingsVersionResponseDto
} from '../types/api';
import { authStorageHelpers } from '../utils/authStorage';
import { broadcastTokenRefresh } from '../utils/authBroadcast';
import { storeMonitoringResponseData } from '../utils/monitoringStorage';
import { Mutex } from 'async-mutex';

// API configuration - Use relative path for development with Vite proxy
// In production, this should be set to the actual API server URL
const API_BASE_URL = import.meta.env.PROD ? 'https://localhost:7136' : '';

// Mutex to prevent multiple concurrent refresh token requests
const refreshMutex = new Mutex();

/**
 * Base query configuration
 */
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

/**
 * Custom base query with automatic token refresh on 401 errors
 * Implements refresh token rotation with mutex to prevent concurrent refresh requests
 */
const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Wait until any ongoing refresh is complete
  await refreshMutex.waitForUnlock();
  
  // Execute the initial query
  let result = await baseQuery(args, api, extraOptions);

  // Handle 401 Unauthorized errors
  if (result.error && result.error.status === 401) {
    // Determine if this is a login or refresh request
    const url = typeof args === 'string' ? args : args.url;
    const isLoginRequest = /\/api\/auth\/login/i.test(url || '');
    const isRefreshRequest = /\/api\/auth\/refresh-token/i.test(url || '');

    // Only attempt refresh for non-login/non-refresh 401s
    if (!isLoginRequest && !isRefreshRequest) {
      // Check if another request is already refreshing
      if (!refreshMutex.isLocked()) {
        const release = await refreshMutex.acquire();
        
        try {
          // Get current auth state
          const currentToken = authStorageHelpers.getStoredToken();
          const currentRefreshToken = authStorageHelpers.getStoredRefreshToken();
          const currentUser = authStorageHelpers.getStoredUser();

          // Only attempt refresh if we have both tokens
          if (currentToken && currentRefreshToken && currentUser) {
            // Attempt to refresh the token
            const refreshResult = await baseQuery(
              {
                url: '/api/Auth/refresh-token',
                method: 'POST',
                body: {
                  accessToken: currentToken,
                  refreshToken: currentRefreshToken,
                },
              },
              api,
              extraOptions
            );

            if (refreshResult.data) {
              // Token refresh successful - extract new tokens
              const refreshData = refreshResult.data as LoginResponse;
              
              if (refreshData.success && refreshData.accessToken) {
                // Determine if remember me is active
                const isRemembered = !!localStorage.getItem('auth_token');
                
                // Store new tokens (rotation: old refresh token is now invalid)
                authStorageHelpers.setStoredAuth(
                  refreshData.accessToken,
                  refreshData.user,
                  isRemembered,
                  refreshData.refreshToken
                );

                // Broadcast token refresh to all other tabs
                if (refreshData.refreshToken) {
                  broadcastTokenRefresh(refreshData.accessToken, refreshData.refreshToken);
                }

                // Retry the original request with new token
                result = await baseQuery(args, api, extraOptions);
              } else {
                // Refresh returned unsuccessful response
                authStorageHelpers.clearStoredAuth();
              }
            } else {
              // Refresh failed - clear auth and redirect
              authStorageHelpers.clearStoredAuth();
            }
          } else {
            // Missing tokens - clear auth
            authStorageHelpers.clearStoredAuth();
          }
        } finally {
          // Always release the mutex
          release();
        }
      } else {
        // Another request is refreshing - wait for it to complete
        await refreshMutex.waitForUnlock();
        // Retry the original request with potentially new token
        result = await baseQuery(args, api, extraOptions);
      }

      // If we still have a 401 after refresh attempt, redirect to login
      if (result.error && result.error.status === 401) {
        authStorageHelpers.clearStoredAuth();
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
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
          // Store tokens and user data based on rememberMe preference
          // This includes the refresh token for token rotation
          authStorageHelpers.setStoredAuth(
            response.accessToken,
            response.user,
            arg.rememberMe || false,
            response.refreshToken
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
     * Note: This endpoint is primarily used by the automatic refresh interceptor
     * Manual calls should be rare as the baseQueryWithAuth handles refresh automatically
     */
    refreshToken: builder.mutation<LoginResponse, RefreshTokenRequest>({
      query: (tokens) => ({
        url: '/api/Auth/refresh-token',
        method: 'POST',
        body: tokens,
      }),
      transformResponse: (response: LoginResponse) => {
        // Update stored tokens with rotation
        const currentUser = authStorageHelpers.getStoredUser();
        if (currentUser && response.success) {
          const isRemembered = !!localStorage.getItem('auth_token');
          // Store new access token AND new refresh token (rotation)
          authStorageHelpers.setStoredAuth(
            response.accessToken,
            response.user,
            isRemembered,
            response.refreshToken
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
    changePassword: builder.mutation<ChangePasswordResponseDto, ChangePasswordRequestDto>({
      query: (data) => ({
        url: '/api/Auth/change-password',
        method: 'POST',
        body: data,
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
      transformResponse: (response: GroupsResponseDto) => {
        // Store groups data in sessionStorage when fetched
        return storeMonitoringResponseData.storeGroupsResponse(response);
      },
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
      transformResponse: (response: ItemsResponseDto) => {
        // Store items data in sessionStorage when fetched
        return storeMonitoringResponseData.storeItemsResponse(response);
      },
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

    // ==================== Extended Auth Endpoints ====================

    /**
     * Register a new user
     */
    register: builder.mutation<AuthResponseDto, RegisterRequestDto>({
      query: (data) => ({
        url: '/api/Auth/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Auth'],
    }),

    /**
     * Reset user password to default (admin only)
     */
    resetPassword: builder.mutation<ResetPasswordResponseDto, ResetPasswordRequestDto>({
      query: (data) => ({
        url: '/api/Auth/reset-password',
        method: 'POST',
        body: data,
      }),
    }),

    /**
     * Disable or enable a user account (admin only)
     */
    disableUser: builder.mutation<OperationResponseDto, DisableUserRequestDto>({
      query: (data) => ({
        url: '/api/Auth/disable-user',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Update user information
     */
    updateUser: builder.mutation<UserInfoDto, { userId: string; data: UpdateUserRequestDto }>({
      query: ({ userId, data }) => ({
        url: `/api/Auth/update-user/${userId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // ==================== Monitoring Item Management Endpoints ====================

    /**
     * Get monitoring items as admin (bypasses user permissions)
     */
    getItemsAsAdmin: builder.query<ItemsResponseDto, ItemsRequestDto | void>({
      query: (params = { showOrphans: false }) => ({
        url: '/api/Monitoring/ItemsAsAdmin',
        method: 'POST',
        body: params,
      }),
      providesTags: ['Items'],
      keepUnusedDataFor: 300,
    }),

    /**
     * Add a new monitoring point (admin only)
     */
    addPointAsAdmin: builder.mutation<EditPointResponseDto, AddPointAsAdminRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/AddPointAsAdmin',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Edit a monitoring point's basic metadata
     */
    editPoint: builder.mutation<EditPointResponseDto, EditPointRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditPoint',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Edit a monitoring point's full configuration (admin only)
     */
    editPointAsAdmin: builder.mutation<EditPointResponseDto, EditPointAsAdminRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditPointAsAdmin',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Delete a monitoring point
     */
    deletePoint: builder.mutation<EditPointResponseDto, DeletePointRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/DeletePoint',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Move a monitoring point to a different group
     */
    movePoint: builder.mutation<EditPointResponseDto, MovePointRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/MovePoint',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Get current value for a single monitoring item
     */
    getValue: builder.query<ValueResponseDto, ValueRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/Value',
        method: 'POST',
        body: params,
      }),
      providesTags: ['Values'],
      keepUnusedDataFor: 0,
    }),

    // ==================== Alarm Management Endpoints ====================

    /**
     * Get configured alarms for specified monitoring items
     */
    getAlarms: builder.query<AlarmsResponseDto, AlarmsRequestDto | void>({
      query: (params = { itemIds: null }) => ({
        url: '/api/Monitoring/Alarms',
        method: 'POST',
        body: params,
      }),
      transformResponse: (response: AlarmsResponseDto) => {
        // Store alarms data in sessionStorage when fetched
        return storeMonitoringResponseData.storeAlarmsResponse(response);
      },
      providesTags: ['Items'],
      keepUnusedDataFor: 300,
    }),

    /**
     * Get currently active alarms
     */
    getActiveAlarms: builder.query<ActiveAlarmsResponseDto, ActiveAlarmsRequestDto | void>({
      query: (params = { itemIds: null }) => ({
        url: '/api/Monitoring/ActiveAlarms',
        method: 'POST',
        body: params,
      }),
      providesTags: ['Values'],
      keepUnusedDataFor: 0,
    }),

    /**
     * Get historical alarm data
     */
    getAlarmHistory: builder.query<AlarmHistoryResponseDto, AlarmHistoryRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/HistoryAlarms',
        method: 'POST',
        body: params,
      }),
      providesTags: ['History'],
      keepUnusedDataFor: 600,
    }),

    /**
     * Add a new alarm configuration
     */
    addAlarm: builder.mutation<EditPointResponseDto, AddAlarmRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/AddAlarm',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Edit an existing alarm configuration
     */
    editAlarm: builder.mutation<EditAlarmResponseDto, EditAlarmRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditAlarm',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Delete an alarm configuration
     */
    deleteAlarm: builder.mutation<EditPointResponseDto, DeleteAlarmRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/DeleteAlarm',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Get external alarms for a specific alarm
     */
    getExternalAlarms: builder.query<{ data: unknown[] }, GetExternalAlarmsRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/GetExternalAlarms',
        method: 'POST',
        body: params,
      }),
      providesTags: ['Items'],
    }),

    /**
     * Batch edit external alarms
     */
    batchEditExternalAlarms: builder.mutation<EditPointResponseDto, BatchEditExternalAlarmsRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/BatchEditExternalAlarms',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    // ==================== User Management Endpoints ====================

    /**
     * Get all system users
     */
    getUsers: builder.query<GetUsersResponseDto, void>({
      query: () => ({
        url: '/api/Monitoring/GetUsers',
        method: 'GET',
      }),
      providesTags: ['User'],
      keepUnusedDataFor: 300,
    }),

    /**
     * Add a new user to the system
     */
    addUser: builder.mutation<AddUserResponseDto, AddUserRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/AddUser',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Edit an existing user's account information
     */
    editUser: builder.mutation<EditUserResponseDto, EditUserRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditUser',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Get detailed information for a specific user
     */
    getUser: builder.query<GetUserResponseDto, GetUserRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/GetUser',
        method: 'POST',
        body: params,
      }),
      providesTags: ['User'],
    }),

    /**
     * Get all available system roles
     */
    getRoles: builder.query<GetRolesResponseDto, void>({
      query: () => ({
        url: '/api/Monitoring/GetRoles',
        method: 'GET',
      }),
      keepUnusedDataFor: 600,
    }),

    /**
     * Assign roles to a specific user
     */
    setRoles: builder.mutation<SetRolesResponseDto, SetRolesRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/SetRoles',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    /**
     * Save user permissions for accessing groups and items
     */
    savePermissions: builder.mutation<SavePermissionsResponseDto, SavePermissionsRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/SavePermissions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['User', 'Groups', 'Items'],
    }),

    // ==================== Group Management Endpoints ====================

    /**
     * Add a new monitoring group
     */
    addGroup: builder.mutation<AddGroupResponseDto, AddGroupRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/AddGroup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Groups'],
    }),

    /**
     * Edit an existing monitoring group
     */
    editGroup: builder.mutation<EditPointResponseDto, EditGroupRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditGroup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Groups'],
    }),

    /**
     * Delete a monitoring group
     */
    deleteGroup: builder.mutation<EditPointResponseDto, DeleteGroupRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/DeleteGroup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Groups'],
    }),

    /**
     * Move a group to a different parent
     */
    moveGroup: builder.mutation<EditPointResponseDto, MoveGroupRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/MoveGroup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Groups'],
    }),

    // ==================== Controller Management Endpoints ====================

    /**
     * Get all configured controllers
     */
    getControllers: builder.query<GetControllersResponseDto, void>({
      query: () => ({
        url: '/api/Monitoring/Controllers',
        method: 'POST',
      }),
      keepUnusedDataFor: 300,
    }),

    /**
     * Add a new controller
     */
    addController: builder.mutation<AddControllerResponseDto, AddControllerRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/AddController',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Edit an existing controller
     */
    editController: builder.mutation<EditPointResponseDto, EditControllerRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditController',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Delete a controller
     */
    deleteController: builder.mutation<EditPointResponseDto, DeleteControllerRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/DeleteController',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Get controller mappings
     */
    getControllerMappings: builder.query<{ data: unknown[] }, GetControllerMappingsRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/GetMappings',
        method: 'POST',
        body: params,
      }),
      keepUnusedDataFor: 300,
    }),

    /**
     * Batch edit controller mappings
     */
    batchEditMappings: builder.mutation<EditPointResponseDto, BatchEditMappingsRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/BatchEditMappings',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    // ==================== Job/Scheduler Endpoints ====================

    /**
     * Get all scheduled job triggers
     */
    getJobTriggers: builder.query<{ data: unknown[] }, GetJobTriggersRequestDto | void>({
      query: (params = {}) => ({
        url: '/api/Monitoring/GetJobTriggers',
        method: 'POST',
        body: params,
      }),
      keepUnusedDataFor: 300,
    }),

    /**
     * Get job details for a specific trigger
     */
    getJobDetails: builder.query<{ data: unknown[] }, GetJobDetailsRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/GetJobDetails',
        method: 'POST',
        body: params,
      }),
    }),

    /**
     * Save or update a scheduled job
     */
    saveJob: builder.mutation<EditPointResponseDto, SaveJobRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/SaveJob',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Delete a scheduled job
     */
    deleteJob: builder.mutation<EditPointResponseDto, DeleteJobRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/DeleteJob',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    // ==================== PID Controller Endpoints ====================

    /**
     * Get all PID controllers
     */
    getPidControllers: builder.query<{ data: unknown[] }, GetPidControllersRequestDto | void>({
      query: (params = {}) => ({
        url: '/api/Monitoring/GetPidControllers',
        method: 'POST',
        body: params,
      }),
      keepUnusedDataFor: 300,
    }),

    /**
     * Edit a PID controller configuration
     */
    editPidController: builder.mutation<EditPointResponseDto, EditPidControllerRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditPidController',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Items'],
    }),

    /**
     * Edit PID controller set point
     */
    editPidSetPoint: builder.mutation<EditPointResponseDto, EditPidSetPointRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/EditPidSetPoint',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Values'],
    }),

    /**
     * Get a specific PID controller
     */
    getPidController: builder.query<{ data: unknown }, GetPidControllerRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/GetPidController',
        method: 'POST',
        body: params,
      }),
    }),

    // ==================== Value Operations Endpoints ====================

    /**
     * Write a value directly to a controller
     */
    writeValue: builder.mutation<EditPointResponseDto, WriteValueRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/WriteValue',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Values'],
    }),

    /**
     * Add a new value to the system
     */
    addValue: builder.mutation<EditPointResponseDto, AddValueRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/AddValue',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Values'],
    }),

    /**
     * Write a value to controller or add it if write fails
     */
    writeOrAddValue: builder.mutation<EditPointResponseDto, WriteOrAddValueRequestDto>({
      query: (data) => ({
        url: '/api/Monitoring/WriteOrAddValue',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Values'],
    }),

    // ==================== SVG Layout Endpoints ====================

    /**
     * Get a specific SVG layout
     */
    getSvgLayout: builder.query<{ data: unknown }, GetSvgLayoutRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/GetSvgLayout',
        method: 'POST',
        body: params,
      }),
      keepUnusedDataFor: 600,
    }),

    /**
     * Get all enabled SVG layouts
     */
    getSvgLayouts: builder.query<{ data: unknown[] }, GetSvgLayoutsRequestDto | void>({
      query: (params = {}) => ({
        url: '/api/Monitoring/GetSvgLayouts',
        method: 'POST',
        body: params,
      }),
      keepUnusedDataFor: 600,
    }),

    // ==================== Audit and System Endpoints ====================

    /**
     * Get audit log entries
     */
    getAuditLog: builder.query<AuditLogResponseDto, AuditLogRequestDto>({
      query: (params) => ({
        url: '/api/Monitoring/AuditLog',
        method: 'POST',
        body: params,
      }),
      keepUnusedDataFor: 600,
    }),

    /**
     * Get system settings version
     */
    getSettingsVersion: builder.query<SettingsVersionResponseDto, void>({
      query: () => ({
        url: '/api/Monitoring/SettingsVersion',
        method: 'GET',
      }),
      keepUnusedDataFor: 60,
    }),

    /**
     * Push update notification to all clients
     */
    pushUpdateAllClients: builder.mutation<EditPointResponseDto, void>({
      query: () => ({
        url: '/api/Monitoring/PushUpdateAllClients',
        method: 'GET',
      }),
    }),
  }),
});

// Export hooks for usage in functional components
export const {
  // ==================== Auth hooks ====================
  useLoginMutation,
  useGetCurrentUserQuery,
  useRefreshTokenMutation,
  useChangePasswordMutation,
  useRegisterMutation,
  useResetPasswordMutation,
  useDisableUserMutation,
  useUpdateUserMutation,
  
  // ==================== Monitoring hooks ====================
  useGetGroupsQuery,
  useGetItemsQuery,
  useGetItemsAsAdminQuery,
  useGetValuesQuery,
  useGetValueQuery,
  useGetHistoryQuery,
  useLazyGetHistoryQuery,
  
  // ==================== Item Management hooks ====================
  useAddPointAsAdminMutation,
  useEditPointMutation,
  useEditPointAsAdminMutation,
  useDeletePointMutation,
  useMovePointMutation,
  
  // ==================== Alarm Management hooks ====================
  useGetAlarmsQuery,
  useGetActiveAlarmsQuery,
  useGetAlarmHistoryQuery,
  useAddAlarmMutation,
  useEditAlarmMutation,
  useDeleteAlarmMutation,
  useGetExternalAlarmsQuery,
  useBatchEditExternalAlarmsMutation,
  
  // ==================== User Management hooks ====================
  useGetUsersQuery,
  useAddUserMutation,
  useEditUserMutation,
  useGetUserQuery,
  useGetRolesQuery,
  useSetRolesMutation,
  useSavePermissionsMutation,
  
  // ==================== Group Management hooks ====================
  useAddGroupMutation,
  useEditGroupMutation,
  useDeleteGroupMutation,
  useMoveGroupMutation,
  
  // ==================== Controller Management hooks ====================
  useGetControllersQuery,
  useAddControllerMutation,
  useEditControllerMutation,
  useDeleteControllerMutation,
  useGetControllerMappingsQuery,
  useBatchEditMappingsMutation,
  
  // ==================== Job/Scheduler hooks ====================
  useGetJobTriggersQuery,
  useGetJobDetailsQuery,
  useSaveJobMutation,
  useDeleteJobMutation,
  
  // ==================== PID Controller hooks ====================
  useGetPidControllersQuery,
  useEditPidControllerMutation,
  useEditPidSetPointMutation,
  useGetPidControllerQuery,
  
  // ==================== Value Operations hooks ====================
  useWriteValueMutation,
  useAddValueMutation,
  useWriteOrAddValueMutation,
  
  // ==================== SVG Layout hooks ====================
  useGetSvgLayoutQuery,
  useGetSvgLayoutsQuery,
  
  // ==================== Audit and System hooks ====================
  useGetAuditLogQuery,
  useGetSettingsVersionQuery,
  usePushUpdateAllClientsMutation,
} = api;

// Export API endpoints for manual usage if needed
export const { endpoints } = api;
