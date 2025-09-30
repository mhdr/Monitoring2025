import React, { createContext, useEffect, useCallback, type ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AuthContextType, LoginRequest, ApiError } from '../types/auth';
import { useLoginMutation, apiSlice } from '../store/api/apiSlice';
import { setAuth, clearAuth, setLoading, initializeAuth, selectAuth } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, token, isAuthenticated, isLoading } = useSelector(selectAuth);
  const [loginMutation] = useLoginMutation();

  // Initialize auth state on mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  // Refetch groups and items data when the app loads if user is authenticated
  useEffect(() => {
    if (isAuthenticated && token && !isLoading) {
      // Refetch monitoring groups and items on app initialization
      // This ensures fresh data while keeping the cached data available during loading
      dispatch(apiSlice.util.prefetch('getGroups', {}, { force: true }));
      dispatch(apiSlice.util.prefetch('getItems', { showOrphans: false }, { force: true }));
    }
  }, [isAuthenticated, token, isLoading, dispatch]);

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

      // Prefetch monitoring groups data after successful login
      dispatch(apiSlice.util.prefetch('getGroups', {}, { force: true }));
      
      // Prefetch monitoring items data after successful login
      dispatch(apiSlice.util.prefetch('getItems', { showOrphans: false }, { force: true }));
      
    } catch (error) {
      dispatch(setLoading(false));
      // Re-throw the error to let the calling component handle it
      throw error as ApiError;
    }
  }, [dispatch, loginMutation]);

  const logout = useCallback(() => {
    dispatch(clearAuth());
    // Clear cached groups and items data on logout
    dispatch(apiSlice.util.invalidateTags(['Groups', 'Items']));
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