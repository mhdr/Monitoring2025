/**
 * Background Refresh Service
 * 
 * Provides automatic background data synchronization:
 * - Monitors data age and refreshes stale data
 * - Uses Page Visibility API to pause when tab is hidden
 * - Prevents showing sync page to user
 * - Supports configurable refresh intervals
 * - Handles network failures gracefully
 */

import { store } from '../store';
import { fetchGroups, fetchItems, fetchAlarms } from '../store/slices/monitoringSlice';
import { getMetadata, updateMetadata } from '../utils/monitoringStorage';

// ========================================
// Types and Interfaces
// ========================================

export interface BackgroundRefreshConfig {
  enabled: boolean;
  refreshInterval: number; // How often to check for stale data (milliseconds)
  dataStaleThreshold: number; // When data is considered stale (milliseconds)
  retryAttempts: number; // Number of retry attempts on failure
  retryDelay: number; // Delay between retries (milliseconds)
}

interface RefreshStatus {
  lastCheck: number;
  lastRefresh: number;
  nextRefresh: number;
  isRefreshing: boolean;
  errors: string[];
}

// ========================================
// Constants
// ========================================

const DEFAULT_CONFIG: BackgroundRefreshConfig = {
  enabled: true,
  refreshInterval: 5 * 60 * 1000, // Check every 5 minutes
  dataStaleThreshold: 30 * 60 * 1000, // Data is stale after 30 minutes
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds
};

// ========================================
// Background Refresh Service Class
// ========================================

export class BackgroundRefreshService {
  private config: BackgroundRefreshConfig;
  private refreshTimer: number | null = null;
  private isPageVisible: boolean = true;
  private status: RefreshStatus;

  constructor(config: Partial<BackgroundRefreshConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status = {
      lastCheck: 0,
      lastRefresh: 0,
      nextRefresh: Date.now() + this.config.refreshInterval,
      isRefreshing: false,
      errors: [],
    };

    // Listen to page visibility changes
    this.setupVisibilityListener();
  }

  /**
   * Setup listener for page visibility changes
   */
  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;

