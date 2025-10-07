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
  const { groups, items, groupsLoading, itemsLoading } = useAppSelector((state) => state.monitoring);

  /**
   * Fetches groups and items data
   */
  const loadData = useCallback(async () => {
    // Only load if authenticated and not already loading
    if (!isAuthenticated || isLoadingRef.current) {
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
  }, [isAuthenticated, dispatch]);

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
  // Data is initialized if we have groups and items loaded, or if we've tried to load and failed
  const isInitialized = hasInitializedRef.current && 
    !groupsLoading && 
    !itemsLoading && 
    (groups.length > 0 || items.length > 0 || hasInitializedRef.current);

  return {
    refreshData,
    isInitialized,
  };
}