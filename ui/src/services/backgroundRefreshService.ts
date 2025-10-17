/**
 * Background Refresh Service - DEPRECATED
 * 
 * ⚠️ MIGRATION COMPLETE: This service has been replaced by MonitoringContext
 * 
 * Background refresh functionality is now handled directly by MonitoringContext.
 * The MonitoringProvider automatically:
 * - Monitors data age and refreshes stale data
 * - Uses Page Visibility API to pause when tab is hidden
 * - Prevents showing sync page to user (silent background refresh)
 * - Supports configurable refresh intervals
 * - Handles network failures gracefully
 * 
 * To configure background refresh, use the MonitoringContext:
 * 
 * ```typescript
 * import { useMonitoring } from '../hooks/useMonitoring';
 * 
 * const { updateBackgroundRefreshConfig, forceRefresh } = useMonitoring();
 * 
 * // Update configuration
 * updateBackgroundRefreshConfig({
 *   enabled: true,
 *   refreshInterval: 5 * 60 * 1000,      // 5 minutes
 *   dataStaleThreshold: 30 * 60 * 1000,  // 30 minutes
 * });
 * 
 * // Force an immediate refresh
 * await forceRefresh();
 * ```
 * 
 * This stub service is kept for backwards compatibility only and will be
 * removed in a future version.
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

  constructor() {
    logger.warn(
      'BackgroundRefreshService is deprecated. Use MonitoringContext instead. ' +
      'See useMonitoring hook for updateBackgroundRefreshConfig() and forceRefresh() methods.'
    );
  }

  start(): void {
    logger.warn(
      'BackgroundRefreshService.start() is deprecated. ' +
      'Background refresh is automatically handled by MonitoringProvider when data is synced.'
    );
  }

  stop(): void {
    // No-op - background refresh is managed by MonitoringProvider lifecycle
  }

  async forceRefresh(): Promise<void> {
    logger.warn(
      'BackgroundRefreshService.forceRefresh() is deprecated. ' +
      'Use MonitoringContext forceRefresh() method instead: const { forceRefresh } = useMonitoring(); await forceRefresh();'
    );
  }

  getStatus(): RefreshStatus {
    return { ...this.status };
  }

  updateConfig(): void {
    logger.warn(
      'BackgroundRefreshService.updateConfig() is deprecated. ' +
      'Use MonitoringContext updateBackgroundRefreshConfig() method instead: const { updateBackgroundRefreshConfig } = useMonitoring();'
    );
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

export function initBackgroundRefresh(_config?: Partial<BackgroundRefreshConfig>): BackgroundRefreshService {
  const service = getBackgroundRefreshService();
  // Config parameter ignored - use MonitoringContext.updateBackgroundRefreshConfig instead
  return service;
}

export default getBackgroundRefreshService;
