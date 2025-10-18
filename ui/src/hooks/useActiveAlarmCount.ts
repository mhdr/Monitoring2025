/**
 * useActiveAlarmCount Hook
 * Fetches and maintains active alarm count for sidebar badge display
 * 
 * This hook automatically fetches the active alarm count when:
 * 1. User is authenticated
 * 2. Data is synced (monitoring data loaded)
 * 
 * Features:
 * - Automatic retry with exponential backoff on failures
 * - Periodic refresh every 5 minutes
 * - Error handling and logging
 * 
 * The alarm count is stored in MonitoringContext and displayed in the sidebar badge.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useMonitoring } from './useMonitoring';
import { createLogger } from '../utils/logger';

const logger = createLogger('useActiveAlarmCount');

// Retry configuration
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const MAX_RETRY_DELAY = 60000; // 60 seconds
const MAX_RETRY_ATTEMPTS = 5;

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
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Calculate exponential backoff delay
   */
  const getRetryDelay = useCallback((attempt: number): number => {
    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
    return Math.min(delay, MAX_RETRY_DELAY);
  }, []);

  /**
   * Fetch alarm count with retry logic
   */
  const fetchWithRetry = useCallback(async (attempt: number = 0) => {
    try {
      logger.log('Fetching active alarm count', { attempt, maxAttempts: MAX_RETRY_ATTEMPTS });
      await fetchActiveAlarmCount();
      
      // Success - reset retry count
      setRetryCount(0);
      logger.log('Active alarm count fetched successfully');
    } catch (error) {
      logger.error('Failed to fetch active alarm count:', { error, attempt });
      
      // Check if we should retry
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = getRetryDelay(attempt);
        logger.log('Scheduling retry', { 
          attempt: attempt + 1, 
          delayMs: delay,
          nextRetryIn: `${delay / 1000}s` 
        });
        
        setRetryCount(attempt + 1);
        
        // Schedule retry with exponential backoff
        retryTimeoutRef.current = setTimeout(() => {
          fetchWithRetry(attempt + 1);
        }, delay);
      } else {
        logger.error('Max retry attempts reached, giving up', { maxAttempts: MAX_RETRY_ATTEMPTS });
        setRetryCount(0);
      }
    }
  }, [fetchActiveAlarmCount, getRetryDelay]);

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

    logger.log('Initiating initial active alarm count fetch', {
      isAuthenticated,
      isAuthLoading,
      isDataSynced,
    });

    hasFetchedRef.current = true;
    
    // Fetch with a small delay to allow IndexedDB to fully initialize
    const timeoutId = setTimeout(() => {
      fetchWithRetry(0);
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      // Clear any pending retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [isAuthenticated, isAuthLoading, isDataSynced, fetchWithRetry]);

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
   * Uses retry logic for reliability
   */
  useEffect(() => {
    if (!isAuthenticated || !isDataSynced) {
      return;
    }

    logger.log('Setting up periodic alarm count refresh (5 minutes)');

    const intervalId = setInterval(() => {
      logger.log('Periodic alarm count refresh');
      fetchWithRetry(0);
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(intervalId);
    };
  }, [isAuthenticated, isDataSynced, fetchWithRetry]);

  // Return retry count for potential UI feedback
  return { retryCount };
}
