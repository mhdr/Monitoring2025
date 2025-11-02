/**
 * Custom React hook for managing sort preferences
 * Handles loading, saving, and applying sort configuration with Zustand + localStorage persistence
 * 
 * Features:
 * - Automatic loading of saved preferences from Zustand store
 * - Memoized sorting to prevent unnecessary re-calculations
 * - Cross-tab synchronization via localStorage (automatic via Zustand persist middleware)
 * - Type-safe sort operations
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Item, AlarmDto } from '../types/api';
import type { SortConfig, SortField, SortDirection } from '../types/sort';
import { DEFAULT_SORT_CONFIG } from '../types/sort';
import { getSortPreference, setSortPreference, clearSortPreference } from '../utils/sortPreferences';
import { sortItems, toggleSortDirection } from '../utils/sortUtils';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSortPreferences');

/**
 * Hook parameters
 */
interface UseSortPreferencesParams {
  /** Current group/folder ID */
  groupId: string | null | undefined;
  /** Current language for localized sorting */
  language: string;
  /** Items to sort */
  items: Item[];
  /** Item values (for value sorting) */
  values?: Record<string, number | boolean>;
  /** Alarms (for alarm sorting) */
  alarms?: AlarmDto[];
  /** Timestamps (for timestamp sorting) */
  timestamps?: Record<string, number>;
}

/**
 * Hook return value
 */
