/**
 * Sort Preferences Store
 * 
 * Zustand store for managing sort preferences with localStorage persistence.
 * Stores user's sort preferences per group/folder.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SortConfig, GroupSortPreferences } from '../types/sort';
import { DEFAULT_SORT_CONFIG } from '../types/sort';
import { createLogger } from '../utils/logger';

const logger = createLogger('SortStore');

/**
 * Sort store state and actions
 */
interface SortStore {
  preferences: GroupSortPreferences;
  getSortConfig: (groupId: string) => SortConfig;
  setSortConfig: (groupId: string, config: SortConfig) => void;
  removeSortConfig: (groupId: string) => void;
  clearAllSortPreferences: () => void;
}

/**
 * Zustand store for sort preferences with localStorage persistence
 */
export const useSortStore = create<SortStore>()(
  persist(
    (set, get) => ({
      preferences: {},
      
      /**
       * Get sort configuration for a specific group
       */
      getSortConfig: (groupId: string): SortConfig => {
        const state = get();
        return state.preferences[groupId] || DEFAULT_SORT_CONFIG;
      },
      
      /**
       * Set sort configuration for a specific group
       */
      setSortConfig: (groupId: string, config: SortConfig) => {
        logger.info('Setting sort config for group:', { groupId, config });
        set((state) => ({
          preferences: {
            ...state.preferences,
            [groupId]: config,
          },
        }));
      },
      
      /**
       * Remove sort configuration for a specific group
       */
      removeSortConfig: (groupId: string) => {
        logger.info('Removing sort config for group:', groupId);
        set((state) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [groupId]: _removed, ...rest } = state.preferences;
          return { preferences: rest };
        });
      },
      
      /**
       * Clear all sort preferences
       */
      clearAllSortPreferences: () => {
        logger.info('Clearing all sort preferences');
        set({ preferences: {} });
      },
    }),
    {
      name: 'sort-preferences', // localStorage key
      version: 1,
    }
  )
);

/**
 * Helper functions for backward compatibility
 */
export const getAllSortPreferences = async (): Promise<GroupSortPreferences> => {
  return useSortStore.getState().preferences;
};

export const getSortPreference = async (groupId: string): Promise<SortConfig> => {
  return useSortStore.getState().getSortConfig(groupId);
};

export const setSortPreference = async (groupId: string, config: SortConfig): Promise<void> => {
  useSortStore.getState().setSortConfig(groupId, config);
};

export const removeSortPreference = async (groupId: string): Promise<void> => {
  useSortStore.getState().removeSortConfig(groupId);
};

/**
 * Clear sort preference for a specific group (alias for removeSortPreference)
 */
export const clearSortPreference = async (groupId: string): Promise<void> => {
  useSortStore.getState().removeSortConfig(groupId);
};

export const clearAllSortPreferences = async (): Promise<void> => {
  useSortStore.getState().clearAllSortPreferences();
};
