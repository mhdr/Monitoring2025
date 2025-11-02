/**
 * Cache Coordination Service
 * 
 * Coordinates between localStorage and Service Worker runtime caching.
 * 
 * Key Responsibilities:
 * - Monitors Zustand store updates and invalidates Service Worker caches
 * - Sends messages to Service Worker to clear API caches when data updates
 * - Prevents stale data in Service Worker cache when store data is refreshed
 * 
 * Integration:
 * - Works with Zustand stores (monitoringStore, authStore)
 * - Communicates with Service Worker via postMessage
 * - Triggered by background refresh and manual sync operations
 */

import type { Workbox } from 'workbox-window';
import { createLogger } from '../utils/logger';

const logger = createLogger('CacheCoordination');

/**
 * Storage keys that require cache invalidation when updated
 * (No longer used with Zustand - kept for reference)
 */

/**
 * API endpoints to clear from Service Worker cache when storage updates
 */
const API_ENDPOINTS_TO_CLEAR = [
  '/api/groups',
  '/api/items',
  '/api/alarms/active',
] as const;

/**
 * Message types for Service Worker communication
 */
type CacheMessage = {
  type: 'CLEAR_API_CACHE';
  endpoints?: string[];
  cacheName?: string;
};

/**
 * Cache Coordination Service
 * Singleton service that coordinates localStorage and Service Worker caching
 */
class CacheCoordinationService {
  private static instance: CacheCoordinationService | null = null;
  private workbox: Workbox | null = null;
  private isInitialized = false;
  private storageChangeCleanup: (() => void) | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CacheCoordinationService {
    if (!CacheCoordinationService.instance) {
      CacheCoordinationService.instance = new CacheCoordinationService();
    }
    return CacheCoordinationService.instance;
  }

  /**
   * Initialize the cache coordination service
   * @param workbox - Workbox instance from vite-plugin-pwa
   */
  initialize(workbox: Workbox | null): void {
    if (this.isInitialized) {
      logger.warn('Already initialized');
      return;
    }

    this.workbox = workbox;
    this.setupStorageListener();
    this.isInitialized = true;
    
    logger.log('Service initialized');
  }

  /**
   * Setup storage change listener for cache invalidation
   * 
   * Note: With Zustand + localStorage, cross-tab sync is automatic via the 'storage' event.
   * We don't need explicit BroadcastChannel coordination.
   */
  private setupStorageListener(): void {
    // Listen for localStorage storage events (cross-tab sync)
    const handleStorageChange = (event: StorageEvent): void => {
      // Check if this is a monitoring store update
      if (event.key && event.key.includes('monitoring-storage')) {
        logger.log(`Storage changed: ${event.key}, invalidating caches`);
        this.invalidateApiCache();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    this.storageChangeCleanup = () => {
      window.removeEventListener('storage', handleStorageChange);
    };

    logger.log('Storage change listener registered');
  }

  /**
   * Manually invalidate API cache
   * Called after data updates (sync, background refresh)
   */
  async invalidateApiCache(endpoints: string[] = [...API_ENDPOINTS_TO_CLEAR]): Promise<void> {
    if (!this.workbox) {
      logger.warn('Workbox not available, skipping cache invalidation');
      return;
    }

    try {
      // Send message to Service Worker to clear API cache
      const message: CacheMessage = {
        type: 'CLEAR_API_CACHE',
        endpoints,
        cacheName: 'api-cache',
      };

      await this.sendMessageToSW(message);
      logger.log('API cache invalidation requested');
    } catch (error) {
      logger.error('Failed to invalidate API cache:', error);
    }
  }

  /**
   * Send message to Service Worker
   */
  private async sendMessageToSW(message: CacheMessage): Promise<void> {
    if (!this.workbox) {
      throw new Error('Workbox not available');
    }

    // Get active service worker
    const registration = await navigator.serviceWorker?.getRegistration();
    if (!registration?.active) {
      logger.warn('No active service worker');
      return;
    }

    // Send message via MessageChannel for response handling
    const messageChannel = new MessageChannel();
    
    return new Promise((resolve, reject) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve();
        }
      };

      registration.active?.postMessage(message, [messageChannel.port2]);
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(), 5000);
    });
  }

  /**
   * Clear all runtime caches (emergency cleanup)
   */
  async clearAllRuntimeCaches(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      const runtimeCaches = cacheNames.filter(name => 
        name.includes('api-cache') || 
        name.includes('runtime')
      );

      await Promise.all(
        runtimeCaches.map(cacheName => caches.delete(cacheName))
      );

      logger.log('All runtime caches cleared');
    } catch (error) {
      logger.error('Failed to clear runtime caches:', error);
    }
  }

  /**
   * Cleanup and remove listeners
   */
  destroy(): void {
    if (this.storageChangeCleanup) {
      this.storageChangeCleanup();
      this.storageChangeCleanup = null;
    }

    this.workbox = null;
    this.isInitialized = false;
    
    logger.log('Service destroyed');
  }
}

// Export singleton instance
export const cacheCoordinationService = CacheCoordinationService.getInstance();

/**
 * Initialize cache coordination with Workbox instance
 * Call this from main.tsx after Service Worker registration
 */
export function initCacheCoordination(workbox: Workbox | null): void {
  cacheCoordinationService.initialize(workbox);
}

/**
 * Invalidate API cache after data updates
 * Call this after successful sync or background refresh
 */
export async function invalidateApiCache(): Promise<void> {
  await cacheCoordinationService.invalidateApiCache();
}

/**
 * Clear all runtime caches (emergency cleanup)
 */
export async function clearAllRuntimeCaches(): Promise<void> {
  await cacheCoordinationService.clearAllRuntimeCaches();
}

