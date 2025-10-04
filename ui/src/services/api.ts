import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { LoginRequest, LoginResponse, ApiError, User, RefreshTokenRequest } from '../types/auth';
import type { GroupsRequestDto, GroupsResponseDto, ItemsRequestDto, ItemsResponseDto, ValuesRequestDto, ValuesResponseDto, HistoryRequestDto, HistoryResponseDto } from '../types/api';
import { authStorageHelpers } from '../utils/authStorage';

// API configuration - Use relative path for development with Vite proxy
// In production, this should be set to the actual API server URL
const API_BASE_URL = import.meta.env.PROD ? 'https://localhost:7136' : '';

// Create axios instance with default configuration
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and extend expiration on activity
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorageHelpers.getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Extend expiration on each API call (user activity)
      authStorageHelpers.extendAuthExpiration();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and auto-logout
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Determine if this is a login request
      const isLoginRequest = /\/api\/auth\/login/i.test(error.config?.url || '');

      // Only handle logout for non-login 401s
      if (!isLoginRequest) {
        // Check if token is expired (client-side check)
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
    
    return Promise.reject(error);
  }
);

// Helper function to transform axios errors to ApiError
const transformApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data as { message?: string; errors?: Record<string, string[]> };
      return {
        message: errorData?.message || 'Server error occurred',
        status: error.response.status,
        errors: errorData?.errors,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'Network error - please check your connection',
        status: 0,
      };
    } else if (error.code === 'ECONNABORTED') {
      // Request timeout
      return {
        message: 'Request timeout - please try again',
        status: 0,
      };
    }
  }
  
  // Something else happened
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  return {
    message: errorMessage,
  };
};

// Authentication API
export const authApi = {
  /**
   * Login with username and password
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await axiosInstance.post<LoginResponse>('/api/auth/login', credentials);
      const data = response.data;
      
      // Check if login was successful
      if (!data.success) {
        throw new Error(data.errorMessage || 'Login failed');
      }
      
      // Store token and user data based on rememberMe preference
      authStorageHelpers.setStoredAuth(data.accessToken, data.user, credentials.rememberMe || false);
      
      return data;
    } catch (error: unknown) {
      throw transformApiError(error);
    }
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await axiosInstance.get<User>('/api/Auth/me');
      return response.data;
    } catch (error: unknown) {
      throw transformApiError(error);
    }
  },

  /**
   * Refresh access token
   */
  refreshToken: async (tokens: RefreshTokenRequest): Promise<LoginResponse> => {
    try {
      const response = await axiosInstance.post<LoginResponse>('/api/Auth/refresh-token', tokens);
      const data = response.data;
      
      // Update stored token
      const currentUser = authStorageHelpers.getStoredUser();
      if (currentUser && data.success) {
        const isRemembered = !!localStorage.getItem('auth_token');
        authStorageHelpers.setStoredAuth(data.accessToken, data.user, isRemembered);
      }
      
      return data;
    } catch (error: unknown) {
      // Token refresh failed, clear auth
      authStorageHelpers.clearStoredAuth();
      throw transformApiError(error);
    }
  },
};

// Monitoring API
export const monitoringApi = {
  /**
   * Get monitoring groups accessible to the current user
   */
  getGroups: async (params?: GroupsRequestDto): Promise<GroupsResponseDto> => {
    const cacheKey = (() => {
      try {
        const normalized = params ? params : {};
        // Use a stable key based on JSON stringified params
        return `monitoring_groups:${encodeURIComponent(JSON.stringify(normalized))}`;
      } catch {
        return 'monitoring_groups:default';
      }
    })();

    // Try to read from sessionStorage first
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const cached = window.sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as GroupsResponseDto;
          } catch {
            // If parse fails, ignore cache and continue to fetch
          }
        }
      }
    } catch {
      // If any storage access throws (privacy mode, quota), ignore and fetch
    }

    // Fetch from API and store in sessionStorage
    try {
      const response = await axiosInstance.post<GroupsResponseDto>('/api/Monitoring/Groups', params || {});
      const data = response.data;

      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {
            // ignore storage set errors
          }
        }
      } catch {
        // ignore storage errors
      }

      return data;
    } catch (error: unknown) {
      throw transformApiError(error);
    }
  },
  /**
   * Get monitoring items accessible to the current user
   */
  getItems: async (params?: ItemsRequestDto): Promise<ItemsResponseDto> => {
    const cacheKey = (() => {
      try {
        const normalized = params ? params : { showOrphans: false };
        return `monitoring_items:${encodeURIComponent(JSON.stringify(normalized))}`;
      } catch {
        return 'monitoring_items:default';
      }
    })();

    // Try to read from sessionStorage first
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const cached = window.sessionStorage.getItem(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached) as ItemsResponseDto;
          } catch {
            // If parse fails, ignore cache and continue to fetch
          }
        }
      }
    } catch {
      // ignore storage read errors
    }

    // Fetch from API and store in sessionStorage
    try {
      const response = await axiosInstance.post<ItemsResponseDto>('/api/Monitoring/Items', params || { showOrphans: false });
      const data = response.data;

      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          try {
            window.sessionStorage.setItem(cacheKey, JSON.stringify(data));
          } catch {
            // ignore storage set errors
          }
        }
      } catch {
        // ignore storage errors
      }

      return data;
    } catch (error: unknown) {
      throw transformApiError(error);
    }
  },
  
  /**
   * Get current values for monitoring items
   * @param params - Optional parameters including itemIds to filter specific items
   * @returns ValuesResponseDto containing current values for monitoring items
   */
  getValues: async (params?: ValuesRequestDto): Promise<ValuesResponseDto> => {
    try {
      const response = await axiosInstance.post<ValuesResponseDto>(
        '/api/Monitoring/Values', 
        params || { itemIds: null }
      );
      return response.data;
    } catch (error: unknown) {
      throw transformApiError(error);
    }
  },

  /**
   * Get historical data for a monitoring item within a date range
   * @param params - History request containing itemId, startDate (Unix timestamp), and endDate (Unix timestamp)
   * @returns HistoryResponseDto containing array of historical data points with values and timestamps
   */
  getHistory: async (params: HistoryRequestDto): Promise<HistoryResponseDto> => {
    try {
      const response = await axiosInstance.post<HistoryResponseDto>(
        '/api/Monitoring/History',
        params
      );
      return response.data;
    } catch (error: unknown) {
      throw transformApiError(error);
    }
  }
};

// Export axios instance for custom requests if needed
export default axiosInstance;
