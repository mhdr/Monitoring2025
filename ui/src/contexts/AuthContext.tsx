import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthContextType, LoginRequest, ApiError, User } from '../types/auth';
import { login as apiLogin } from '../services/api';
import { authStorageHelpers } from '../utils/authStorage';
import { createLogger } from '../utils/logger';
import {
  initAuthBroadcast,
  subscribeToAuthBroadcast,
  broadcastLogin,
  broadcastLogout,
  closeAuthBroadcast,
  respondAuthStatus,
} from '../utils/authBroadcast';

const logger = createLogger('AuthContext');

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const authState = await authStorageHelpers.getCurrentAuth();
        setUser(authState.user);
        setToken(authState.token);
        setIsAuthenticated(Boolean(authState.token && authState.user));
        logger.log('AuthContext initialized:', { 
          hasToken: !!authState.token, 
          hasUser: !!authState.user,
          isAuthenticated: Boolean(authState.token && authState.user)
        });
      } catch (error) {
        logger.error('Failed to initialize auth from IndexedDB:', error);
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    initAuthBroadcast();
    const unsubscribe = subscribeToAuthBroadcast((message) => {
      switch (message.type) {
        case 'LOGIN':
          logger.debug('Received LOGIN broadcast from another tab');
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
                setUser(currentAuth.user);
                setIsAuthenticated(true);
              } else {
                setToken(message.payload.accessToken);
                setIsAuthenticated(true);
              }
            } catch (error) {
              logger.error('Failed to handle LOGIN broadcast:', error);
            }
          })();
          break;
        case 'LOGOUT':
          logger.debug('Received LOGOUT broadcast from another tab');
          setUser(null);
          setToken(null);
          setIsAuthenticated(false);
          authStorageHelpers.clearStoredAuth().catch((error) => {
            logger.error('Failed to clear auth storage on LOGOUT broadcast:', error);
          });
          break;
        case 'TOKEN_REFRESHED':
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
        case 'AUTH_CHECK_REQUEST':
          logger.debug('Received AUTH_CHECK_REQUEST');
          respondAuthStatus(isAuthenticated);
          break;
        case 'AUTH_CHECK_RESPONSE':
          logger.debug('Received AUTH_CHECK_RESPONSE:', message.payload.isAuthenticated);
          if (message.payload.isAuthenticated && !isAuthenticated) {
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
        default:
          logger.warn('Unknown auth broadcast message type:', message);
      }
    });
    return () => {
      unsubscribe();
      closeAuthBroadcast();
    };
  }, [isAuthenticated]);

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

  // Background refresh functionality has been moved to MonitoringContext
  // This service was disabled and is no longer needed here

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await apiLogin(credentials);
      setUser(result.user);
      setToken(result.accessToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      const authState = await authStorageHelpers.getCurrentAuth();
      if (authState.refreshToken) {
        broadcastLogin(result.accessToken, authState.refreshToken);
      }
    } catch (error) {
      setIsLoading(false);
      throw error as ApiError;
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    await authStorageHelpers.clearStoredAuth();
    broadcastLogout();
  }, []);

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
