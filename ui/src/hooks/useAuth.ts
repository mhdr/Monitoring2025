/**
 * useAuth Hook
 * 
 * Hook for accessing authentication state and actions.
 * Uses Zustand store instead of React Context.
 */

import { useAuthStore } from '../stores/authStore';
import { useCallback, useEffect, useState } from 'react';
import { login as apiLogin } from '../services/api';
import { authStorageHelpers } from '../utils/authStorage';
import { monitoringStorageHelpers } from '../stores/monitoringStore';
import type { LoginRequest, ApiError } from '../types/auth';
import { createLogger } from '../utils/logger';
import {
  initAuthBroadcast,
  subscribeToAuthBroadcast,
  broadcastLogin,
  broadcastLogout,
  closeAuthBroadcast,
  respondAuthStatus,
} from '../utils/authBroadcast';

const logger = createLogger('useAuth');

export const useAuth = () => {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const isAuthenticated = Boolean(token && user);
  
  // isLoading is true if:
  // 1. Store hasn't hydrated from localStorage yet, OR
  // 2. Login operation is in progress
  const isLoading = !hasHydrated || isLoginLoading;
  
  // Initialize from store on mount
  useEffect(() => {
    logger.log('Auth state initialized:', { 
      hasToken: !!token, 
      hasUser: !!user,
      isAuthenticated,
      hasHydrated,
    });
  }, [token, user, isAuthenticated, hasHydrated]);
  
  // Setup broadcast channel for cross-tab sync
  useEffect(() => {
    initAuthBroadcast();
    const unsubscribe = subscribeToAuthBroadcast((message) => {
      switch (message.type) {
        case 'LOGIN':
          logger.debug('Received LOGIN broadcast from another tab');
          authStorageHelpers.setStoredAuth(
            message.payload.accessToken,
            useAuthStore.getState().user!,
            message.payload.refreshToken
          );
          break;
        case 'LOGOUT':
          logger.debug('Received LOGOUT broadcast from another tab');
          useAuthStore.getState().clearAuth();
          monitoringStorageHelpers.clearAllMonitoringData();
          break;
        case 'TOKEN_REFRESHED':
          logger.debug('Received TOKEN_REFRESHED broadcast from another tab');
          authStorageHelpers.setStoredAuth(
            message.payload.accessToken,
            useAuthStore.getState().user!,
            message.payload.refreshToken
          );
          break;
        case 'AUTH_CHECK_REQUEST':
          logger.debug('Received AUTH_CHECK_REQUEST');
          respondAuthStatus(isAuthenticated);
          break;
        case 'AUTH_CHECK_RESPONSE':
          logger.debug('Received AUTH_CHECK_RESPONSE:', message.payload.isAuthenticated);
          // Auth store is already synced via localStorage
          break;
        default:
          logger.warn('Unknown auth broadcast message type:', message);
      }
    });
    return () => {
      unsubscribe();
      closeAuthBroadcast();
    };
  }, [isAuthenticated]);
  
  // Auto-extend auth expiration
  useEffect(() => {
    if (!isAuthenticated) return;
    authStorageHelpers.extendAuthExpiration().catch((error) => {
      logger.error('Failed to extend auth expiration on mount:', error);
    });
    const interval = setInterval(() => {
      authStorageHelpers.extendAuthExpiration().catch((error) => {
        logger.error('Failed to extend auth expiration:', error);
      });
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);
  
  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoginLoading(true);
      const result = await apiLogin(credentials);
      
      // Store auth data in Zustand store (persisted to localStorage)
      await authStorageHelpers.setStoredAuth(result.accessToken, result.user, result.refreshToken);
      
      setIsLoginLoading(false);
      
      // Broadcast login to other tabs
      if (result.refreshToken) {
        broadcastLogin(result.accessToken, result.refreshToken);
      }
    } catch (error) {
      setIsLoginLoading(false);
      throw error as ApiError;
    }
  }, []);
  
  const logout = useCallback(async () => {
    // Clear auth data from Zustand store
    await authStorageHelpers.clearAll();
    
    // Clear all monitoring data
    await monitoringStorageHelpers.clearAllMonitoringData().catch((error) => {
      logger.error('Failed to clear monitoring data on logout:', error);
    });
    
    broadcastLogout();
  }, []);
  
  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};