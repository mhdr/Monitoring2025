/**
 * Helper functions for managing monitoring data in IndexedDB with TTL support
 * Stores groups, items, and alarms data for persistence across tabs and sessions
 * 
 * Features:
 * - TTL (Time To Live) for automatic data expiration
 * - Automatic cleanup of expired data
 * - Cross-tab support via BroadcastChannel
 * - Persistence across browser sessions
 * - Storage quota monitoring
 * - Better storage limits (50MB+ vs localStorage's 5-10MB)
 * 
 * Note: Using IndexedDB to support:
 * - Opening items in new tabs (each tab can access the same data)
 * - Persistence across browser sessions (better UX, no re-sync after restart)
 * - Larger storage capacity for complex monitoring data
 */

import type { Group, Item, AlarmDto } from '../types/api';
import type { GroupsResponseDto, ItemsResponseDto, AlarmsResponseDto } from '../types/api';
import { getItem, setItem, removeItem, getStorageEstimate } from './indexedDbStorage';

// IndexedDB keys for monitoring data
const MONITORING_GROUPS_KEY = 'monitoring_groups';
const MONITORING_ITEMS_KEY = 'monitoring_items';
const MONITORING_ALARMS_KEY = 'monitoring_alarms';
const MONITORING_METADATA_KEY = 'monitoring_metadata';

/**
 * TTL configuration (in milliseconds)
 */
export const TTL_CONFIG = {
  GROUPS: 24 * 60 * 60 * 1000, // 24 hours
  ITEMS: 24 * 60 * 60 * 1000,  // 24 hours
  ALARMS: 24 * 60 * 60 * 1000, // 24 hours
  DEFAULT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Metadata stored in IndexedDB
 */
interface StorageMetadata {
  lastSync: number;
  lastCleanup: number;
  version: string;
}

/**
 * Interface for monitoring data storage helpers
 */
export interface MonitoringStorageHelpers {
  // Groups data
  getStoredGroups: () => Promise<Group[] | null>;
  setStoredGroups: (groups: Group[]) => Promise<void>;
  clearStoredGroups: () => Promise<void>;
  
  // Items data
  getStoredItems: () => Promise<Item[] | null>;
  setStoredItems: (items: Item[]) => Promise<void>;
  clearStoredItems: () => Promise<void>;
  
  // Alarms data
  getStoredAlarms: () => Promise<AlarmDto[] | null>;
  setStoredAlarms: (alarms: AlarmDto[]) => Promise<void>;
  clearStoredAlarms: () => Promise<void>;
  
  // Utility functions
  clearAllMonitoringData: () => Promise<void>;
  hasStoredData: () => Promise<boolean>;
}

/**
 * Helper function to safely get item from IndexedDB
 */
const safeGetItem = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await getItem<T>(key);
    
    if (!data) {
      console.info(`[MonitoringStorage] No data found for ${key}`);
      return null;
    }
    
    console.info(`[MonitoringStorage] Retrieved ${key} from IndexedDB:`, {
      key,
      hasData: !!data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      timestamp: new Date().toISOString()
    });
    
    return data;
  } catch (error) {
    console.warn(`Failed to get ${key} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Helper function to safely set item in IndexedDB with TTL
 */
const safeSetItem = async (key: string, data: unknown, ttl: number = TTL_CONFIG.DEFAULT): Promise<void> => {
  try {
    await setItem(key, data, ttl);
    console.info(`[MonitoringStorage] Stored ${key} in IndexedDB:`, {
      key,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      ttl: `${ttl / 1000 / 60} minutes`,
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn(`Failed to store ${key} in IndexedDB:`, error);
    throw error;
  }
};

/**
 * Helper function to safely remove item from IndexedDB
 */
const safeRemoveItem = async (key: string): Promise<void> => {
  try {
    await removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove ${key} from IndexedDB:`, error);
  }
};

/**
 * Monitoring data storage helpers
 */
export const monitoringStorageHelpers: MonitoringStorageHelpers = {
  /**
   * Get stored groups data from IndexedDB (with TTL check)
   */
  getStoredGroups: async (): Promise<Group[] | null> => {
    return await safeGetItem<Group[]>(MONITORING_GROUPS_KEY);
  },

  /**
   * Store groups data in IndexedDB (with TTL)
   */
  setStoredGroups: async (groups: Group[]): Promise<void> => {
    await safeSetItem(MONITORING_GROUPS_KEY, groups, TTL_CONFIG.GROUPS);
  },

  /**
   * Clear stored groups data from IndexedDB
   */
  clearStoredGroups: async (): Promise<void> => {
    await safeRemoveItem(MONITORING_GROUPS_KEY);
  },

  /**
   * Get stored items data from IndexedDB (with TTL check)
   */
  getStoredItems: async (): Promise<Item[] | null> => {
    return await safeGetItem<Item[]>(MONITORING_ITEMS_KEY);
  },

  /**
   * Store items data in IndexedDB (with TTL)
   */
  setStoredItems: async (items: Item[]): Promise<void> => {
    await safeSetItem(MONITORING_ITEMS_KEY, items, TTL_CONFIG.ITEMS);
  },

  /**
   * Clear stored items data from IndexedDB
   */
  clearStoredItems: async (): Promise<void> => {
    await safeRemoveItem(MONITORING_ITEMS_KEY);
  },

  /**
   * Get stored alarms data from IndexedDB (with TTL check)
   */
  getStoredAlarms: async (): Promise<AlarmDto[] | null> => {
    return await safeGetItem<AlarmDto[]>(MONITORING_ALARMS_KEY);
  },

  /**
   * Store alarms data in IndexedDB (with TTL)
   */
  setStoredAlarms: async (alarms: AlarmDto[]): Promise<void> => {
    await safeSetItem(MONITORING_ALARMS_KEY, alarms, TTL_CONFIG.ALARMS);
  },

  /**
   * Clear stored alarms data from IndexedDB
   */
  clearStoredAlarms: async (): Promise<void> => {
    await safeRemoveItem(MONITORING_ALARMS_KEY);
  },

  /**
   * Clear all stored monitoring data from IndexedDB
   */
  clearAllMonitoringData: async (): Promise<void> => {
    await safeRemoveItem(MONITORING_GROUPS_KEY);
    await safeRemoveItem(MONITORING_ITEMS_KEY);
    await safeRemoveItem(MONITORING_ALARMS_KEY);
  },

  /**
   * Check if any monitoring data is stored in IndexedDB
   */
  hasStoredData: async (): Promise<boolean> => {
    const groups = await safeGetItem<Group[]>(MONITORING_GROUPS_KEY);
    const items = await safeGetItem<Item[]>(MONITORING_ITEMS_KEY);
    const alarms = await safeGetItem<AlarmDto[]>(MONITORING_ALARMS_KEY);
    return !!(groups || items || alarms);
  },
};