      if (this.isPageVisible) {
        console.log('[BackgroundRefresh] Page visible, resuming checks...');
        // When page becomes visible, check immediately if data needs refresh
        this.checkAndRefresh();
      } else {
        console.log('[BackgroundRefresh] Page hidden, pausing checks...');
      }
    });
  }

  /**
   * Start background refresh service
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[BackgroundRefresh] Service is disabled');
      return;
    }

    if (this.refreshTimer !== null) {
      console.log('[BackgroundRefresh] Service already running');
      return;
    }

    console.log(`[BackgroundRefresh] Starting service (check every ${this.config.refreshInterval / 1000 / 60} minutes)`);

    // Run initial check
    this.checkAndRefresh();

    // Schedule periodic checks
    this.refreshTimer = window.setInterval(() => {
      if (this.isPageVisible) {
        this.checkAndRefresh();
      }
    }, this.config.refreshInterval);
  }

  /**
   * Stop background refresh service
   */
  stop(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[BackgroundRefresh] Service stopped');
    }
  }

  /**
   * Check if data needs refresh and refresh if necessary
   */
  private async checkAndRefresh(): Promise<void> {
    if (this.status.isRefreshing) {
      console.log('[BackgroundRefresh] Refresh already in progress, skipping...');
      return;
    }

    // Check if user is authenticated before attempting refresh
    const authState = store.getState().auth;
    if (!authState.isAuthenticated || !authState.user) {
      console.log('[BackgroundRefresh] User not authenticated, skipping refresh');
      return;
    }

    this.status.lastCheck = Date.now();

    try {
      const needsRefresh = await this.needsRefresh();

      if (needsRefresh) {
        console.log('[BackgroundRefresh] Data is stale, refreshing in background...');
        await this.refresh();
      } else {
        console.log('[BackgroundRefresh] Data is fresh, no refresh needed');
      }
    } catch (error) {
      console.error('[BackgroundRefresh] Check failed:', error);
      this.status.errors.push(String(error));
      // Keep only last 10 errors
      if (this.status.errors.length > 10) {
        this.status.errors.shift();
      }
    }

    this.status.nextRefresh = Date.now() + this.config.refreshInterval;
  }

  /**
   * Check if data needs refresh
   */
  private async needsRefresh(): Promise<boolean> {
    const now = Date.now();

    // Get last sync timestamp from metadata
    const metadata = await getMetadata();
    const lastSyncTimestamp = metadata?.lastSync || 0;

    if (!lastSyncTimestamp) {
      console.log('[BackgroundRefresh] No previous sync timestamp found');
      return true; // No previous sync, needs refresh
    }

    const dataAge = now - lastSyncTimestamp;
    const isStale = dataAge > this.config.dataStaleThreshold;

    if (isStale) {
      console.log(`[BackgroundRefresh] Data is stale (age: ${Math.round(dataAge / 1000 / 60)} minutes, threshold: ${this.config.dataStaleThreshold / 1000 / 60} minutes)`);
    }

    return isStale;
  }

  /**
   * Refresh monitoring data in background
   */
  private async refresh(): Promise<void> {
    this.status.isRefreshing = true;

    try {
      console.log('[BackgroundRefresh] Starting background data refresh...');

      // Fetch all monitoring data in parallel
      const results = await Promise.allSettled([
        store.dispatch(fetchGroups()).unwrap(),
        store.dispatch(fetchItems({ showOrphans: false })).unwrap(),
        store.dispatch(fetchAlarms()).unwrap(),
      ]);

      // Check results
      const failures: string[] = [];
      results.forEach((result, index) => {
        const dataType = ['groups', 'items', 'alarms'][index];
        if (result.status === 'rejected') {
          console.error(`[BackgroundRefresh] Failed to fetch ${dataType}:`, result.reason);
          failures.push(dataType);
        } else {
          console.log(`[BackgroundRefresh] Successfully refreshed ${dataType}`);
        }
      });

      // If any fetch failed, log but don't throw
      if (failures.length > 0) {
        console.warn(`[BackgroundRefresh] Some data failed to refresh: ${failures.join(', ')}`);
        this.status.errors.push(`Failed to refresh: ${failures.join(', ')}`);
      } else {
        console.log('[BackgroundRefresh] All data refreshed successfully');
        this.status.lastRefresh = Date.now();
        // Update metadata
        updateMetadata({ lastSync: Date.now() });
        
        // Invalidate Service Worker API cache
        // Dynamically import to avoid circular dependencies
        import('../services/cacheCoordinationService').then(({ invalidateApiCache }) => {
          invalidateApiCache().catch((error) => {
            console.warn('[BackgroundRefresh] Failed to invalidate cache:', error);
          });
        });
      }
    } catch (error) {
      console.error('[BackgroundRefresh] Refresh failed:', error);
      this.status.errors.push(String(error));

      // Retry logic
      await this.retryRefresh();
    } finally {
      this.status.isRefreshing = false;
    }
  }

  /**
   * Retry refresh on failure
   */
  private async retryRefresh(): Promise<void> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      console.log(`[BackgroundRefresh] Retry attempt ${attempt}/${this.config.retryAttempts}...`);

      await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay * attempt)); // Exponential backoff

      try {
        await this.refresh();
        console.log(`[BackgroundRefresh] Retry ${attempt} succeeded`);
        return; // Success, exit retry loop
      } catch (error) {
        console.error(`[BackgroundRefresh] Retry ${attempt} failed:`, error);
        if (attempt === this.config.retryAttempts) {
          console.error('[BackgroundRefresh] All retry attempts exhausted');
        }
      }
    }
  }

  /**
   * Force immediate refresh (manual trigger)
   */
  async forceRefresh(): Promise<void> {
    console.log('[BackgroundRefresh] Force refresh requested');
    await this.refresh();
  }

  /**
   * Get current status
   */
  getStatus(): RefreshStatus {
    return { ...this.status };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<BackgroundRefreshConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[BackgroundRefresh] Configuration updated:', this.config);

    // Restart if enabled changed
    if ('enabled' in config) {
      this.stop();
      if (config.enabled) {
        this.start();
      }
    }

    // Restart if refresh interval changed
    if ('refreshInterval' in config && this.refreshTimer !== null) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): BackgroundRefreshConfig {
    return { ...this.config };
  }
}

// ========================================
// Singleton Instance
// ========================================

let refreshServiceInstance: BackgroundRefreshService | null = null;

/**
 * Get the singleton background refresh service instance
 */
export function getBackgroundRefreshService(): BackgroundRefreshService {
  if (!refreshServiceInstance) {
    refreshServiceInstance = new BackgroundRefreshService();
  }
  return refreshServiceInstance;
}

/**
 * Initialize and start the background refresh service
 */
export function initBackgroundRefresh(config?: Partial<BackgroundRefreshConfig>): BackgroundRefreshService {
  const service = getBackgroundRefreshService();
  if (config) {
    service.updateConfig(config);
  }
  service.start();
  return service;
}

export default getBackgroundRefreshService;
