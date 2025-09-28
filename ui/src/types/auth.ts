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
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
  expires: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}