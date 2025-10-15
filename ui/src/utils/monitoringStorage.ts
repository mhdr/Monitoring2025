/**
 * Helper functions for managing monitoring data in localStorage with TTL support
 * Stores groups, items, and alarms data for persistence across tabs and sessions
 * 
 * Features:
 * - TTL (Time To Live) for automatic data expiration
 * - Automatic cleanup of expired data
 * - Cross-tab support via localStorage
 * - Persistence across browser sessions
 * - Storage quota monitoring
 * 
 * Note: Using localStorage instead of sessionStorage to support:
 * - Opening items in new tabs (each tab can access the same data)
 * - Persistence across browser sessions (better UX, no re-sync after restart)
 */

import type { Group, Item, AlarmDto } from '../types/api';
import type { GroupsResponseDto, ItemsResponseDto, AlarmsResponseDto } from '../types/api';

// localStorage keys for monitoring data
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
 * Data with TTL metadata
 */
interface TimestampedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
  expiresAt: number;
}

/**
 * Metadata stored in localStorage
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
  getStoredGroups: () => Group[] | null;
  setStoredGroups: (groups: Group[]) => void;
  clearStoredGroups: () => void;
  
  // Items data
  getStoredItems: () => Item[] | null;
  setStoredItems: (items: Item[]) => void;
  clearStoredItems: () => void;
  
  // Alarms data
  getStoredAlarms: () => AlarmDto[] | null;
  setStoredAlarms: (alarms: AlarmDto[]) => void;
  clearStoredAlarms: () => void;
  
  // Utility functions
  clearAllMonitoringData: () => void;
  hasStoredData: () => boolean;
}

/**
 * Helper function to safely parse JSON from localStorage
 */
const safeParseJSON = <T>(data: string | null): T | null => {
  if (!data) return null;
  
  try {
    return JSON.parse(data) as T;
  } catch (error) {
    console.warn('Failed to parse stored monitoring data:', error);
    return null;
  }
};

/**
 * Wrap data with TTL metadata
 */
const wrapWithTTL = <T>(data: T, ttl: number): TimestampedData<T> => {
  const timestamp = Date.now();
  return {
    data,
    timestamp,
    ttl,
    expiresAt: timestamp + ttl,
  };
};

/**
 * Check if data has expired
 */
const isExpired = (timestampedData: TimestampedData<unknown>): boolean => {
  return Date.now() > timestampedData.expiresAt;
};

/**
 * Unwrap data and check expiration
 */
const unwrapWithTTL = <T>(wrapped: TimestampedData<T> | null): T | null => {
  if (!wrapped) return null;
  
  if (isExpired(wrapped)) {
    console.info('[MonitoringStorage] Data expired, returning null');
    return null;
  }
  
  const remainingTime = wrapped.expiresAt - Date.now();
  const remainingMinutes = Math.round(remainingTime / 1000 / 60);
  console.info(`[MonitoringStorage] Data valid, expires in ${remainingMinutes} minutes`);
  
  return wrapped.data;
};

/**
 * Helper function to safely stringify and store data in localStorage with TTL
 */
