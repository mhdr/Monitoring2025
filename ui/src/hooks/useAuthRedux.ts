import { useAppDispatch, useAppSelector } from './useRedux';
import { authApi } from '../services/api';
import { setAuth, clearAuth, setLoading, selectAuth } from '../store/slices/authSlice';
import type { LoginRequest, ApiError } from '../types/auth';

/**
 * Custom hook that provides a Redux-based authentication interface
 * that matches the original AuthContext API for easier migration.
 */
export const useAuthRedux = () => {
  const dispatch = useAppDispatch();
  const { user, token, isAuthenticated, isLoading } = useAppSelector(selectAuth);

  const login = async (credentials: LoginRequest): Promise<void> => {
    try {
      dispatch(setLoading(true));
      const response = await authApi.login(credentials);
      dispatch(setAuth({
        user: response.user,
        token: response.accessToken,
      }));
    } catch (error) {
      dispatch(setLoading(false));
      throw error as ApiError;
    }
  };

  const logout = () => {
    dispatch(clearAuth());
  };

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };
};