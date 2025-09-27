import { useAppDispatch, useAppSelector } from './useRedux';
import { loginAsync, logoutAsync, clearError } from '../store/slices/authSlice';
import type { LoginRequest } from '../types/auth';

/**
 * Custom hook that provides a Redux-based authentication interface
 * that matches the original AuthContext API for easier migration.
 */
export const useAuthRedux = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const login = async (credentials: LoginRequest): Promise<void> => {
    const result = await dispatch(loginAsync(credentials));
    if (loginAsync.rejected.match(result)) {
      throw new Error(result.payload || 'Login failed');
    }
  };

  const logout = () => {
    dispatch(logoutAsync());
  };

  const clearAuthError = () => {
    dispatch(clearError());
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError: clearAuthError,
  };
};