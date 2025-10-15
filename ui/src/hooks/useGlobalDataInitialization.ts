/**
 * useGlobalDataInitialization Hook
 * Fetches essential monitoring data (groups and items) globally when user is authenticated
 * This ensures groups and items are available app-wide without requiring individual components to fetch them
 * Should be mounted once at the app level for authenticated users
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { fetchGroups, fetchItems } from '../store/slices/monitoringSlice';

/**
 * Hook return type for manual control
 */
export interface UseGlobalDataInitializationResult {
  /** Manually refresh groups and items data */
  refreshData: () => void;
  /** Check if initial data has been loaded */
  isInitialized: boolean;
}

/**
 * Custom hook to manage global monitoring data initialization
 * This hook should be used once at the app level (e.g., in App component)
 * to ensure groups and items are fetched when the user is authenticated
 * 
 * @param isAuthenticated - Whether the user is authenticated (data only fetches when true)
 * @returns Control functions and initialization status
 * 
 * @example
 * ```tsx
 * // In App component
 * function App() {
 *   const { isAuthenticated } = useAuth();
 *   const { refreshData, isInitialized } = useGlobalDataInitialization(isAuthenticated);
 *   
 *   // Data automatically loads when authenticated
 *   // Access data anywhere in the app with:
 *   // const { groups, items } = useSelector(state => state.monitoring);
 * }
 * ```
 */
export function useGlobalDataInitialization(
  isAuthenticated: boolean
): UseGlobalDataInitializationResult {
  const dispatch = useAppDispatch();
  
  // Track whether we've attempted to load data for this auth session
  const hasInitializedRef = useRef<boolean>(false);
  const isLoadingRef = useRef<boolean>(false);
  
  // Get current state from store
  const { groups, items, groupsLoading, itemsLoading, isDataSynced } = useAppSelector((state) => state.monitoring);

  /**
   * Fetches groups and items data
   */
  const loadData = useCallback(async () => {
    // Only load if authenticated and not already loading
    if (!isAuthenticated || isLoadingRef.current) {
      return;
    }

    // If data is already synced and we have data in state, skip fetching
    if (isDataSynced && (groups.length > 0 || items.length > 0)) {
      console.info('[useGlobalDataInitialization] Data already synced, skipping fetch:', {
        groupsCount: groups.length,
        itemsCount: items.length,
        isDataSynced,
        timestamp: new Date().toISOString()
      });
      hasInitializedRef.current = true;
      return;
    }

    isLoadingRef.current = true;

    try {
      // Dispatch both requests concurrently
      await Promise.all([
        dispatch(fetchGroups()),
        dispatch(fetchItems({ showOrphans: false }))
      ]);
      
      hasInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to load global monitoring data:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [isAuthenticated, dispatch, isDataSynced, groups.length, items.length]);

  /**
   * Manually refresh data
   */
  const refreshData = useCallback(() => {
    hasInitializedRef.current = false; // Reset initialization flag
    loadData();
  }, [loadData]);

  // Auto-load data when authenticated (but only once per auth session)
  useEffect(() => {
    if (isAuthenticated && !hasInitializedRef.current) {
      loadData();
    } else if (!isAuthenticated) {
      // Reset initialization flag when user logs out
      hasInitializedRef.current = false;
    }
  }, [isAuthenticated, loadData]);

  // Determine if we consider the data "initialized"
  // Data is initialized if:
  // 1. Data is synced and we have data in state (loaded from localStorage), OR
  // 2. We've tried to load data and fetching is complete
  const isInitialized = 
    (isDataSynced && (groups.length > 0 || items.length > 0)) ||
    (hasInitializedRef.current && !groupsLoading && !itemsLoading);

  return {
    refreshData,
    isInitialized,
  };
}