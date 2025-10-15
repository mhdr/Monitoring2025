import type { User } from '../types/auth';
import { getItem, setItem, removeItem } from './indexedDbStorage';

/**
 * Helper functions for managing authentication data in browser storage
 * Uses IndexedDB for persistent storage with rolling 7-day expiration
 * Maintains in-memory cache for synchronous access (required by RTK Query prepareHeaders)
 */

// Constants
const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_REFRESH_TOKEN_KEY = 'auth_refresh_token';
const AUTH_USER_KEY = 'auth_user';
const AUTH_EXPIRATION_KEY = 'auth_expiration';
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// In-memory cache for synchronous access (needed by RTK Query prepareHeaders)
// This is kept in sync with IndexedDB
let tokenCache: string | null = null;
let refreshTokenCache: string | null = null;
let userCache: User | null = null;

export const authStorageHelpers = {
  /**
   * Get token synchronously from cache (for RTK Query prepareHeaders)
   * Use this ONLY in synchronous contexts like prepareHeaders
   */
  getStoredTokenSync: (): string | null => {
    return tokenCache;
  },

  /**
   * Get token asynchronously from IndexedDB (updates cache)
   * Use this for most cases
   */
  getStoredToken: async (): Promise<string | null> => {
    const token = await getItem<string>(AUTH_TOKEN_KEY);
    tokenCache = token;
    return token;
  },

  getStoredRefreshToken: async (): Promise<string | null> => {
    const refreshToken = await getItem<string>(AUTH_REFRESH_TOKEN_KEY);
    refreshTokenCache = refreshToken;
    return refreshToken;
  },

  getStoredUser: async (): Promise<User | null> => {
    const user = await getItem<User>(AUTH_USER_KEY);
    userCache = user;
    return user;
  },

  /**
   * Check if the stored authentication has expired
   */
  isAuthExpired: async (): Promise<boolean> => {
    const expiration = await getItem<number>(AUTH_EXPIRATION_KEY);
    if (!expiration) {
      return false;
    }
    
    const now = Date.now();
    return now > expiration;
  },

  /**
   * Extend the authentication expiration by 7 days from now
   */
  extendAuthExpiration: async (): Promise<void> => {
    const hasToken = !!(await getItem<string>(AUTH_TOKEN_KEY));
    if (hasToken) {
      const newExpiration = Date.now() + REMEMBER_ME_DURATION;
      await setItem(AUTH_EXPIRATION_KEY, newExpiration);
    }
  },

  setStoredAuth: async (token: string, user: User, refreshToken?: string): Promise<void> => {
    // Update cache immediately for sync access
    tokenCache = token;
    userCache = user;
    if (refreshToken) {
      refreshTokenCache = refreshToken;
    }
    
    // Persistent storage in IndexedDB with 7-day rolling expiration
    const expiration = Date.now() + REMEMBER_ME_DURATION;
    await setItem(AUTH_TOKEN_KEY, token);
    await setItem(AUTH_USER_KEY, user);
    await setItem(AUTH_EXPIRATION_KEY, expiration);
    if (refreshToken) {
      await setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
    }
  },

  clearStoredAuth: async (): Promise<void> => {
    // Clear cache immediately
    tokenCache = null;
    refreshTokenCache = null;
    userCache = null;
    
    // Clear all auth data from IndexedDB
    await removeItem(AUTH_TOKEN_KEY);
    await removeItem(AUTH_REFRESH_TOKEN_KEY);
    await removeItem(AUTH_USER_KEY);
    await removeItem(AUTH_EXPIRATION_KEY);
  },

  getCurrentAuth: async () => {
    // Check if auth is expired first
    if (await authStorageHelpers.isAuthExpired()) {
      // Clear expired auth
      await authStorageHelpers.clearStoredAuth();
      return {
        token: null,
        refreshToken: null,
        user: null,
      };
    }

    // If valid, extend expiration (rolling window)
    await authStorageHelpers.extendAuthExpiration();

    return {
      token: await authStorageHelpers.getStoredToken(),
      refreshToken: await authStorageHelpers.getStoredRefreshToken(),
      user: await authStorageHelpers.getStoredUser(),
    };
  },
};
