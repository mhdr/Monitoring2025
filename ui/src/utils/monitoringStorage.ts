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
import { createLogger } from './logger';

const logger = createLogger('MonitoringStorage');

// IndexedDB keys for monitoring data
const MONITORING_GROUPS_KEY = 'monitoring_groups';
const MONITORING_ITEMS_KEY = 'monitoring_items';
const MONITORING_ALARMS_KEY = 'monitoring_alarms';
const MONITORING_METADATA_KEY = 'monitoring_metadata';
const NOTIFICATION_PREFERENCES_KEY = 'notification_preferences';

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
 * Notification preferences interface
 */
export interface NotificationPreferences {
  enabled: boolean;
  lastUpdated: number;
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
      logger.info(`No data found for ${key}`);
      return null;
    }
    
    logger.info(`Retrieved ${key} from IndexedDB:`, {
      key,
      hasData: !!data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      timestamp: new Date().toISOString()
    });
    
    return data;
  } catch (error) {
    logger.warn(`Failed to get ${key} from IndexedDB:`, error);
    return null;
  }
};

/**
 * Helper function to safely set item in IndexedDB with TTL
 */
const safeSetItem = async (key: string, data: unknown, ttl: number = TTL_CONFIG.DEFAULT): Promise<void> => {
  try {
    await setItem(key, data, ttl);
    logger.info(`Stored ${key} in IndexedDB:`, {
      key,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      ttl: `${ttl / 1000 / 60} minutes`,
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.warn(`Failed to store ${key} in IndexedDB:`, error);
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
    logger.warn(`Failed to remove ${key} from IndexedDB:`, error);
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
      logger.info(`Cleanup completed: removed ${cleanedCount} expired items`);
    }
  } catch (error) {
    logger.warn('Error during cleanup:', error);
  }
};

/**
 * Get storage metadata
 */
export const getMetadata = async (): Promise<StorageMetadata | null> => {
  try {
    return await getItem<StorageMetadata>(MONITORING_METADATA_KEY);
  } catch (error) {
    logger.warn('Error getting metadata:', error);
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
    logger.info('Updated metadata:', updated);
  } catch (error) {
    logger.warn('Error updating metadata:', error);
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
    logger.warn('Error calculating storage size:', error);
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
      logger.error('Auto-cleanup failed:', error)
    );
  }, 60 * 60 * 1000);
  
  logger.info('Auto-cleanup initialized (runs every hour)');
};

/**
 * Extract itemIds from stored items in IndexedDB
 * Returns array of item IDs that the user has access to
 * 
 * @returns Promise<string[] | null> - Array of item IDs, or null if no items stored
 * 
 * @example
 * // Get all accessible itemIds
 * const itemIds = await getStoredItemIds();
 * if (itemIds) {
 *   // Use itemIds for API calls
 *   const alarms = await getAlarms({ itemIds });
 * }
 */
export const getStoredItemIds = async (): Promise<string[] | null> => {
  try {
    const storedItems = await monitoringStorageHelpers.getStoredItems();
    
    if (!storedItems || storedItems.length === 0) {
      logger.info('No stored items found in IndexedDB');
      return null;
    }
    
    const itemIds = storedItems.map(item => item.id);
    logger.log('Extracted itemIds from IndexedDB:', { 
      count: itemIds.length,
      itemIds 
    });
    
    return itemIds;
  } catch (error) {
    logger.error('Failed to extract itemIds from IndexedDB:', error);
    return null;
  }
};

/**
 * Extract groupIds from stored groups in IndexedDB
 * Returns array of group IDs that the user has access to
 * 
 * @returns Promise<string[] | null> - Array of group IDs, or null if no groups stored
 * 
 * @example
 * // Get all accessible groupIds
 * const groupIds = await getStoredGroupIds();
 * if (groupIds) {
 *   // Use groupIds for filtering or API calls
 *   console.log(`User has access to ${groupIds.length} groups`);
 * }
 */
export const getStoredGroupIds = async (): Promise<string[] | null> => {
  try {
    const storedGroups = await monitoringStorageHelpers.getStoredGroups();
    
    if (!storedGroups || storedGroups.length === 0) {
      logger.info('No stored groups found in IndexedDB');
      return null;
    }
    
    const groupIds = storedGroups.map(group => group.id);
    logger.log('Extracted groupIds from IndexedDB:', { 
      count: groupIds.length,
      groupIds 
    });
    
    return groupIds;
  } catch (error) {
    logger.error('Failed to extract groupIds from IndexedDB:', error);
    return null;
  }
};

/**
 * Extract alarmIds from stored alarms in IndexedDB
 * Returns array of alarm IDs that the user has access to
 * 
 * @returns Promise<string[] | null> - Array of alarm IDs, or null if no alarms stored
 * 
 * @example
 * // Get all accessible alarmIds
 * const alarmIds = await getStoredAlarmIds();
 * if (alarmIds) {
 *   // Use alarmIds for filtering or operations
 *   console.log(`Found ${alarmIds.length} configured alarms`);
 * }
 */
