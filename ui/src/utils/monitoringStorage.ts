/**
 * Helper functions for managing monitoring data in sessionStorage
 * Stores groups, items, and alarms data for session persistence
 */

import type { Group, Item, AlarmDto } from '../types/api';
import type { GroupsResponseDto, ItemsResponseDto, AlarmsResponseDto } from '../types/api';

// Session storage keys for monitoring data
const MONITORING_GROUPS_KEY = 'monitoring_groups';
const MONITORING_ITEMS_KEY = 'monitoring_items';
const MONITORING_ALARMS_KEY = 'monitoring_alarms';

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
 * Helper function to safely parse JSON from sessionStorage
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
 * Helper function to safely stringify and store data in sessionStorage
 */
const safeSetItem = (key: string, data: unknown): void => {
  try {
    const jsonData = JSON.stringify(data);
    sessionStorage.setItem(key, jsonData);
    console.info(`[MonitoringStorage] Stored ${key} in sessionStorage:`, {
      key,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      storageSize: jsonData.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.warn(`Failed to store ${key} in sessionStorage:`, error);
  }
};

/**
 * Helper function to safely remove item from sessionStorage
 */
const safeRemoveItem = (key: string): void => {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove ${key} from sessionStorage:`, error);
  }
};

/**
 * Helper function to safely get item from sessionStorage
 */
const safeGetItem = (key: string): string | null => {
  try {
    const data = sessionStorage.getItem(key);
    console.info(`[MonitoringStorage] Retrieved ${key} from sessionStorage:`, {
      key,
      hasData: !!data,
      dataLength: data?.length || 0,
      timestamp: new Date().toISOString()
    });
    return data;
  } catch (error) {
    console.warn(`Failed to get ${key} from sessionStorage:`, error);
    return null;
  }
};

/**
 * Monitoring data storage helpers
 */
export const monitoringStorageHelpers: MonitoringStorageHelpers = {
  /**
   * Get stored groups data from sessionStorage
   */
  getStoredGroups: (): Group[] | null => {
    const data = safeGetItem(MONITORING_GROUPS_KEY);
    return safeParseJSON<Group[]>(data);
  },

  /**
   * Store groups data in sessionStorage
   */
  setStoredGroups: (groups: Group[]): void => {
    safeSetItem(MONITORING_GROUPS_KEY, groups);
  },

  /**
   * Clear stored groups data from sessionStorage
   */
  clearStoredGroups: (): void => {
    safeRemoveItem(MONITORING_GROUPS_KEY);
  },

  /**
   * Get stored items data from sessionStorage
   */
  getStoredItems: (): Item[] | null => {
    const data = safeGetItem(MONITORING_ITEMS_KEY);
    return safeParseJSON<Item[]>(data);
  },

  /**
   * Store items data in sessionStorage
   */
  setStoredItems: (items: Item[]): void => {
    safeSetItem(MONITORING_ITEMS_KEY, items);
  },

  /**
   * Clear stored items data from sessionStorage
   */
  clearStoredItems: (): void => {
    safeRemoveItem(MONITORING_ITEMS_KEY);
  },

  /**
   * Get stored alarms data from sessionStorage
   */
  getStoredAlarms: (): AlarmDto[] | null => {
    const data = safeGetItem(MONITORING_ALARMS_KEY);
    return safeParseJSON<AlarmDto[]>(data);
  },

  /**
   * Store alarms data in sessionStorage
   */
  setStoredAlarms: (alarms: AlarmDto[]): void => {
    safeSetItem(MONITORING_ALARMS_KEY, alarms);
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
   * Check if any monitoring data is stored in sessionStorage
   */
  hasStoredData: (): boolean => {
    return !!(
      safeGetItem(MONITORING_GROUPS_KEY) ||
      safeGetItem(MONITORING_ITEMS_KEY) ||
      safeGetItem(MONITORING_ALARMS_KEY)
    );
  },
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