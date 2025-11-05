/**
 * User Management API Service
 * All endpoints require Admin role
 */

import apiClient from './apiClient';
import { createLogger } from '../utils/logger';
import type {
  GetUsersRequestDto,
  GetUsersResponseDto,
  GetUserRequestDto,
  GetUserResponseDto,
  EditUserRequestDto,
  EditUserResponseDto,
  DeleteUserRequestDto,
  DeleteUserResponseDto,
  UpdateUserRolesRequestDto,
  UpdateUserRolesResponseDto,
  SetUserPasswordRequestDto,
  SetUserPasswordResponseDto,
  ResetPasswordRequestDto,
  ResetPasswordResponseDto,
  ToggleUserStatusRequestDto,
  ToggleUserStatusResponseDto,
  GetRolesResponseDto,
  RegisterRequestDto,
} from '../types/api';

const logger = createLogger('UserAPI');

/**
 * Get all users with optional filtering and pagination
 * Admin only
 */
export async function getUsers(request: GetUsersRequestDto): Promise<GetUsersResponseDto> {
  try {
    logger.log('Fetching users with filters:', request);
    const response = await apiClient.post<GetUsersResponseDto>('/api/Auth/users', request);
    logger.log('Users fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch users:', error);
    throw error;
  }
}

/**
 * Get a single user by ID
 * Admin only
 */
export async function getUser(userId: string): Promise<GetUserResponseDto> {
  try {
    logger.log('Fetching user:', userId);
    const request: GetUserRequestDto = { userId };
    const response = await apiClient.post<GetUserResponseDto>('/api/Auth/user', request);
    logger.log('User fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch user:', error);
    throw error;
  }
}

/**
 * Create a new user (via registration endpoint)
 * Note: register endpoint returns 200 OK with no body on success, throws on error
 */
export async function createUser(request: RegisterRequestDto): Promise<{ success: boolean; message?: string }> {
  try {
    logger.log('Creating new user:', request.userName);
    await apiClient.post('/api/Auth/register', request);
    logger.log('User created successfully');
    return { success: true };
  } catch (error) {
    logger.error('Failed to create user:', error);
    throw error;
  }
}

/**
 * Edit a user's information
 * Admin only
 */
export async function editUser(request: EditUserRequestDto): Promise<EditUserResponseDto> {
  try {
    logger.log('Editing user:', request.userId);
    const response = await apiClient.post<EditUserResponseDto>('/api/Auth/edit-user', request);
    logger.log('User edited successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to edit user:', error);
    throw error;
  }
}

/**
 * Delete a user from the system
 * Admin only
 */
export async function deleteUser(userId: string): Promise<DeleteUserResponseDto> {
  try {
    logger.log('Deleting user:', userId);
    const request: DeleteUserRequestDto = { userId };
    const response = await apiClient.post<DeleteUserResponseDto>('/api/Auth/delete-user', request);
    logger.log('User deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to delete user:', error);
    throw error;
  }
}

/**
 * Update a user's roles
 * Admin only
 */
export async function updateUserRoles(
  userId: string,
  roles: string[]
): Promise<UpdateUserRolesResponseDto> {
  try {
    logger.log('Updating user roles:', { userId, roles });
    const request: UpdateUserRolesRequestDto = { userId, roles };
    const response = await apiClient.post<UpdateUserRolesResponseDto>(
      '/api/Auth/update-user-roles',
      request
    );
    logger.log('User roles updated successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to update user roles:', error);
    throw error;
  }
}

/**
 * Set a new password for a user
 * Admin only
 */
export async function setUserPassword(
  userId: string,
  newPassword: string
): Promise<SetUserPasswordResponseDto> {
  try {
    logger.log('Setting user password:', userId);
    const request: SetUserPasswordRequestDto = { userId, newPassword };
    const response = await apiClient.post<SetUserPasswordResponseDto>(
      '/api/Auth/set-user-password',
      request
    );
    logger.log('User password set successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to set user password:', error);
    throw error;
  }
}

/**
 * Reset user password to default (12345)
 * Admin only
 */
export async function resetPassword(userName: string): Promise<ResetPasswordResponseDto> {
  try {
    logger.log('Resetting user password:', userName);
    const request: ResetPasswordRequestDto = { userName };
    const response = await apiClient.post<ResetPasswordResponseDto>(
      '/api/Auth/reset-password',
      request
    );
    logger.log('User password reset successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to reset user password:', error);
    throw error;
  }
}

/**
 * Toggle user enabled/disabled status
 * Admin only
 */
export async function toggleUserStatus(
  userId: string,
  disable: boolean
): Promise<ToggleUserStatusResponseDto> {
  try {
    logger.log('Toggling user status:', { userId, disable });
    const request: ToggleUserStatusRequestDto = { userId, disable };
    const response = await apiClient.post<ToggleUserStatusResponseDto>(
      '/api/Auth/toggle-user-status',
      request
    );
    logger.log('User status toggled successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to toggle user status:', error);
    throw error;
  }
}

/**
 * Get all available roles in the system
 * Admin only
 */
export async function getRoles(): Promise<GetRolesResponseDto> {
  try {
    logger.log('Fetching roles');
    const response = await apiClient.get<GetRolesResponseDto>('/api/Auth/roles');
    logger.log('Roles fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    logger.error('Failed to fetch roles:', error);
    throw error;
  }
}
