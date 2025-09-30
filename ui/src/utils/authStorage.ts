import type { User } from '../types/auth';

/**
 * Helper functions for managing authentication data in browser storage
 * Supports both localStorage (persistent) and sessionStorage (session-only)
 */
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
