/**
 * Cache Coordination Service
 * 
 * Coordinates between IndexedDB TTL system and Service Worker runtime caching.
 * 
 * Key Responsibilities:
 * - Listens for IndexedDB changes via BroadcastChannel and invalidates Service Worker caches
 * - Sends messages to Service Worker to clear API caches when data updates
 * - Prevents stale data in Service Worker cache when IndexedDB data is refreshed
 * 
 * Integration:
 * - Works with monitoringStorage.ts (TTL system) and indexedDbStorage.ts (BroadcastChannel)
 * - Communicates with Service Worker via postMessage
 * - Triggered by background refresh and manual sync operations
 */

import type { Workbox } from 'workbox-window';
import { onStorageChange } from '../utils/indexedDbStorage';

/**
 * Storage keys that require cache invalidation when updated
 */
const MONITORING_STORAGE_KEYS = [
  'monitoring_groups',
  'monitoring_items',
  'monitoring_active_alarms',
  'monitoring_metadata',
] as const;

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
      console.warn('[CacheCoordination] Already initialized');
      return;
    }

    this.workbox = workbox;
    this.setupStorageListener();
    this.isInitialized = true;
    
    console.log('[CacheCoordination] Service initialized');
  }

  /**
   * Setup IndexedDB change listener for cross-tab cache invalidation
   * Uses BroadcastChannel for synchronization across tabs
   */
  private setupStorageListener(): void {
    // Listen for IndexedDB changes from other tabs via BroadcastChannel
    this.storageChangeCleanup = onStorageChange((key, action) => {
      // Check if the updated key is a monitoring data key
      const isMonitoringKey = MONITORING_STORAGE_KEYS.some(monitoringKey => 
        key.startsWith(monitoringKey)
      );

      if (isMonitoringKey) {
        console.log(`[CacheCoordination] IndexedDB ${action}: ${key}, invalidating caches`);
        this.invalidateApiCache();
      }
    });

    console.log('[CacheCoordination] IndexedDB change listener registered via BroadcastChannel');
  }

  /**
   * Manually invalidate API cache
   * Called after data updates (sync, background refresh)
   */
  async invalidateApiCache(endpoints: string[] = [...API_ENDPOINTS_TO_CLEAR]): Promise<void> {
    if (!this.workbox) {
      console.warn('[CacheCoordination] Workbox not available, skipping cache invalidation');
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
      console.log('[CacheCoordination] API cache invalidation requested');
    } catch (error) {
      console.error('[CacheCoordination] Failed to invalidate API cache:', error);
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
      console.warn('[CacheCoordination] No active service worker');
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

      console.log('[CacheCoordination] All runtime caches cleared');
    } catch (error) {
      console.error('[CacheCoordination] Failed to clear runtime caches:', error);
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
    
    console.log('[CacheCoordination] Service destroyed');
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
