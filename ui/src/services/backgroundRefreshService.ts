/**
 * Background Refresh Service
 * 
 * TODO: Refactor to use MonitoringContext instead of Redux
 * This service is currently DISABLED pending refactoring.
 * 
 * Original functionality:
 * - Monitors data age and refreshes stale data
 * - Uses Page Visibility API to pause when tab is hidden
 * - Prevents showing sync page to user
 * - Supports configurable refresh intervals
 * - Handles network failures gracefully
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('BackgroundRefresh');

// ========================================
// Types and Interfaces
// ========================================

export interface BackgroundRefreshConfig {
  enabled: boolean;
  refreshInterval: number;
  dataStaleThreshold: number;
  retryAttempts: number;
  retryDelay: number;
}

interface RefreshStatus {
  lastCheck: number;
  lastRefresh: number;
  nextRefresh: number;
  isRefreshing: boolean;
  errors: string[];
}

// ========================================
// Stub Implementation (Disabled)
// ========================================

export class BackgroundRefreshService {
  private config: BackgroundRefreshConfig = {
    enabled: false,
    refreshInterval: 5 * 60 * 1000,
    dataStaleThreshold: 30 * 60 * 1000,
    retryAttempts: 3,
    retryDelay: 5000,
  };
  
  private status: RefreshStatus = {
    lastCheck: 0,
    lastRefresh: 0,
    nextRefresh: 0,
    isRefreshing: false,
    errors: [],
  };

  constructor(_config?: Partial<BackgroundRefreshConfig>) {
    logger.warn('BackgroundRefreshService is disabled - requires refactoring to use MonitoringContext');
  }

  start(): void {
    logger.warn('BackgroundRefreshService.start() called but service is disabled');
  }

  stop(): void {
    // No-op
  }

  async forceRefresh(): Promise<void> {
    logger.warn('BackgroundRefreshService.forceRefresh() called but service is disabled');
  }

  getStatus(): RefreshStatus {
    return { ...this.status };
  }

  updateConfig(_config: Partial<BackgroundRefreshConfig>): void {
    logger.warn('BackgroundRefreshService.updateConfig() called but service is disabled');
  }

  getConfig(): BackgroundRefreshConfig {
    return { ...this.config };
  }
}

// ========================================
// Singleton Instance
// ========================================

let refreshServiceInstance: BackgroundRefreshService | null = null;

export function getBackgroundRefreshService(): BackgroundRefreshService {
  if (!refreshServiceInstance) {
    refreshServiceInstance = new BackgroundRefreshService();
  }
  return refreshServiceInstance;
}

export function initBackgroundRefresh(config?: Partial<BackgroundRefreshConfig>): BackgroundRefreshService {
  const service = getBackgroundRefreshService();
  if (config) {
    service.updateConfig(config);
  }
  return service;
}

export default getBackgroundRefreshService;
