import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthContextType, LoginRequest, ApiError, User } from '../types/auth';
import { useLoginMutation } from '../services/rtkApi';
import { authStorageHelpers } from '../utils/authStorage';
import { getBackgroundRefreshService } from '../services/backgroundRefreshService';
import { createLogger } from '../utils/logger';
import {
  initAuthBroadcast,
  subscribeToAuthBroadcast,
  broadcastLogin,
  broadcastLogout,
  closeAuthBroadcast,
  respondAuthStatus,
} from '../utils/authBroadcast';
import { useAppDispatch } from '../hooks/useRedux';
import { setAuthState, logout as logoutAction } from '../store/slices/authSlice';

const logger = createLogger('AuthContext');

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  // Start loading true until we initialize auth state from storage
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Note: refreshToken is managed in authStorage and used by RTK Query's interceptor
  // It doesn't need to be in React state since it's never displayed or used in components
  
  // RTK Query login mutation hook
  const [loginMutation] = useLoginMutation();

  // Initialize auth state on mount from storage
  useEffect(() => {
    // Read stored auth asynchronously from IndexedDB
    // This also populates the in-memory cache for sync access
    // NOTE: main.tsx already calls initializeAuth thunk which loads auth data
    // This is a secondary check to sync AuthContext with Redux state
    (async () => {
      try {
        const authState = await authStorageHelpers.getCurrentAuth();
        setUser(authState.user);
        setToken(authState.token);
        // refreshToken is stored but not kept in React state - it's only used by RTK Query
        setIsAuthenticated(Boolean(authState.token && authState.user));
        
        // Sync Redux state with AuthContext
        if (authState.token && authState.user) {
          dispatch(setAuthState({ token: authState.token, user: authState.user }));
        }
        
        // Log for debugging
        logger.log('AuthContext initialized:', { 
          hasToken: !!authState.token, 
          hasUser: !!authState.user,
          isAuthenticated: Boolean(authState.token && authState.user)
        });
      } catch (error) {
        logger.error('Failed to initialize auth from IndexedDB:', error);
        // On error, assume not authenticated
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      } finally {
        // Ensure loading flag is cleared after initialization
        setIsLoading(false);
      }
    })();
  }, [dispatch]);

  // Initialize BroadcastChannel for cross-tab auth synchronization
  useEffect(() => {
    // Initialize the broadcast channel
    initAuthBroadcast();

    // Subscribe to auth events from other tabs
    const unsubscribe = subscribeToAuthBroadcast((message) => {
      switch (message.type) {
        case 'LOGIN': {
          // Another tab logged in - update local auth state
          logger.debug('Received LOGIN broadcast from another tab');
          // Get current auth state to see if we already have user info
          (async () => {
            try {
              const currentAuth = await authStorageHelpers.getCurrentAuth();
              if (currentAuth.user) {
                // User info already in storage, just update tokens
                await authStorageHelpers.setStoredAuth(
                  message.payload.accessToken,
                  currentAuth.user,
                  message.payload.refreshToken
                );
                setToken(message.payload.accessToken);
                setUser(currentAuth.user);
                setIsAuthenticated(true);
              } else {
                // No user info yet - will be updated when we fetch it
                // For now, just update state to trigger a re-fetch
                setToken(message.payload.accessToken);
                setIsAuthenticated(true);
              }
            } catch (error) {
              logger.error('Failed to handle LOGIN broadcast:', error);
            }
          })();
          break;
        }

        case 'LOGOUT': {
          // Another tab logged out - logout this tab as well
          logger.debug('Received LOGOUT broadcast from another tab');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
          authStorageHelpers.clearStoredAuth().catch((error) => {
            logger.error('Failed to clear auth storage on LOGOUT broadcast:', error);
          });
          break;
        }

        case 'TOKEN_REFRESHED': {
          // Another tab refreshed tokens - update local tokens
          logger.debug('Received TOKEN_REFRESHED broadcast from another tab');
          (async () => {
            try {
              const currentAuth = await authStorageHelpers.getCurrentAuth();
              if (currentAuth.user) {
                await authStorageHelpers.setStoredAuth(
                  message.payload.accessToken,
                  currentAuth.user,
                  message.payload.refreshToken
                );
                setToken(message.payload.accessToken);
              }
            } catch (error) {
              logger.error('Failed to handle TOKEN_REFRESHED broadcast:', error);
            }
          })();
          break;
        }

        case 'AUTH_CHECK_REQUEST': {
          // Another tab is asking if we're authenticated - respond
          logger.debug('Received AUTH_CHECK_REQUEST - responding with current auth state');
          respondAuthStatus(isAuthenticated);
          break;
        }

        case 'AUTH_CHECK_RESPONSE': {
          // Another tab responded with their auth status
          // This is useful for new tabs to quickly determine if they should be authenticated
          logger.debug('Received AUTH_CHECK_RESPONSE:', message.payload.isAuthenticated);
          if (message.payload.isAuthenticated && !isAuthenticated) {
            // Another tab is authenticated, but we're not - sync state
            (async () => {
              try {
                const authState = await authStorageHelpers.getCurrentAuth();
                if (authState.token && authState.user) {
                  setUser(authState.user);
                  setToken(authState.token);
                  setIsAuthenticated(true);
                }
              } catch (error) {
                logger.error('Failed to handle AUTH_CHECK_RESPONSE:', error);
              }
            })();
          }
          break;
        }

        default:
          logger.warn('Unknown auth broadcast message type:', message);
      }
    });

    // Cleanup: unsubscribe and close channel on unmount
    return () => {
      unsubscribe();
      closeAuthBroadcast();
    };
  }, [isAuthenticated]); // Re-subscribe when auth state changes to use latest value in respondAuthStatus

  // Extend auth expiration on user activity (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Extend immediately on mount if authenticated
    authStorageHelpers.extendAuthExpiration().catch((error) => {
      logger.error('Failed to extend auth expiration on mount:', error);
    });

    // Set up interval to extend expiration periodically
    const interval = setInterval(() => {
      authStorageHelpers.extendAuthExpiration().catch((error) => {
        logger.error('Failed to extend auth expiration:', error);
      });
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Manage background refresh service based on authentication state
  useEffect(() => {
    // Only start background refresh when user is authenticated AND loading is complete
    if (isAuthenticated && !isLoading) {
      logger.log('Starting background refresh service');
      const refreshService = getBackgroundRefreshService();
      refreshService.updateConfig({
        enabled: true,
        refreshInterval: 5 * 60 * 1000, // Check every 5 minutes
        dataStaleThreshold: 30 * 60 * 1000, // Refresh if data older than 30 minutes
      });
      refreshService.start();
    } else {
      // Stop background refresh when not authenticated
      logger.log('Stopping background refresh service');
      const refreshService = getBackgroundRefreshService();
      refreshService.stop();
    }

    return () => {
      // Cleanup: stop refresh service when component unmounts
      const refreshService = getBackgroundRefreshService();
      refreshService.stop();
    };
  }, [isAuthenticated, isLoading]);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call the RTK Query mutation
      const result = await loginMutation(credentials).unwrap();
      
      // Update auth state (refresh token is stored in authStorage by the login mutation)
      setUser(result.user);
      setToken(result.accessToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      
      // Sync Redux state
      dispatch(setAuthState({ token: result.accessToken, user: result.user }));
      
      // Broadcast login event to all other tabs
      // Get the refresh token from storage (it was stored by the login mutation)
      const authState = await authStorageHelpers.getCurrentAuth();
      if (authState.refreshToken) {
        broadcastLogin(result.accessToken, authState.refreshToken);
      }
      
    } catch (error) {
      setIsLoading(false);
      // Re-throw the error to let the calling component handle it
      throw error as ApiError;
    }
  }, [loginMutation, dispatch]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    // Clear from storage (including refresh token)
    await authStorageHelpers.clearStoredAuth();
    // Sync Redux state
    dispatch(logoutAction());
    // Broadcast logout event to all other tabs
    broadcastLogout();
  }, [dispatch]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };
