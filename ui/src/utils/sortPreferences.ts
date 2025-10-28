/**
 * Sort preferences persistence with IndexedDB
 * Stores and retrieves user's sort preferences per group/folder
 * 
 * Features:
 * - Per-group sort preferences (each folder remembers its own sorting)
 * - TTL support (preferences expire after 30 days)
 * - Cross-tab synchronization via IndexedDB
 * - Automatic fallback to defaults
 */

import type { SortConfig, GroupSortPreferences } from '../types/sort';
import { DEFAULT_SORT_CONFIG } from '../types/sort';
import { getItem, setItem, removeItem } from './indexedDbStorage';
import { createLogger } from './logger';

const logger = createLogger('SortPreferences');

// IndexedDB key for sort preferences
const SORT_PREFERENCES_KEY = 'monitoring_sort_preferences';

// TTL for sort preferences (30 days)
const SORT_PREFERENCES_TTL = 30 * 24 * 60 * 60 * 1000;

/**
 * Get sort preferences for all groups from IndexedDB
 * 
 * @returns Promise<GroupSortPreferences> - Map of groupId -> SortConfig
 * 
 * @example
 * const preferences = await getAllSortPreferences();
 * const groupSort = preferences['group-123'] || DEFAULT_SORT_CONFIG;
 */
export const getAllSortPreferences = async (): Promise<GroupSortPreferences> => {
  try {
    const preferences = await getItem<GroupSortPreferences>(SORT_PREFERENCES_KEY);
    
    if (preferences) {
      logger.log('Retrieved sort preferences from IndexedDB:', {
        groupCount: Object.keys(preferences).length,
        preferences
      });
      return preferences;
    }
    
    logger.log('No sort preferences found, returning empty object');
    return {};
  } catch (error) {
    logger.error('Failed to get sort preferences from IndexedDB:', error);
    return {};
  }
};

/**
 * Get sort configuration for a specific group
 * Returns default config if no preference exists
 * 
 * @param groupId - Group ID to get sort config for (null/undefined for root)
 * @returns Promise<SortConfig> - Sort configuration for the group
 * 
 * @example
 * const sortConfig = await getSortPreference('group-123');
 * const sortedItems = sortItems(items, sortConfig);
 */
export const getSortPreference = async (groupId: string | null | undefined): Promise<SortConfig> => {
  try {
    const key = groupId || 'root';
    const preferences = await getAllSortPreferences();
    
    const config = preferences[key];
    
    if (config) {
      logger.log(`Retrieved sort preference for group ${key}:`, config);
      return config;
    }
    
    logger.log(`No sort preference for group ${key}, returning default`);
    return DEFAULT_SORT_CONFIG;
  } catch (error) {
    logger.error(`Failed to get sort preference for group ${groupId}:`, error);
    return DEFAULT_SORT_CONFIG;
  }
};

/**
 * Save sort configuration for a specific group
 * 
 * @param groupId - Group ID to save sort config for (null/undefined for root)
 * @param config - Sort configuration to save
 * 
 * @example
 * await setSortPreference('group-123', {
 *   field: 'name',
 *   direction: 'asc',
 *   savedAt: Date.now()
 * });
 */
export const setSortPreference = async (
  groupId: string | null | undefined,
  config: SortConfig
): Promise<void> => {
  try {
    const key = groupId || 'root';
    const preferences = await getAllSortPreferences();
    
    // Update preferences for this group
    const updatedPreferences: GroupSortPreferences = {
      ...preferences,
      [key]: {
        ...config,
        savedAt: Date.now(), // Always update timestamp
      },
    };
    
    // Save to IndexedDB with TTL
    await setItem(SORT_PREFERENCES_KEY, updatedPreferences, SORT_PREFERENCES_TTL);
    
    logger.log(`Saved sort preference for group ${key}:`, {
      groupId: key,
      config: updatedPreferences[key],
      totalGroups: Object.keys(updatedPreferences).length
    });
  } catch (error) {
    logger.error(`Failed to save sort preference for group ${groupId}:`, error);
    throw error;
  }
};

/**
 * Clear sort preference for a specific group
 * Resets to default sorting
 * 
 * @param groupId - Group ID to clear sort config for (null/undefined for root)
 * 
 * @example
 * await clearSortPreference('group-123');
 */
export const clearSortPreference = async (groupId: string | null | undefined): Promise<void> => {
  try {
    const key = groupId || 'root';
    const preferences = await getAllSortPreferences();
    
    // Remove this group's preference
    const updatedPreferences = { ...preferences };
    delete updatedPreferences[key];
    
    // Save updated preferences
    if (Object.keys(updatedPreferences).length > 0) {
      await setItem(SORT_PREFERENCES_KEY, updatedPreferences, SORT_PREFERENCES_TTL);
      logger.log(`Cleared sort preference for group ${key}`);
    } else {
      // No preferences left, remove the key entirely
      await removeItem(SORT_PREFERENCES_KEY);
      logger.log('Cleared all sort preferences (no groups remaining)');
    }
  } catch (error) {
    logger.error(`Failed to clear sort preference for group ${groupId}:`, error);
    throw error;
  }
};

/**
 * Clear all sort preferences for all groups
 * 
 * @example
 * await clearAllSortPreferences();
 */
export const clearAllSortPreferences = async (): Promise<void> => {
  try {
    await removeItem(SORT_PREFERENCES_KEY);
    logger.log('Cleared all sort preferences');
  } catch (error) {
    logger.error('Failed to clear all sort preferences:', error);
    throw error;
  }
};

/**
 * Check if a specific group has a saved sort preference
 * 
 * @param groupId - Group ID to check (null/undefined for root)
 * @returns Promise<boolean> - True if preference exists
 * 
 * @example
 * const hasPreference = await hasSortPreference('group-123');
 * if (!hasPreference) {
 *   // Show default sort indicator
 * }
 */
export const hasSortPreference = async (groupId: string | null | undefined): Promise<boolean> => {
  try {
    const key = groupId || 'root';
    const preferences = await getAllSortPreferences();
    return key in preferences;
  } catch (error) {
    logger.error(`Failed to check sort preference for group ${groupId}:`, error);
    return false;
  }
};

/**
 * Get all groups that have sort preferences
 * Useful for debugging or cleanup
 * 
 * @returns Promise<string[]> - Array of group IDs with sort preferences
 * 
 * @example
 * const groupsWithPreferences = await getGroupsWithPreferences();
 * console.log(`${groupsWithPreferences.length} groups have custom sort settings`);
 */
export const getGroupsWithPreferences = async (): Promise<string[]> => {
  try {
    const preferences = await getAllSortPreferences();
    const groupIds = Object.keys(preferences);
    logger.log(`Found ${groupIds.length} groups with sort preferences:`, groupIds);
    return groupIds;
  } catch (error) {
    logger.error('Failed to get groups with preferences:', error);
    return [];
  }
};
