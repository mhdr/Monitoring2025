import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { authStorageHelpers } from '../utils/authStorage';
import { broadcastTokenRefresh } from '../utils/authBroadcast';
import { Mutex } from 'async-mutex';
import { createLogger } from '../utils/logger';
import { apiConfig } from '../config/apiConfig';

const logger = createLogger('ApiClient');

// Mutex to prevent multiple concurrent refresh token requests
const refreshMutex = new Mutex();

/**
 * Axios instance with authentication interceptors
 * Uses dynamic API URL detection from apiConfig
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: apiConfig.baseUrl,
  timeout: apiConfig.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add JWT token to headers
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Use sync version to get token from in-memory cache
    const token = authStorageHelpers.getStoredTokenSync();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Extend expiration on each API call (user activity) - fire and forget
      authStorageHelpers.extendAuthExpiration().catch((error) => {
        logger.error('Failed to extend auth expiration:', error);
      });
    }
    return config;
  },
  (error) => {
    logger.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle 401 errors and automatic token refresh
 * Implements refresh token rotation with mutex to prevent concurrent refresh requests
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Determine if this is a login or refresh request
      const isLoginRequest = /\/api\/auth\/login/i.test(originalRequest.url || '');
      const isRefreshRequest = /\/api\/auth\/refresh-token/i.test(originalRequest.url || '');

      // Only attempt refresh for non-login/non-refresh 401s
      if (!isLoginRequest && !isRefreshRequest) {
        // Mark this request as retried to avoid infinite loops
        originalRequest._retry = true;

        // Wait for any ongoing refresh to complete
        if (refreshMutex.isLocked()) {
          await refreshMutex.waitForUnlock();
          // Retry the original request with potentially new token
          return apiClient(originalRequest);
        }

        // Acquire mutex to prevent concurrent refreshes
        const release = await refreshMutex.acquire();

        try {
          // Get current auth state from Zustand store
          const currentToken = await authStorageHelpers.getStoredToken();
          const currentRefreshToken = await authStorageHelpers.getStoredRefreshToken();
          const currentUser = await authStorageHelpers.getStoredUser();

          // Only attempt refresh if we have both tokens
          if (currentToken && currentRefreshToken && currentUser) {
            logger.log('Attempting to refresh token...');

            try {
              // Attempt to refresh the token
              const refreshResponse = await axios.post(
                `${apiConfig.baseUrl}/api/Auth/refresh-token`,
                {
                  accessToken: currentToken,
                  refreshToken: currentRefreshToken,
                },
                {
                  headers: { 'Content-Type': 'application/json' },
                  timeout: apiConfig.timeout,
                }
              );

              if (refreshResponse.data?.success && refreshResponse.data?.accessToken) {
                const { accessToken, refreshToken: newRefreshToken, user } = refreshResponse.data;

                // Store new tokens (rotation: old refresh token is now invalid)
                await authStorageHelpers.setStoredAuth(
                  accessToken,
                  user || currentUser,
                  newRefreshToken
                );

                // Broadcast token refresh to all other tabs
                if (newRefreshToken) {
                  broadcastTokenRefresh(accessToken, newRefreshToken);
                }

                logger.log('Token refreshed successfully');

                // Retry the original request with new token
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                return apiClient(originalRequest);
              } else {
                // Refresh returned unsuccessful response - clear auth
                logger.warn('Token refresh failed - unsuccessful response');
                await authStorageHelpers.clearStoredAuth();
              }
            } catch (refreshError) {
              // Refresh request failed - clear auth
              logger.error('Token refresh request failed:', refreshError);
              await authStorageHelpers.clearStoredAuth();
            }
          } else {
            // Missing tokens - clear auth
            logger.warn('Missing tokens for refresh');
            await authStorageHelpers.clearStoredAuth();
          }
        } finally {
          // Always release the mutex
          release();
        }

        // If we still have a 401 after refresh attempt, redirect to login
        if (window.location.pathname !== '/login') {
          logger.warn('Redirecting to login after failed refresh');
          window.location.href = '/login';
        }
      }
    }

    // For all other errors or if refresh failed, reject with the error
    return Promise.reject(error);
  }
);

/**
 * Generic error handler for API responses
 * @throws Always throws - never returns
 */
export function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
    
    // Check if request was cancelled (by axios or browser)
    if (axios.isCancel(error) || axiosError.code === 'ERR_CANCELED') {
      const cancelError = new Error('Request was cancelled') as Error & { cancelled: boolean };
      cancelError.cancelled = true;
      throw cancelError;
    }
    
    if (axiosError.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please try again');
    }
    
    if (axiosError.code === 'ERR_NETWORK') {
      throw new Error('Network error - please check your connection');
    }
    
    const data = axiosError.response?.data;
    const message = data?.message || axiosError.message || 'An error occurred';
    const status = axiosError.response?.status || 0;
    
    const apiError = new Error(message) as Error & { status: number; errors?: Record<string, string[]> };
    apiError.status = status;
    apiError.errors = data?.errors;
    
    throw apiError;
  }
  
  throw error;
}

export default apiClient;
