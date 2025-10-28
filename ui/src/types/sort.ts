/**
 * TypeScript interfaces for sort configuration
 * Defines sort options, direction, and preferences for monitoring items
 */

/**
 * Available sort fields for items
 */
export type SortField = 
  | 'name'              // Sort by item name (localized)
  | 'value'             // Sort by current value (numerical)
  | 'alarm'             // Sort by alarm status (active first/last)
  | 'type'              // Sort by item type
  | 'pointNumber'       // Sort by hardware point number
  | 'timestamp'         // Sort by last update timestamp
  | 'none';             // No sorting (default order)

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Complete sort configuration
 */
export interface SortConfig {
  /** Sort field to use */
  field: SortField;
  /** Sort direction (ascending/descending) */
  direction: SortDirection;
  /** Timestamp when this preference was saved */
  savedAt: number;
}

/**
 * Sort preferences stored per group
 * Allows different sorting for each folder/group
 */
export interface GroupSortPreferences {
  /** Map of groupId -> SortConfig */
  [groupId: string]: SortConfig;
}

/**
 * Default sort configuration
 */
export const DEFAULT_SORT_CONFIG: SortConfig = {
  field: 'none',
  direction: 'asc',
  savedAt: Date.now(),
};

/**
 * Sort option metadata for UI display
 */
export interface SortOption {
  field: SortField;
  labelKey: string; // i18n key
  icon?: string; // Optional icon name
}

/**
 * All available sort options
 */
export const SORT_OPTIONS: SortOption[] = [
  { field: 'none', labelKey: 'sort.fields.none' },
  { field: 'name', labelKey: 'sort.fields.name' },
  { field: 'value', labelKey: 'sort.fields.value' },
  { field: 'alarm', labelKey: 'sort.fields.alarm' },
  { field: 'type', labelKey: 'sort.fields.type' },
  { field: 'pointNumber', labelKey: 'sort.fields.pointNumber' },
  { field: 'timestamp', labelKey: 'sort.fields.timestamp' },
];
