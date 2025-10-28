/**
 * Sorting utility functions for monitoring items
 * Provides sorting logic for all supported sort fields
 * 
 * Features:
 * - Multi-criteria sorting (name, value, alarm, type, etc.)
 * - Localized string comparison (respects user's language)
 * - Stable sorting (maintains relative order for equal items)
 * - Null-safe comparisons
 */

import type { Item, AlarmDto } from '../types/api';
import type { SortConfig, SortField, SortDirection } from '../types/sort';
import { createLogger } from './logger';

const logger = createLogger('SortUtils');

/**
 * Get localized name for an item based on language
 * 
 * @param item - Item to get name from
 * @param language - Current language ('en' | 'fa')
 * @returns Localized name
 */
const getLocalizedName = (item: Item, language: string): string => {
  if (language === 'fa' && item.nameFa) {
    return item.nameFa;
  }
  return item.name;
};

/**
 * Compare two strings with locale support
 * 
 * @param a - First string
 * @param b - Second string
 * @param language - Current language
 * @param direction - Sort direction
 * @returns Comparison result (-1, 0, 1)
 */
const compareStrings = (
  a: string,
  b: string,
  language: string,
  direction: SortDirection
): number => {
  const locale = language === 'fa' ? 'fa-IR' : 'en-US';
  const result = a.localeCompare(b, locale, { sensitivity: 'base' });
  return direction === 'asc' ? result : -result;
};

/**
 * Compare two numbers
 * 
 * @param a - First number
 * @param b - Second number
 * @param direction - Sort direction
 * @returns Comparison result (-1, 0, 1)
 */
const compareNumbers = (
  a: number,
  b: number,
  direction: SortDirection
): number => {
  const result = a - b;
  return direction === 'asc' ? result : -result;
};

/**
 * Sort items by name (localized)
 */
const sortByName = (
  items: Item[],
  language: string,
  direction: SortDirection
): Item[] => {
  return [...items].sort((a, b) => {
    const nameA = getLocalizedName(a, language);
    const nameB = getLocalizedName(b, language);
    return compareStrings(nameA, nameB, language, direction);
  });
};

/**
 * Sort items by current value
 * Items without values are placed at the end
 */
const sortByValue = (
  items: Item[],
  values: Record<string, number | boolean>,
  direction: SortDirection
): Item[] => {
  return [...items].sort((a, b) => {
    const valueA = values[a.id];
    const valueB = values[b.id];
    
    // Handle missing values - put them at the end
    if (valueA == null && valueB == null) return 0;
    if (valueA == null) return 1;
    if (valueB == null) return -1;
    
    // Convert booleans to numbers (true=1, false=0)
    const numA = typeof valueA === 'boolean' ? (valueA ? 1 : 0) : valueA;
    const numB = typeof valueB === 'boolean' ? (valueB ? 1 : 0) : valueB;
    
    return compareNumbers(numA, numB, direction);
  });
};

/**
 * Sort items by alarm status
 * Items with active alarms are placed first (or last depending on direction)
 */
const sortByAlarm = (
  items: Item[],
  alarms: AlarmDto[],
  direction: SortDirection
): Item[] => {
  // Create a map of itemId -> active alarm count
  const alarmCounts = new Map<string, number>();
  
  alarms.forEach(alarm => {
    // Count enabled alarms only (isDisabled = false or undefined)
    if (alarm.itemId && !alarm.isDisabled) {
      const count = alarmCounts.get(alarm.itemId) || 0;
      alarmCounts.set(alarm.itemId, count + 1);
    }
  });
  
  return [...items].sort((a, b) => {
    const alarmsA = alarmCounts.get(a.id) || 0;
    const alarmsB = alarmCounts.get(b.id) || 0;
    
    // More alarms = higher priority (placed first in asc, last in desc)
    return compareNumbers(alarmsA, alarmsB, direction === 'asc' ? 'desc' : 'asc');
  });
};

/**
 * Sort items by item type
 */
