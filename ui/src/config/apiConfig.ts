/**
 * API Configuration - Dynamic URL Detection
 * Automatically detects the appropriate API base URL based on the current host
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('ApiConfig');

/**
 * Dynamically determine the API base URL based on current hostname
 * @returns The API base URL (e.g., http://localhost:5030 or http://192.168.70.10:5030)
 */
function getApiBaseUrl(): string {
  // Check if explicitly set via environment variable (production builds)
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl && envApiUrl.trim() !== '') {
    logger.log('Using API URL from environment variable:', envApiUrl);
    return envApiUrl;
  }

  // Development mode: Auto-detect based on current hostname
  if (import.meta.env.DEV) {
    const currentHost = window.location.hostname;
    const protocol = window.location.protocol; // Use same protocol as frontend
    const apiPort = 5030; // Backend API port

    // Use Vite proxy for localhost (relative URLs)
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      logger.log('Development mode: Using Vite proxy (empty base URL for relative paths)');
      return ''; // Empty string = relative URLs go through Vite proxy
    }

    // For network access (IP address), construct full URL
    const apiUrl = `${protocol}//${currentHost}:${apiPort}`;
    logger.log('Development mode: Detected network access, using API URL:', apiUrl);
    return apiUrl;
  }

  // Production fallback: Use relative URLs (same origin)
  logger.log('Production mode: Using relative URLs (same origin)');
  return '';
}

/**
 * Get the SignalR hub base URL
 * @returns The SignalR hub base URL
 */
function getSignalRBaseUrl(): string {
  // SignalR uses the same base as the API
  return getApiBaseUrl();
}

/**
 * API configuration object
 */
export const apiConfig = {
  /**
   * Base URL for API requests
   * Empty string means relative URLs (go through Vite proxy in dev, or same origin in prod)
   */
  baseUrl: getApiBaseUrl(),

  /**
   * SignalR hub base URL
   */
  signalRBaseUrl: getSignalRBaseUrl(),

  /**
   * API timeout in milliseconds
   */
  timeout: 10000,

  /**
   * Log the current configuration (development only)
   */
  logConfig() {
    if (import.meta.env.DEV) {
      logger.log('API Configuration:', {
        baseUrl: this.baseUrl || '(relative URLs via Vite proxy)',
        signalRBaseUrl: this.signalRBaseUrl || '(relative URLs via Vite proxy)',
        timeout: this.timeout,
        currentHost: window.location.hostname,
        currentOrigin: window.location.origin,
      });
    }
  },
};

// Log configuration on initialization (development only)
if (import.meta.env.DEV) {
  apiConfig.logConfig();
}