interface UseSortPreferencesReturn {
  /** Current sort configuration */
  sortConfig: SortConfig;
  /** Sorted items (memoized) */
  sortedItems: Item[];
  /** Change sort field */
  setSortField: (field: SortField) => void;
  /** Change sort direction */
  setSortDirection: (direction: SortDirection) => void;
  /** Toggle sort direction (asc <-> desc) */
  toggleDirection: () => void;
  /** Reset to default sort (no sorting) */
  resetSort: () => void;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Custom hook for managing sort preferences with Zustand + localStorage persistence
 * 
 * @param params - Hook parameters
 * @returns Sort state and control functions
 * 
 * @example
 * const {
 *   sortedItems,
 *   sortConfig,
 *   setSortField,
 *   toggleDirection
 * } = useSortPreferences({
 *   groupId: currentGroupId,
 *   language,
 *   items: allItems,
 *   values: itemValues,
 *   alarms: allAlarms
 * });
 */
export const useSortPreferences = (
  params: UseSortPreferencesParams
): UseSortPreferencesReturn => {
  const { groupId, language, items, values, alarms, timestamps } = params;
  
  // Sort configuration state
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load saved sort preference on mount or when groupId changes
  useEffect(() => {
    let isMounted = true;
    
    const loadPreference = async () => {
      setIsLoading(true);
      try {
        const savedConfig = await getSortPreference(groupId);
        
        if (isMounted) {
          setSortConfig(savedConfig);
          logger.log('Loaded sort preference:', {
            groupId: groupId || 'root',
            config: savedConfig
          });
        }
      } catch (error) {
        logger.error('Failed to load sort preference:', error);
        if (isMounted) {
          setSortConfig(DEFAULT_SORT_CONFIG);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadPreference();
    
    return () => {
      isMounted = false;
    };
  }, [groupId]);
  
  // Apply sorting to items (memoized)
  const sortedItems = useMemo(() => {
    if (!items || items.length === 0) {
      return items;
    }
    
    return sortItems(items, sortConfig, {
      language,
      values,
      alarms,
      timestamps,
    });
  }, [items, sortConfig, language, values, alarms, timestamps]);
  
  // Set sort field and save to Zustand store (persisted to localStorage)
  const setSortField = useCallback(
    (field: SortField) => {
      const newConfig: SortConfig = {
        field,
        direction: sortConfig.direction,
        savedAt: Date.now(),
      };
      
      setSortConfig(newConfig);
      
      // Save asynchronously (only if groupId is defined)
      if (groupId) {
        setSortPreference(groupId, newConfig).catch((error) =>
          logger.error('Failed to save sort field:', error)
        );
      }
      
      logger.log('Changed sort field:', {
        groupId: groupId || 'root',
        field,
        direction: newConfig.direction
      });
    },
    [groupId, sortConfig.direction]
  );
  
  // Set sort direction and save to Zustand store (persisted to localStorage)
  const setSortDirection = useCallback(
    (direction: SortDirection) => {
      const newConfig: SortConfig = {
        field: sortConfig.field,
        direction,
        savedAt: Date.now(),
      };
      
      setSortConfig(newConfig);
      
      // Save asynchronously (only if groupId is defined)
      if (groupId) {
        setSortPreference(groupId, newConfig).catch((error) =>
          logger.error('Failed to save sort direction:', error)
        );
      }
      
      logger.log('Changed sort direction:', {
        groupId: groupId || 'root',
        field: newConfig.field,
        direction
      });
    },
    [groupId, sortConfig.field]
  );
  
  // Toggle sort direction and save to Zustand store
  const toggleDirectionFn = useCallback(() => {
    const newDirection = toggleSortDirection(sortConfig.direction);
    const newConfig: SortConfig = {
      field: sortConfig.field,
      direction: newDirection,
      savedAt: Date.now(),
    };
    
    setSortConfig(newConfig);
    
    // Save asynchronously (only if groupId is defined)
    if (groupId) {
      setSortPreference(groupId, newConfig).catch((error) =>
        logger.error('Failed to save sort direction:', error)
      );
    }
  }, [sortConfig.direction, sortConfig.field, groupId]);
  
  // Reset to default sort
  const resetSort = useCallback(() => {
    setSortConfig(DEFAULT_SORT_CONFIG);
    
    // Clear from Zustand store (only if groupId is defined)
    if (groupId) {
      clearSortPreference(groupId).catch((error) =>
        logger.error('Failed to clear sort preference:', error)
      );
    }
    
    logger.log('Reset sort to default:', {
      groupId: groupId || 'root'
    });
  }, [groupId]);
  
  return {
    sortConfig,
    sortedItems,
    setSortField,
    setSortDirection,
    toggleDirection: toggleDirectionFn,
    resetSort,
    isLoading,
  };
};

/**
 * Simplified hook for basic sorting without persistence
 * Useful for temporary sorting or when persistence is not needed
 * 
 * @param items - Items to sort
 * @param initialConfig - Initial sort configuration
 * @param context - Sorting context (language, values, etc.)
 * @returns Sorted items and sort config
 * 
 * @example
 * const { sortedItems, sortConfig, setSortField } = useSimpleSort(
 *   items,
 *   { field: 'name', direction: 'asc', savedAt: Date.now() },
 *   { language, values }
 * );
 */
export const useSimpleSort = (
  items: Item[],
  initialConfig: SortConfig,
  context: {
    language: string;
    values?: Record<string, number | boolean>;
    alarms?: AlarmDto[];
    timestamps?: Record<string, number>;
  }
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialConfig);
  
  const sortedItems = useMemo(() => {
    return sortItems(items, sortConfig, context);
  }, [items, sortConfig, context]);
  
  const setSortField = useCallback((field: SortField) => {
    setSortConfig(prev => ({
      ...prev,
      field,
      savedAt: Date.now(),
    }));
  }, []);
  
  const setSortDirectionFn = useCallback((direction: SortDirection) => {
    setSortConfig(prev => ({
      ...prev,
      direction,
      savedAt: Date.now(),
    }));
  }, []);
  
  const toggleDirectionFn = useCallback(() => {
    setSortConfig(prev => ({
      ...prev,
      direction: toggleSortDirection(prev.direction),
      savedAt: Date.now(),
    }));
  }, []);
  
  return {
    sortedItems,
    sortConfig,
    setSortField,
    setSortDirection: setSortDirectionFn,
    toggleDirection: toggleDirectionFn,
  };
};