const sortByType = (
  items: Item[],
  language: string,
  direction: SortDirection
): Item[] => {
  return [...items].sort((a, b) => {
    // Convert ItemType enum to string for comparison
    const typeA = String(a.itemType);
    const typeB = String(b.itemType);
    return compareStrings(typeA, typeB, language, direction);
  });
};

/**
 * Sort items by point number
 */
const sortByPointNumber = (
  items: Item[],
  direction: SortDirection
): Item[] => {
  return [...items].sort((a, b) => {
    return compareNumbers(a.pointNumber, b.pointNumber, direction);
  });
};

/**
 * Sort items by last update timestamp
 * Items without timestamps are placed at the end
 */
const sortByTimestamp = (
  items: Item[],
  timestamps: Record<string, number>,
  direction: SortDirection
): Item[] => {
  return [...items].sort((a, b) => {
    const timeA = timestamps[a.id];
    const timeB = timestamps[b.id];
    
    // Handle missing timestamps - put them at the end
    if (timeA == null && timeB == null) return 0;
    if (timeA == null) return 1;
    if (timeB == null) return -1;
    
    return compareNumbers(timeA, timeB, direction);
  });
};

/**
 * Main sort function - applies sorting based on configuration
 * 
 * @param items - Array of items to sort
 * @param config - Sort configuration
 * @param context - Additional context needed for sorting
 * @returns Sorted array of items
 * 
 * @example
 * const sortedItems = sortItems(items, {
 *   field: 'name',
 *   direction: 'asc',
 *   savedAt: Date.now()
 * }, {
 *   language: 'en',
 *   values: itemValues,
 *   alarms: allAlarms,
 *   timestamps: itemTimestamps
 * });
 */
export const sortItems = (
  items: Item[],
  config: SortConfig,
  context: {
    language: string;
    values?: Record<string, number | boolean>;
    alarms?: AlarmDto[];
    timestamps?: Record<string, number>;
  }
): Item[] => {
  if (!items || items.length === 0) {
    return items;
  }
  
  logger.log('Sorting items:', {
    itemCount: items.length,
    field: config.field,
    direction: config.direction,
    language: context.language
  });
  
  const { field, direction } = config;
  const { language, values = {}, alarms = [], timestamps = {} } = context;
  
  try {
    switch (field) {
      case 'name':
        return sortByName(items, language, direction);
      
      case 'value':
        return sortByValue(items, values, direction);
      
      case 'alarm':
        return sortByAlarm(items, alarms, direction);
      
      case 'type':
        return sortByType(items, language, direction);
      
      case 'pointNumber':
        return sortByPointNumber(items, direction);
      
      case 'timestamp':
        return sortByTimestamp(items, timestamps, direction);
      
      case 'none':
      default:
        // Return original order
        return items;
    }
  } catch (error) {
    logger.error('Error sorting items:', error);
    return items; // Return unsorted on error
  }
};

/**
 * Toggle sort direction (asc <-> desc)
 * 
 * @param direction - Current direction
 * @returns Toggled direction
 * 
 * @example
 * const newDirection = toggleSortDirection(currentDirection);
 */
export const toggleSortDirection = (direction: SortDirection): SortDirection => {
  return direction === 'asc' ? 'desc' : 'asc';
};

/**
 * Get sort field display priority for UI
 * Used to determine default sort order
 * 
 * @param field - Sort field
 * @returns Priority (lower = higher priority)
 */
export const getSortFieldPriority = (field: SortField): number => {
  const priorities: Record<SortField, number> = {
    none: 0,
    alarm: 1,
    name: 2,
    value: 3,
    type: 4,
    pointNumber: 5,
    timestamp: 6,
  };
  return priorities[field] || 99;
};

/**
 * Check if sort field requires additional data
 * Helps determine what data needs to be loaded
 * 
 * @param field - Sort field
 * @returns Object indicating required data
 * 
 * @example
 * const requirements = getSortDataRequirements('value');
 * if (requirements.values && !itemValues) {
 *   // Need to fetch values first
 *   await fetchValues();
 * }
 */
export const getSortDataRequirements = (field: SortField) => {
  return {
    values: field === 'value',
    alarms: field === 'alarm',
    timestamps: field === 'timestamp',
  };
};