export const getStoredAlarmIds = async (): Promise<string[] | null> => {
  try {
    const storedAlarms = await monitoringStorageHelpers.getStoredAlarms();
    
    if (!storedAlarms || storedAlarms.length === 0) {
      logger.info('No stored alarms found in IndexedDB');
      return null;
    }
    
    // Filter out alarms without IDs and map to string array
    const alarmIds = storedAlarms
      .filter(alarm => alarm.id != null)
      .map(alarm => alarm.id as string);
    
    if (alarmIds.length === 0) {
      logger.warn('Stored alarms found but none have valid IDs');
      return null;
    }
    
    logger.log('Extracted alarmIds from IndexedDB:', { 
      count: alarmIds.length,
      alarmIds 
    });
    
    return alarmIds;
  } catch (error) {
    logger.error('Failed to extract alarmIds from IndexedDB:', error);
    return null;
  }
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
    logger.info('Processing groups response for storage:', {
      hasGroups: !!response.groups,
      groupsCount: response.groups?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (response.groups) {
      // Store asynchronously without blocking
      monitoringStorageHelpers.setStoredGroups(response.groups).catch((error) => 
        logger.error('Failed to store groups:', error)
      );
    }
    return response;
  },

  /**
   * Store items response data
   */
  storeItemsResponse: (response: ItemsResponseDto): ItemsResponseDto => {
    logger.info('Processing items response for storage:', {
      hasItems: !!response.items,
      itemsCount: response.items?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (response.items) {
      // Store asynchronously without blocking
      monitoringStorageHelpers.setStoredItems(response.items).catch((error) => 
        logger.error('Failed to store items:', error)
      );
    }
    return response;
  },

  /**
   * Store alarms response data
   */
  storeAlarmsResponse: (response: AlarmsResponseDto): AlarmsResponseDto => {
    logger.info('Processing alarms response for storage:', {
      hasAlarms: !!response.data,
      alarmsCount: response.data?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    if (response.data) {
      // Store asynchronously without blocking
      monitoringStorageHelpers.setStoredAlarms(response.data).catch((error) => 
        logger.error('Failed to store alarms:', error)
      );
    }
    return response;
  },
};

/**
 * Get notification preferences from IndexedDB
 * Returns default preferences if none exist
 * 
 * @returns Promise<NotificationPreferences> - Notification preferences with enabled status and timestamp
 * 
 * @example
 * const prefs = await getNotificationPreferences();
 * if (prefs.enabled) {
 *   // Show notifications
 * }
 */
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  try {
    const preferences = await safeGetItem<NotificationPreferences>(NOTIFICATION_PREFERENCES_KEY);
    
    if (preferences) {
      logger.log('Retrieved notification preferences from IndexedDB:', preferences);
      return preferences;
    }
    
    // Return default preferences if none exist
    const defaultPreferences: NotificationPreferences = {
      enabled: false,
      lastUpdated: Date.now(),
    };
    
    logger.log('No notification preferences found, returning defaults:', defaultPreferences);
    return defaultPreferences;
  } catch (error) {
    logger.error('Failed to get notification preferences:', error);
    
    // Return safe defaults on error
    return {
      enabled: false,
      lastUpdated: Date.now(),
    };
  }
};

/**
 * Save notification preferences to IndexedDB
 * 
 * @param preferences - Notification preferences to save
 * 
 * @example
 * await saveNotificationPreferences({ enabled: true, lastUpdated: Date.now() });
 */
export const saveNotificationPreferences = async (preferences: NotificationPreferences): Promise<void> => {
  try {
    // Update timestamp
    const updatedPreferences: NotificationPreferences = {
      ...preferences,
      lastUpdated: Date.now(),
    };
    
    // Use 7 day TTL for notification preferences (same as other user settings)
    await safeSetItem(NOTIFICATION_PREFERENCES_KEY, updatedPreferences, 7 * 24 * 60 * 60 * 1000);
    logger.log('Saved notification preferences to IndexedDB:', updatedPreferences);
  } catch (error) {
    logger.error('Failed to save notification preferences:', error);
    throw error;
  }
};

/**
 * Check if notifications are enabled by user preference
 * This checks the stored preference value
 * 
 * @returns Promise<boolean> - True if user has enabled notifications
 * 
 * @example
 * const userEnabled = await areNotificationsEnabledByUser();
 * const browserPermission = Notification.permission === 'granted';
 * if (userEnabled && browserPermission) {
 *   // Show notification
 * }
 */
export const areNotificationsEnabledByUser = async (): Promise<boolean> => {
  try {
    const preferences = await getNotificationPreferences();
    const enabled = preferences.enabled;
    
    logger.log('Notification enabled status:', { 
      userPreference: enabled, 
      browserPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported' 
    });
    
    return enabled;
  } catch (error) {
    logger.error('Failed to check notification enabled status:', error);
    return false;
  }
};

/**
 * Enable notifications (save preference)
 * 
 * @example
 * await enableNotifications();
 */
export const enableNotifications = async (): Promise<void> => {
  try {
    await saveNotificationPreferences({ enabled: true, lastUpdated: Date.now() });
    logger.log('Notifications enabled');
  } catch (error) {
    logger.error('Failed to enable notifications:', error);
    throw error;
  }
};

/**
 * Disable notifications (save preference)
 * 
 * @example
 * await disableNotifications();
 */
export const disableNotifications = async (): Promise<void> => {
  try {
    await saveNotificationPreferences({ enabled: false, lastUpdated: Date.now() });
    logger.log('Notifications disabled');
  } catch (error) {
    logger.error('Failed to disable notifications:', error);
    throw error;
  }
};

/**
 * Toggle notifications on/off
 * 
 * @returns Promise<boolean> - New enabled state after toggle
 * 
 * @example
 * const newState = await toggleNotifications();
 * console.log(`Notifications are now ${newState ? 'enabled' : 'disabled'}`);
 */
export const toggleNotifications = async (): Promise<boolean> => {
  try {
    const preferences = await getNotificationPreferences();
    const newEnabledState = !preferences.enabled;
    
    await saveNotificationPreferences({ 
      enabled: newEnabledState, 
      lastUpdated: Date.now() 
    });
    
    logger.log('Toggled notifications:', { from: preferences.enabled, to: newEnabledState });
    return newEnabledState;
  } catch (error) {
    logger.error('Failed to toggle notifications:', error);
    throw error;
  }
};