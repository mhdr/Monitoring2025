/**
 * useActiveAlarmFetch Hook
 * Fetches active alarms once on app start/page refresh
 * Real-time updates are handled by SignalR via useSignalR hook
 * 
 * Strategy:
 * 1. Fetches active alarms once on app start/page refresh
 * 2. SignalR handles all real-time updates via ReceiveActiveAlarmsUpdate
 * 
 * This ensures the sidebar badge is initialized correctly after page refresh,
 * and then kept up-to-date via SignalR streaming.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMonitoring } from './useMonitoring';
import { createLogger } from '../utils/logger';

const logger = createLogger('useActiveAlarmFetch');

/**
 * Hook to fetch active alarms once on page load
 * Real-time updates handled by SignalR
 * 
 * @param isAuthenticated - Whether user is authenticated
 * @param isAuthLoading - Whether authentication is still loading
 */
export function useActiveAlarmPolling(isAuthenticated: boolean, isAuthLoading: boolean) {
  const { state, fetchActiveAlarmCount } = useMonitoring();
  const { isDataSynced, items } = state;
  
  const hasInitialFetchRef = useRef(false);

  /**
   * Fetch active alarm count once
   */
  const fetchAlarms = useCallback(async () => {
    // Check if items are loaded (either synced or cached from localStorage)
    const hasData = isDataSynced || items.length > 0;
    
    if (!isAuthenticated || !hasData) {
      logger.log('Skip fetch - not ready', { isAuthenticated, isDataSynced, hasData, itemsCount: items.length });
      return;
    }

    try {
      logger.log('Fetching active alarm count (initial fetch)...');
      await fetchActiveAlarmCount();
      logger.log('Active alarm count fetched successfully');
    } catch (error) {
      logger.error('Failed to fetch active alarm count:', error);
    }
  }, [isAuthenticated, isDataSynced, items.length, fetchActiveAlarmCount]);

  /**
   * Initial fetch on app start/refresh
   * Only fetches once, then SignalR handles all updates
   */
  useEffect(() => {
    // Check if items are loaded (either synced or cached from localStorage)
    const hasData = isDataSynced || items.length > 0;
    
    if (isAuthLoading || !isAuthenticated || !hasData || hasInitialFetchRef.current) {
      return;
    }

    logger.log('Performing initial fetch on app start/refresh (one-time only)');
    hasInitialFetchRef.current = true;
    
    // Small delay to ensure Zustand store is ready
    setTimeout(() => {
      fetchAlarms();
      logger.log('Initial fetch complete - SignalR will handle real-time updates');
    }, 500);

    return () => {
      hasInitialFetchRef.current = false;
    };
  }, [isAuthLoading, isAuthenticated, isDataSynced, items.length, fetchAlarms]);

  /**
   * Reset on logout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      logger.log('User logged out - resetting fetch state');
      hasInitialFetchRef.current = false;
    }
  }, [isAuthenticated]);
}
