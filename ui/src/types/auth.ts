// Authentication types for the monitoring system
export interface User {
  id: string;
  userName: string;
  firstName?: string;
  lastName?: string;
  firstNameFa?: string;
  lastNameFa?: string;
  roles?: string[];
  isDisabled?: boolean;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  expires: string;
  success: boolean;
  errorMessage?: string;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// ==================== Extended Authentication DTOs ====================

export interface RegisterRequestDto {
  firstName: string; // Max 50 characters
  lastName: string; // Max 50 characters
  firstNameFa: string; // Max 50 characters - First name in Farsi
  lastNameFa: string; // Max 50 characters - Last name in Farsi
  userName: string; // Max 50 characters - Username
  password: string; // Minimum 1 character
  confirmPassword: string; // Minimum 1 character
}

export interface AuthResponseDto {
  accessToken?: string | null; // JWT access token
  refreshToken?: string | null; // Refresh token
  expires: string; // Token expiry time (ISO 8601)
  user?: UserInfoDto;
  success: boolean; // Indicates if authentication was successful
  errorMessage?: string | null; // Error message if authentication failed
}

export interface UserInfoDto {
  id?: string | null; // User ID
  userName?: string | null; // Username
  firstName?: string | null; // First name
  lastName?: string | null; // Last name
  firstNameFa?: string | null; // First name in Farsi
  lastNameFa?: string | null; // Last name in Farsi
  roles?: string[] | null; // User roles
  isDisabled?: boolean; // Whether user account is disabled/locked
}

export interface ResetPasswordRequestDto {
  userName: string; // The username of the account to reset (1-100 characters)
}

export interface ResetPasswordResponseDto {
  isSuccessful: boolean; // Indicates whether the password reset operation succeeded
  message?: string | null; // Optional human-readable message describing the result
  errors?: string[] | null; // Optional list of error details when the operation failed
}

export interface ChangePasswordRequestDto {
  currentPassword: string; // User's current password for verification
  newPassword: string; // New password to set
}

export interface ChangePasswordResponseDto {
  isSuccessful: boolean; // Indicates whether the password change was successful
}

export interface DisableUserRequestDto {
  userId: string; // User ID to disable/enable (minimum 1 character)
  disable: boolean; // Whether to disable (true) or enable (false) the user
  reason?: string | null; // Optional reason for disabling the user (max 500 characters)
}

export interface UpdateUserRequestDto {
  firstName?: string | null; // User's first name (max 50 characters)
  lastName?: string | null; // User's last name (max 50 characters)
  firstNameFa?: string | null; // User's first name in Farsi (max 50 characters)
  lastNameFa?: string | null; // User's last name in Farsi (max 50 characters)
}

export interface OperationResponseDto {
  success: boolean; // Whether the operation was successful
  message?: string | null; // Success or error message
  data?: unknown; // Additional data if needed
}