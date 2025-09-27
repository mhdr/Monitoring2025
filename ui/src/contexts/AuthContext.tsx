import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthContextType, LoginRequest, ApiError } from '../types/auth';
import { apiClient } from '../utils/apiClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = () => {
      const authState = apiClient.getCurrentAuth();
      if (authState.token && authState.user) {
        setToken(authState.token);
        setUser(authState.user);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await apiClient.login(credentials);
      
      setToken(response.token);
      setUser(response.user);
    } catch (error) {
      // Re-throw the error to let the calling component handle it
      throw error as ApiError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiClient.logout();
    setToken(null);
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
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