import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthContextType, LoginRequest, ApiError, User } from '../types/auth';
import { useLoginMutation } from '../services/rtkApi';
import { authStorageHelpers } from '../utils/authStorage';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
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
    // Read stored auth synchronously; keep isLoading true during this read
    try {
      const authState = authStorageHelpers.getCurrentAuth();
      setUser(authState.user);
      setToken(authState.token);
      // refreshToken is stored but not kept in React state - it's only used by RTK Query
      setIsAuthenticated(Boolean(authState.token && authState.user));
    } finally {
      // Ensure loading flag is cleared after initialization
      setIsLoading(false);
    }
  }, []);

  // Extend auth expiration on user activity (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Extend immediately on mount if authenticated
    authStorageHelpers.extendAuthExpiration();

    // Set up interval to extend expiration periodically
    const interval = setInterval(() => {
      authStorageHelpers.extendAuthExpiration();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

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
      
    } catch (error) {
      setIsLoading(false);
      // Re-throw the error to let the calling component handle it
      throw error as ApiError;
    }
  }, [loginMutation]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    // Clear from storage (including refresh token)
    authStorageHelpers.clearStoredAuth();
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