const safeSetItem = (key: string, data: unknown, ttl: number = TTL_CONFIG.DEFAULT): void => {
  try {
    const wrappedData = wrapWithTTL(data, ttl);
    const jsonData = JSON.stringify(wrappedData);
    localStorage.setItem(key, jsonData);
    console.info(`[MonitoringStorage] Stored ${key} in localStorage:`, {
      key,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      storageSize: jsonData.length,
      ttl: `${ttl / 1000 / 60} minutes`,
      expiresAt: new Date(wrappedData.expiresAt).toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn(`Failed to store ${key} in localStorage:`, error);
    
    // If quota exceeded, try cleanup and retry once
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[MonitoringStorage] Storage quota exceeded, cleaning up expired data...');
      cleanupExpiredData();
      try {
        const wrappedData = wrapWithTTL(data, ttl);
        const jsonData = JSON.stringify(wrappedData);
        localStorage.setItem(key, jsonData);
        console.info(`[MonitoringStorage] Retry successful after cleanup`);
      } catch (retryError) {
        console.error(`[MonitoringStorage] Retry failed:`, retryError);
      }
    }
  }
};

/**
 * Helper function to safely remove item from localStorage
 */
const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove ${key} from localStorage:`, error);
  }
};

/**
 * Helper function to safely get item from localStorage and check TTL
 */
const safeGetItem = <T>(key: string): T | null => {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      console.info(`[MonitoringStorage] No data found for ${key}`);
      return null;
    }
    
    const wrappedData = safeParseJSON<TimestampedData<T>>(data);
    const unwrappedData = unwrapWithTTL(wrappedData);
    
    // If data expired, remove it
    if (wrappedData && !unwrappedData) {
      console.info(`[MonitoringStorage] Removing expired ${key}`);
      localStorage.removeItem(key);
    }
    
    console.info(`[MonitoringStorage] Retrieved ${key} from localStorage:`, {
      key,
      hasData: !!unwrappedData,
      dataLength: Array.isArray(unwrappedData) ? unwrappedData.length : 'N/A',
      timestamp: new Date().toISOString()
    });
    
    return unwrappedData;
  } catch (error) {
    console.warn(`Failed to get ${key} from localStorage:`, error);
    return null;
  }
};

/**
 * Monitoring data storage helpers
 */
export const monitoringStorageHelpers: MonitoringStorageHelpers = {
  /**
   * Get stored groups data from localStorage (with TTL check)
   */
  getStoredGroups: (): Group[] | null => {
    return safeGetItem<Group[]>(MONITORING_GROUPS_KEY);
  },

  /**
   * Store groups data in localStorage (with TTL)
   */
  setStoredGroups: (groups: Group[]): void => {
    safeSetItem(MONITORING_GROUPS_KEY, groups, TTL_CONFIG.GROUPS);
  },

  /**
   * Clear stored groups data from sessionStorage
   */
  clearStoredGroups: (): void => {
    safeRemoveItem(MONITORING_GROUPS_KEY);
  },

  /**
   * Get stored items data from localStorage (with TTL check)
   */
  getStoredItems: (): Item[] | null => {
    return safeGetItem<Item[]>(MONITORING_ITEMS_KEY);
  },

  /**
   * Store items data in localStorage (with TTL)
   */
  setStoredItems: (items: Item[]): void => {
    safeSetItem(MONITORING_ITEMS_KEY, items, TTL_CONFIG.ITEMS);
  },

  /**
   * Clear stored items data from sessionStorage
   */
  clearStoredItems: (): void => {
    safeRemoveItem(MONITORING_ITEMS_KEY);
  },

  /**
   * Get stored alarms data from localStorage (with TTL check)
   */
  getStoredAlarms: (): AlarmDto[] | null => {
    return safeGetItem<AlarmDto[]>(MONITORING_ALARMS_KEY);
  },

  /**
   * Store alarms data in localStorage (with TTL)
   */
  setStoredAlarms: (alarms: AlarmDto[]): void => {
    safeSetItem(MONITORING_ALARMS_KEY, alarms, TTL_CONFIG.ALARMS);
  },

  /**
   * Clear stored alarms data from sessionStorage
   */
  clearStoredAlarms: (): void => {
    safeRemoveItem(MONITORING_ALARMS_KEY);
  },

  /**
   * Clear all stored monitoring data from sessionStorage
   */
  clearAllMonitoringData: (): void => {
    safeRemoveItem(MONITORING_GROUPS_KEY);
    safeRemoveItem(MONITORING_ITEMS_KEY);
    safeRemoveItem(MONITORING_ALARMS_KEY);
  },

  /**
   * Check if any monitoring data is stored in localStorage
   */
  hasStoredData: (): boolean => {
    return !!(
      safeGetItem<Group[]>(MONITORING_GROUPS_KEY) ||
      safeGetItem<Item[]>(MONITORING_ITEMS_KEY) ||
      safeGetItem<AlarmDto[]>(MONITORING_ALARMS_KEY)
    );
  },
};

/**
 * Clean up expired data from localStorage
 */
export const cleanupExpiredData = (): void => {
  const keys = [MONITORING_GROUPS_KEY, MONITORING_ITEMS_KEY, MONITORING_ALARMS_KEY];
  let cleanedCount = 0;
  
  keys.forEach((key) => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const wrappedData = safeParseJSON<TimestampedData<unknown>>(data);
        if (wrappedData && isExpired(wrappedData)) {
          localStorage.removeItem(key);
          cleanedCount++;
          console.info(`[MonitoringStorage] Cleaned up expired ${key}`);
        }
      }
    } catch (error) {
      console.warn(`[MonitoringStorage] Error cleaning up ${key}:`, error);
    }
  });
  
  if (cleanedCount > 0) {
    updateMetadata({ lastCleanup: Date.now() });
    console.info(`[MonitoringStorage] Cleanup completed: removed ${cleanedCount} expired items`);
  }
};

/**
 * Get storage metadata
 */
export const getMetadata = (): StorageMetadata | null => {
  try {
    const data = localStorage.getItem(MONITORING_METADATA_KEY);
    return data ? safeParseJSON<StorageMetadata>(data) : null;
  } catch (error) {
    console.warn('[MonitoringStorage] Error getting metadata:', error);
    return null;
  }
};

/**
 * Update storage metadata
 */
export const updateMetadata = (updates: Partial<StorageMetadata>): void => {
  try {
    const current = getMetadata() || {
      lastSync: 0,
      lastCleanup: 0,
      version: '1.0.0',
    };
    
    const updated = { ...current, ...updates };
    localStorage.setItem(MONITORING_METADATA_KEY, JSON.stringify(updated));
    console.info('[MonitoringStorage] Updated metadata:', updated);
  } catch (error) {
    console.warn('[MonitoringStorage] Error updating metadata:', error);
  }
};

/**
 * Get storage size estimate
 */
export const getStorageSize = (): { used: number; available: number; percentage: number } => {
  try {
    let used = 0;
    for (const key in localStorage) {
      if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
        used += localStorage[key].length + key.length;
      }
    }
    
    // Most browsers allow 5-10MB for localStorage
    const available = 10 * 1024 * 1024; // 10MB estimate
    const percentage = (used / available) * 100;
    
    return { used, available, percentage };
  } catch (error) {
    console.warn('[MonitoringStorage] Error calculating storage size:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
};

/**
 * Initialize automatic cleanup (call once on app start)
 */
export const initAutoCleanup = (): void => {
  // Run initial cleanup
  cleanupExpiredData();
  
  // Schedule periodic cleanup (every hour)
  setInterval(() => {
    cleanupExpiredData();
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
      monitoringStorageHelpers.setStoredGroups(response.groups);
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
      monitoringStorageHelpers.setStoredItems(response.items);
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
      monitoringStorageHelpers.setStoredAlarms(response.data);
    }
    return response;
  },
};