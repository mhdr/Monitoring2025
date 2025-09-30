import React, { createContext, useEffect, useCallback, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AuthContextType, LoginRequest, ApiError } from '../types/auth';
import { authApi } from '../services/api';
import { setAuth, clearAuth, setLoading, initializeAuth, selectAuth } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, isAuthenticated, isLoading } = useSelector(selectAuth);

  // Initialize auth state on mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      dispatch(setLoading(true));
      
      // Call the Axios API
      const response = await authApi.login(credentials);
      
      // Update auth state
      dispatch(setAuth({
        user: response.user,
        token: response.accessToken,
      }));
      
    } catch (error) {
      dispatch(setLoading(false));
      // Re-throw the error to let the calling component handle it
      throw error as ApiError;
    }
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(clearAuth());
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