import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthContextType, LoginRequest, ApiError, User } from '../types/auth';
import { authApi } from '../services/api';
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

  // Initialize auth state on mount from storage
  useEffect(() => {
    // Read stored auth synchronously; keep isLoading true during this read
    try {
      const authState = authStorageHelpers.getCurrentAuth();
      setUser(authState.user);
      setToken(authState.token);
      setIsAuthenticated(Boolean(authState.token && authState.user));
    } finally {
      // Ensure loading flag is cleared after initialization
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call the Axios API
      const response = await authApi.login(credentials);
      
      // Update auth state
      setUser(response.user);
      setToken(response.accessToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      
    } catch (error) {
      setIsLoading(false);
      // Re-throw the error to let the calling component handle it
      throw error as ApiError;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    // Clear from storage
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