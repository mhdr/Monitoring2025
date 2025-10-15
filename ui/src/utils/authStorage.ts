import type { User } from '../types/auth';

/**
 * Helper functions for managing authentication data in browser storage
 * Uses localStorage for persistent storage with rolling 7-day expiration
 */

// Constants
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_EXPIRATION_KEY = 'auth_expiration';
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const authStorageHelpers = {
  getStoredToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getStoredRefreshToken: (): string | null => {
    return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
  },

  getStoredUser: (): User | null => {
    const userData = localStorage.getItem(AUTH_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Check if the stored authentication has expired
   */
  isAuthExpired: (): boolean => {
    const expirationStr = localStorage.getItem(AUTH_EXPIRATION_KEY);
    if (!expirationStr) {
      return false;
    }
    
    const expiration = parseInt(expirationStr, 10);
    const now = Date.now();
    return now > expiration;
  },

  /**
   * Extend the authentication expiration by 7 days from now
   */
  extendAuthExpiration: (): void => {
    const hasToken = !!localStorage.getItem(AUTH_TOKEN_KEY);
    if (hasToken) {
      const newExpiration = Date.now() + REMEMBER_ME_DURATION;
      localStorage.setItem(AUTH_EXPIRATION_KEY, newExpiration.toString());
    }
  },

  setStoredAuth: (token: string, user: User, refreshToken?: string): void => {
    // Persistent storage in localStorage with 7-day rolling expiration
    const expiration = Date.now() + REMEMBER_ME_DURATION;
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_EXPIRATION_KEY, expiration.toString());
    if (refreshToken) {
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clearStoredAuth: (): void => {
    // Clear all auth data from localStorage
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_EXPIRATION_KEY);
  },

  getCurrentAuth: () => {
    // Check if auth is expired first
    if (authStorageHelpers.isAuthExpired()) {
      // Clear expired auth
      authStorageHelpers.clearStoredAuth();
      return {
        token: null,
        refreshToken: null,
        user: null,
      };
    }

    // If valid, extend expiration (rolling window)
    authStorageHelpers.extendAuthExpiration();

    return {
      token: authStorageHelpers.getStoredToken(),
      refreshToken: authStorageHelpers.getStoredRefreshToken(),
      user: authStorageHelpers.getStoredUser(),
    };
  },
};
