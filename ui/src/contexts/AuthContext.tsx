import React, { createContext, useEffect, useCallback, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AuthContextType, LoginRequest, ApiError } from '../types/auth';
import { useLoginMutation } from '../store/api/apiSlice';
import { setAuth, clearAuth, setLoading, initializeAuth, selectAuth } from '../store/slices/authSlice';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated, isLoading } = useSelector(selectAuth);
  const [loginMutation] = useLoginMutation();

  // Initialize auth state on mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    try {
      dispatch(setLoading(true));
      
      // Call the RTK Query mutation
      const response = await loginMutation(credentials).unwrap();
      
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
  }, [dispatch, loginMutation]);

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