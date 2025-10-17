import apiClient, { handleApiError } from './apiClient';
import { authStorageHelpers } from '../utils/authStorage';
import type {
  LoginRequest,
  LoginResponse,
  User,
  RefreshTokenRequest,
  RegisterRequestDto,
  AuthResponseDto,
  ResetPasswordResponseDto,
  ResetPasswordRequestDto,
  ChangePasswordRequestDto,
  ChangePasswordResponseDto,
  DisableUserRequestDto,
  UpdateUserRequestDto,
  OperationResponseDto,
  UserInfoDto,
} from '../types/auth';

/**
 * Authentication API services
 */

/**
 * Login with username and password
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials);
    
    // Check if login was successful
    if (response.data.success) {
      // Store tokens and user data in IndexedDB
      await authStorageHelpers.setStoredAuth(
        response.data.accessToken,
        response.data.user,
        response.data.refreshToken
      );
    }
    
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await apiClient.get<User>('/api/Auth/me');
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (tokens: RefreshTokenRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>('/api/Auth/refresh-token', tokens);
    
    // Update stored tokens with rotation
    const currentUser = await authStorageHelpers.getStoredUser();
    if (currentUser && response.data.success) {
      await authStorageHelpers.setStoredAuth(
        response.data.accessToken,
        response.data.user,
        response.data.refreshToken
      );
    }
    
    return response.data;
  } catch (error) {
    // Token refresh failed, clear auth
    authStorageHelpers.clearStoredAuth();
    handleApiError(error);
  }
};

/**
 * Change user password
 */
export const changePassword = async (data: ChangePasswordRequestDto): Promise<ChangePasswordResponseDto> => {
  try {
    const response = await apiClient.post<ChangePasswordResponseDto>('/api/Auth/change-password', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Register a new user
 */
export const register = async (data: RegisterRequestDto): Promise<AuthResponseDto> => {
  try {
    const response = await apiClient.post<AuthResponseDto>('/api/Auth/register', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Reset user password to default (admin only)
 */
export const resetPassword = async (data: ResetPasswordRequestDto): Promise<ResetPasswordResponseDto> => {
  try {
    const response = await apiClient.post<ResetPasswordResponseDto>('/api/Auth/reset-password', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Disable or enable a user account (admin only)
 */
export const disableUser = async (data: DisableUserRequestDto): Promise<OperationResponseDto> => {
  try {
    const response = await apiClient.post<OperationResponseDto>('/api/Auth/disable-user', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};

/**
 * Update user information
 */
export const updateUser = async (userId: string, data: UpdateUserRequestDto): Promise<UserInfoDto> => {
  try {
    const response = await apiClient.put<UserInfoDto>(`/api/Auth/update-user/${userId}`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
};
