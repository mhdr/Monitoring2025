/**
 * Custom hook for managing item sorting with IndexedDB persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Item, MultiValue, ActiveAlarm, AlarmPriority } from '../types/api';
import type { ItemSortConfig, ItemSortField, SortDirection } from '../types/sorting';
import { DEFAULT_SORT_CONFIG, getSortConfigKey } from '../types/sorting';
import { getItem, setItem } from '../utils/indexedDbStorage';
import { createLogger } from '../utils/logger';

const logger = createLogger('useItemSorting');

/**
 * Props for useItemSorting hook
 */
interface UseItemSortingProps {
  /** Current folder ID (null for root) */
  folderId: string | null;
  /** Items to sort */
  items: Item[];
  /** Item values for value-based sorting */
  itemValues?: MultiValue[];
  /** Active alarms for alarm-based sorting */
  activeAlarms?: ActiveAlarm[];
}

/**
 * Return type for useItemSorting hook
 */
interface UseItemSortingReturn {
  /** Sorted items array */
  sortedItems: Item[];
  /** Current sort configuration */
  sortConfig: ItemSortConfig;
  /** Update sort field */
  setSortField: (field: ItemSortField) => void;
  /** Update sort direction */
  setSortDirection: (direction: SortDirection) => void;
  /** Toggle sort direction (asc <-> desc) */
  toggleSortDirection: () => void;
  /** Update complete sort configuration */
  setSortConfig: (config: ItemSortConfig) => void;
  /** Reset to default sort */
  resetSort: () => void;
  /** Whether sorting is loading from IndexedDB */
  isLoading: boolean;
}

/**
 * Custom hook for managing item sorting with IndexedDB persistence
 */
export const useItemSorting = ({
  folderId,
  items,
  itemValues = [],
  activeAlarms = [],
}: UseItemSortingProps): UseItemSortingReturn => {
  const [sortConfig, setSortConfigState] = useState<ItemSortConfig>(DEFAULT_SORT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Load sort configuration from IndexedDB on mount or folder change
  useEffect(() => {
    const loadSortConfig = async () => {
      try {
        setIsLoading(true);
        const storageKey = getSortConfigKey(folderId);
        const savedConfig = await getItem<ItemSortConfig>(storageKey);

        if (savedConfig) {
          logger.log('Loaded sort config from IndexedDB', { folderId, config: savedConfig });
          setSortConfigState(savedConfig);
        } else {
          logger.log('No saved sort config found, using default', { folderId });
          setSortConfigState(DEFAULT_SORT_CONFIG);
        }
      } catch (error) {
        logger.error('Failed to load sort config from IndexedDB', error);
        setSortConfigState(DEFAULT_SORT_CONFIG);
      } finally {
        setIsLoading(false);
      }
    };

    loadSortConfig();
  }, [folderId]);

  // Save sort configuration to IndexedDB when it changes
  const saveSortConfig = useCallback(
    async (config: ItemSortConfig) => {
      try {
        const storageKey = getSortConfigKey(folderId);
        await setItem(storageKey, config);
        logger.log('Saved sort config to IndexedDB', { folderId, config });
      } catch (error) {
        logger.error('Failed to save sort config to IndexedDB', error);
      }
    },
    [folderId]
  );

  // Update sort configuration
  const setSortConfig = useCallback(
    (config: ItemSortConfig) => {
      setSortConfigState(config);
      saveSortConfig(config);
    },
    [saveSortConfig]
  );

  // Update sort field only
  const setSortField = useCallback(
    (field: ItemSortField) => {
      const newConfig: ItemSortConfig = { ...sortConfig, field };
      setSortConfig(newConfig);
    },
    [sortConfig, setSortConfig]
  );

  // Update sort direction only
  const setSortDirection = useCallback(
    (direction: SortDirection) => {
      const newConfig: ItemSortConfig = { ...sortConfig, direction };
      setSortConfig(newConfig);
    },
    [sortConfig, setSortConfig]
  );

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    const newDirection: SortDirection = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortDirection(newDirection);
  }, [sortConfig.direction, setSortDirection]);

  // Reset to default sort
  const resetSort = useCallback(() => {
    setSortConfig(DEFAULT_SORT_CONFIG);
  }, [setSortConfig]);

  // Get item value for sorting
  const getItemValue = useCallback(
    (itemId: string): string | null => {
      const itemValue = itemValues.find((v) => v.itemId === itemId);
      return itemValue?.value || null;
    },
    [itemValues]
  );

  // Get item alarm status for sorting
  const getItemAlarmPriority = useCallback(
    (itemId: string): AlarmPriority | null => {
      const alarm = activeAlarms.find((a) => a.itemId === itemId);
      return alarm?.alarmPriority || null;
    },
    [activeAlarms]
  );

  // Sort items based on current configuration
  const sortedItems = useMemo(() => {
    if (items.length === 0) {
      return [];
    }

    logger.log('Sorting items', {
      folderId,
      itemCount: items.length,
      sortField: sortConfig.field,
      sortDirection: sortConfig.direction,
    });

    // Create a copy to avoid mutating original array
    const itemsCopy = [...items];

    itemsCopy.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.field) {
        case 'pointNumber':
          comparison = a.pointNumber - b.pointNumber;
          break;

        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;

        case 'itemType':
          comparison = a.itemType - b.itemType;
          break;

        case 'value': {
          const valueA = getItemValue(a.id);
          const valueB = getItemValue(b.id);

          // Handle null values (put them at the end)
          if (valueA === null && valueB === null) comparison = 0;
          else if (valueA === null) comparison = 1;
          else if (valueB === null) comparison = -1;
          else {
            // Try numeric comparison first
            const numA = parseFloat(valueA);
            const numB = parseFloat(valueB);

            if (!isNaN(numA) && !isNaN(numB)) {
              comparison = numA - numB;
            } else {
              // Fallback to string comparison
              comparison = valueA.localeCompare(valueB);
            }
          }
          break;
        }

        case 'time': {
          const valueA = itemValues.find((v) => v.itemId === a.id);
          const valueB = itemValues.find((v) => v.itemId === b.id);

          const timeA = valueA?.time || 0;
          const timeB = valueB?.time || 0;

          comparison = timeA - timeB;
          break;
        }

        case 'alarmStatus': {
          const priorityA = getItemAlarmPriority(a.id);
          const priorityB = getItemAlarmPriority(b.id);

          // Sort by alarm priority: High (2) > Low (1) > No alarm (null)
          if (priorityA === null && priorityB === null) comparison = 0;
          else if (priorityA === null) comparison = 1;
          else if (priorityB === null) comparison = -1;
          else comparison = priorityB - priorityA; // Higher priority first
          break;
        }

        default:
          comparison = 0;
      }

      // Apply sort direction
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return itemsCopy;
  }, [items, sortConfig, getItemValue, getItemAlarmPriority, itemValues, folderId]);

  return {
    sortedItems,
    sortConfig,
    setSortField,
    setSortDirection,
    toggleSortDirection,
    setSortConfig,
    resetSort,
    isLoading,
  };
};
