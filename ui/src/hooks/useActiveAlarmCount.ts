/**
 * useActiveAlarmCount Hook
 * Fetches and maintains active alarm count for sidebar badge display
 * 
 * This hook automatically fetches the active alarm count when:
 * 1. User is authenticated
 * 2. Data is synced (monitoring data loaded)
 * 
 * The alarm count is stored in MonitoringContext and displayed in the sidebar badge.
 */

import { useEffect, useRef } from 'react';
import { useMonitoring } from './useMonitoring';
import { createLogger } from '../utils/logger';

const logger = createLogger('useActiveAlarmCount');

/**
 * Hook to fetch and maintain active alarm count
 * 
 * @param isAuthenticated - Whether user is authenticated
 * @param isAuthLoading - Whether authentication is still loading
 */
export function useActiveAlarmCount(isAuthenticated: boolean, isAuthLoading: boolean) {
  const { state, fetchActiveAlarmCount } = useMonitoring();
  const { isDataSynced } = state;
  const hasFetchedRef = useRef(false);

  /**
   * Fetch alarm count when authenticated and data is synced
   */
  useEffect(() => {
    // Don't fetch if:
    // 1. Auth is still loading
    // 2. Not authenticated
    // 3. Data is not synced yet (monitoring data not loaded)
    // 4. Already fetched
    if (isAuthLoading || !isAuthenticated || !isDataSynced || hasFetchedRef.current) {
      return;
    }

    logger.log('Fetching initial active alarm count', {
      isAuthenticated,
      isAuthLoading,
      isDataSynced,
    });

    hasFetchedRef.current = true;
    
    // Fetch with a small delay to allow IndexedDB to fully initialize
    const timeoutId = setTimeout(() => {
      fetchActiveAlarmCount();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, isAuthLoading, isDataSynced, fetchActiveAlarmCount]);

  /**
   * Reset fetch flag when user logs out
   */
  useEffect(() => {
    if (!isAuthenticated && hasFetchedRef.current) {
      logger.log('User logged out, resetting fetch flag');
      hasFetchedRef.current = false;
    }
  }, [isAuthenticated]);

  /**
   * Periodic refresh of alarm count every 5 minutes
   * This ensures the badge stays updated even if SignalR connection fails
   */
  useEffect(() => {
    if (!isAuthenticated || !isDataSynced) {
      return;
    }

    logger.log('Setting up periodic alarm count refresh (5 minutes)');

    const intervalId = setInterval(() => {
      logger.log('Periodic alarm count refresh');
      fetchActiveAlarmCount();
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, isDataSynced, fetchActiveAlarmCount]);
}
