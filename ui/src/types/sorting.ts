/**
 * Sorting types and utilities for monitoring items
 */

/**
 * Sort field options for items
 */
export type ItemSortField = 
  | 'pointNumber'    // Sort by point number
  | 'name'           // Sort by name (alphabetically)
  | 'itemType'       // Sort by item type (Digital Input, Digital Output, etc.)
  | 'value'          // Sort by current value
  | 'time'           // Sort by last update time
  | 'alarmStatus';   // Sort by alarm status (alarms first)

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Complete sort configuration
 */
export interface ItemSortConfig {
  field: ItemSortField;
  direction: SortDirection;
}

/**
 * Default sort configuration (point number ascending)
 */
export const DEFAULT_SORT_CONFIG: ItemSortConfig = {
  field: 'pointNumber',
  direction: 'asc',
};

/**
 * Sort configuration storage key prefix for IndexedDB
 * Format: monitoring_sort_config_{folderId}
 * For root folder: monitoring_sort_config_root
 */
export const SORT_CONFIG_KEY_PREFIX = 'monitoring_sort_config_';

/**
 * Get storage key for folder sort configuration
 */
export const getSortConfigKey = (folderId: string | null): string => {
  return `${SORT_CONFIG_KEY_PREFIX}${folderId || 'root'}`;
};
