import type { User } from '../types/auth';

/**
 * Helper functions for managing authentication data in browser storage
 * Supports both localStorage (persistent) and sessionStorage (session-only)
 * Implements rolling 7-day expiration for remember-me functionality
 */

// Constants
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_EXPIRATION_KEY = 'auth_expiration';
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const authStorageHelpers = {
  getStoredToken: (): string | null => {
    return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);
  },

  getStoredUser: (): User | null => {
    const userData = localStorage.getItem(AUTH_USER_KEY) || sessionStorage.getItem(AUTH_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  },

  /**
   * Check if the stored authentication has expired
   * Only applies to localStorage (remember-me) tokens
   */
  isAuthExpired: (): boolean => {
    const expirationStr = localStorage.getItem(AUTH_EXPIRATION_KEY);
    if (!expirationStr) {
      // No expiration means either sessionStorage or no auth
      return false;
    }
    
    const expiration = parseInt(expirationStr, 10);
    const now = Date.now();
    return now > expiration;
  },

  /**
   * Extend the authentication expiration by 7 days from now
   * Only applies to localStorage (remember-me) tokens
   */
  extendAuthExpiration: (): void => {
    const hasRememberMeToken = !!localStorage.getItem(AUTH_TOKEN_KEY);
    if (hasRememberMeToken) {
      const newExpiration = Date.now() + REMEMBER_ME_DURATION;
      localStorage.setItem(AUTH_EXPIRATION_KEY, newExpiration.toString());
    }
  },

  setStoredAuth: (token: string, user: User, rememberMe: boolean = true): void => {
    if (rememberMe) {
      // Persistent storage - survives browser restart with 7-day rolling expiration
      const expiration = Date.now() + REMEMBER_ME_DURATION;
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_EXPIRATION_KEY, expiration.toString());
      // Clear any existing session storage
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
    } else {
      // Session storage - cleared when browser/tab is closed
      sessionStorage.setItem(AUTH_TOKEN_KEY, token);
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      // Clear any existing persistent storage
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_EXPIRATION_KEY);
    }
  },

  clearStoredAuth: (): void => {
    // Clear both localStorage and sessionStorage to ensure complete logout
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_EXPIRATION_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  },

  getCurrentAuth: () => {
    // Check if auth is expired first
    if (authStorageHelpers.isAuthExpired()) {
      // Clear expired auth
      authStorageHelpers.clearStoredAuth();
      return {
        token: null,
        user: null,
      };
    }

    // If valid, extend expiration (rolling window)
    authStorageHelpers.extendAuthExpiration();

    return {
      token: authStorageHelpers.getStoredToken(),
      user: authStorageHelpers.getStoredUser(),
    };
  },
};