/**
 * Clean up expired data from IndexedDB
 * Note: IndexedDB utility already handles TTL expiration on get,
 * but this provides explicit cleanup
 */
export const cleanupExpiredData = async (): Promise<void> => {
  try {
    // IndexedDB cleanupExpired function handles this automatically
    const { cleanupExpired: cleanupIndexedDB } = await import('./indexedDbStorage');
    const cleanedCount = await cleanupIndexedDB();
    
    if (cleanedCount > 0) {
      await updateMetadata({ lastCleanup: Date.now() });
      console.info(`[MonitoringStorage] Cleanup completed: removed ${cleanedCount} expired items`);
    }
  } catch (error) {
    console.warn('[MonitoringStorage] Error during cleanup:', error);
  }
};

/**
 * Get storage metadata
 */
export const getMetadata = async (): Promise<StorageMetadata | null> => {
  try {
    return await getItem<StorageMetadata>(MONITORING_METADATA_KEY);
  } catch (error) {
    console.warn('[MonitoringStorage] Error getting metadata:', error);
    return null;
  }
};

/**
 * Update storage metadata
 */
export const updateMetadata = async (updates: Partial<StorageMetadata>): Promise<void> => {
  try {
    const current = (await getMetadata()) || {
      lastSync: 0,
      lastCleanup: 0,
      version: '1.0.0',
    };
    
    const updated = { ...current, ...updates };
    await setItem(MONITORING_METADATA_KEY, updated);
    console.info('[MonitoringStorage] Updated metadata:', updated);
  } catch (error) {
    console.warn('[MonitoringStorage] Error updating metadata:', error);
  }
};

/**
 * Get storage size estimate
 */
export const getStorageSize = async (): Promise<{ used: number; available: number; percentage: number }> => {
  try {
    const estimate = await getStorageEstimate();
    return {
      used: estimate.usage,
      available: estimate.quota,
      percentage: estimate.percentage,
    };
  } catch (error) {
    console.warn('[MonitoringStorage] Error calculating storage size:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
};

/**
 * Initialize automatic cleanup (call once on app start)
 * Note: IndexedDB utility also runs its own cleanup
 */
export const initAutoCleanup = async (): Promise<void> => {
  // Run initial cleanup
  await cleanupExpiredData();
  
  // Schedule periodic cleanup (every hour)
  setInterval(() => {
    cleanupExpiredData().catch((error) => 
      console.error('[MonitoringStorage] Auto-cleanup failed:', error)
    );
  }, 60 * 60 * 1000);
  
  console.info('[MonitoringStorage] Auto-cleanup initialized (runs every hour)');
};

/**
 * Helper function to store response data from RTK Query endpoints
 * Used in transformResponse functions to automatically persist data
 */
export const storeMonitoringResponseData = {
  /**
   * Store groups response data
   */
  storeGroupsResponse: (response: GroupsResponseDto): GroupsResponseDto => {
    console.info('[MonitoringStorage] Processing groups response for storage:', {
      hasGroups: !!response.groups,
      groupsCount: response.groups?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (response.groups) {
      // Store asynchronously without blocking
      monitoringStorageHelpers.setStoredGroups(response.groups).catch((error) => 
        console.error('[MonitoringStorage] Failed to store groups:', error)
      );
    }
    return response;
  },

  /**
   * Store items response data
   */
  storeItemsResponse: (response: ItemsResponseDto): ItemsResponseDto => {
    console.info('[MonitoringStorage] Processing items response for storage:', {
      hasItems: !!response.items,
      itemsCount: response.items?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (response.items) {
      // Store asynchronously without blocking
      monitoringStorageHelpers.setStoredItems(response.items).catch((error) => 
        console.error('[MonitoringStorage] Failed to store items:', error)
      );
    }
    return response;
  },

  /**
   * Store alarms response data
   */
  storeAlarmsResponse: (response: AlarmsResponseDto): AlarmsResponseDto => {
    console.info('[MonitoringStorage] Processing alarms response for storage:', {
      hasAlarms: !!response.data,
      alarmsCount: response.data?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (response.data) {
      // Store asynchronously without blocking
      monitoringStorageHelpers.setStoredAlarms(response.data).catch((error) => 
        console.error('[MonitoringStorage] Failed to store alarms:', error)
      );
    }
    return response;
  },
};