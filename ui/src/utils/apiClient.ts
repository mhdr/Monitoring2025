import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type { LoginRequest, LoginResponse, ApiError, User } from '../types/auth';

// API configuration
const API_BASE_URL = 'https://localhost:7136';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      const token = this.getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear storage and redirect to login
          this.clearStoredAuth();
          window.location.href = '/login';
        }
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  private handleApiError(error: unknown): ApiError {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        return {
          message: error.response.data?.message || 'Server error occurred',
          status: error.response.status,
          errors: error.response.data?.errors,
        };
      } else if (error.request) {
        // Network error
        return {
          message: 'Network error - please check your connection',
          status: 0,
        };
      }
    }
    
    // Other error
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await this.client.post('/api/auth/login', credentials);
      const loginData = response.data;
      
      // Store token and user data
      this.setStoredAuth(loginData.token, loginData.user);
      
      return loginData;
    } catch (error) {
      throw this.handleApiError(error);
    }
  }

  logout(): void {
    this.clearStoredAuth();
  }

  // Token management
  private getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private getStoredUser(): User | null {
    const userData = localStorage.getItem('auth_user');
    return userData ? JSON.parse(userData) : null;
  }

  private setStoredAuth(token: string, user: User): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }

  private clearStoredAuth(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  // Get current auth state
  getCurrentAuth() {
    return {
      token: this.getStoredToken(),
      user: this.getStoredUser(),
    };
  }

  // Generic API methods for future use
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get(endpoint, config);
    return response.data;
  }

  async post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post(endpoint, data, config);
    return response.data;
  }

  async put<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put(endpoint, data, config);
    return response.data;
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete(endpoint, config);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();