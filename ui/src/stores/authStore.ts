/**
 * Authentication Store
 * 
 * Zustand store for managing authentication state with localStorage persistence.
 * Stores JWT tokens, refresh tokens, user data, and expiration timestamps.
 * Provides synchronous access for API interceptors (critical requirement).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthStore');

const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Authentication store state
 */
interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  expiration: number | null;
}

/**
 * Authentication store actions
 */
interface AuthActions {
  setAuth: (token: string, user: User, refreshToken?: string) => void;
  clearAuth: () => void;
  extendExpiration: () => void;
  isExpired: () => boolean;
  getTokenSync: () => string | null;
}

/**
 * Initial state
 */
const initialState: AuthState = {
  token: null,
  refreshToken: null,
  user: null,
  expiration: null,
};

/**
 * Zustand store for authentication with localStorage persistence
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      /**
       * Set authentication data (token, user, optional refresh token)
       * Automatically sets 7-day expiration from now
       */
      setAuth: (token: string, user: User, refreshToken?: string) => {
        const expiration = Date.now() + REMEMBER_ME_DURATION;
        
        logger.info('Setting auth data:', {
          hasToken: !!token,
          hasRefreshToken: !!refreshToken,
          userId: user.id,
          userName: user.userName,
          expiresAt: new Date(expiration).toISOString(),
        });
        
        set({
          token,
          refreshToken: refreshToken || null,
          user,
          expiration,
        });
      },
      
      /**
       * Clear all authentication data
       */
      clearAuth: () => {
        logger.info('Clearing auth data');
        set(initialState);
      },
      
      /**
       * Extend expiration by 7 days from now (rolling expiration)
       */
      extendExpiration: () => {
        const state = get();
        if (state.token) {
          const newExpiration = Date.now() + REMEMBER_ME_DURATION;
          logger.info('Extending auth expiration:', {
            oldExpiration: state.expiration ? new Date(state.expiration).toISOString() : 'none',
            newExpiration: new Date(newExpiration).toISOString(),
          });
          set({ expiration: newExpiration });
        }
      },
      
      /**
       * Check if authentication has expired
       */
      isExpired: (): boolean => {
        const state = get();
        if (!state.expiration) {
          return false;
        }
        const expired = Date.now() > state.expiration;
        if (expired) {
          logger.warn('Auth has expired:', {
            expiration: new Date(state.expiration).toISOString(),
            now: new Date().toISOString(),
          });
        }
        return expired;
      },
      
      /**
       * Get token synchronously (for API interceptors)
       * This is the critical synchronous access method needed by apiClient
       */
      getTokenSync: (): string | null => {
        return get().token;
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      version: 1,
    }
  )
);

/**
 * Helper functions for backward compatibility with existing code
 */
export const authStorageHelpers = {
  /**
   * Get token synchronously (for API interceptors)
   */
  getStoredTokenSync: (): string | null => {
    return useAuthStore.getState().getTokenSync();
  },

  /**
   * Get token asynchronously (for consistency with old API)
   */
  getStoredToken: async (): Promise<string | null> => {
    return useAuthStore.getState().token;
  },

  /**
   * Get refresh token
   */
  getStoredRefreshToken: async (): Promise<string | null> => {
    return useAuthStore.getState().refreshToken;
  },

  /**
   * Get stored user
   */
  getStoredUser: async (): Promise<User | null> => {
    return useAuthStore.getState().user;
  },

  /**
   * Check if auth is expired
   */
  isAuthExpired: async (): Promise<boolean> => {
    return useAuthStore.getState().isExpired();
  },

  /**
   * Extend auth expiration
   */
  extendAuthExpiration: async (): Promise<void> => {
    useAuthStore.getState().extendExpiration();
  },

  /**
   * Set stored auth
   */
  setStoredAuth: async (token: string, user: User, refreshToken?: string): Promise<void> => {
    useAuthStore.getState().setAuth(token, user, refreshToken);
  },

  /**
   * Clear stored auth
   */
  clearStoredAuth: async (): Promise<void> => {
    useAuthStore.getState().clearAuth();
  },

  /**
   * Clear all data (for logout)
   */
  clearAll: async (): Promise<void> => {
    useAuthStore.getState().clearAuth();
  },
};
