/**
 * useActiveAlarmPolling Hook
 * Implements smart polling for active alarms with SignalR fallback
 * 
 * Strategy:
 * 1. Fetches active alarms on app start/page refresh
 * 2. Polls every 5 seconds
 * 3. After 1 minute of polling, if SignalR is connected, stop polling
 * 4. If SignalR disconnects for more than 5 seconds, resume polling
 * 
 * This ensures the sidebar badge is always up-to-date, even when SignalR
 * connection is unavailable or delayed.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useMonitoring } from './useMonitoring';
import { StreamStatus } from '../stores/monitoringStore';
import { createLogger } from '../utils/logger';

const logger = createLogger('useActiveAlarmPolling');

// Polling configuration
const POLL_INTERVAL = 5000; // 5 seconds
const POLLING_DURATION = 60000; // 1 minute
const SIGNALR_DISCONNECT_GRACE_PERIOD = 5000; // 5 seconds

/**
 * Hook to manage active alarm polling with SignalR fallback
 * 
 * @param isAuthenticated - Whether user is authenticated
 * @param isAuthLoading - Whether authentication is still loading
 */
export function useActiveAlarmPolling(isAuthenticated: boolean, isAuthLoading: boolean) {
  const { state, fetchActiveAlarmCount } = useMonitoring();
  const { isDataSynced, activeAlarms, items } = state;
  
  // Track polling state
  const isPollingActiveRef = useRef(false);
  const pollingStartTimeRef = useRef<number | null>(null);
  const pollIntervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const signalRDisconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSignalRStateRef = useRef<StreamStatus>(StreamStatus.IDLE);
  const hasInitialFetchRef = useRef(false);
  
  // CRITICAL: Store current stream status in ref to avoid stale closure in interval
  const currentStreamStatusRef = useRef<StreamStatus>(activeAlarms.streamStatus);
  
  // Update ref whenever stream status changes
  useEffect(() => {
    currentStreamStatusRef.current = activeAlarms.streamStatus;
  }, [activeAlarms.streamStatus]);

  /**
   * Fetch active alarm count
   */
  const fetchAlarms = useCallback(async () => {
    // UPDATED: Also check if items are loaded, not just sync flag
    // This handles page refresh where cached data exists but sync flag might not be set yet
    const hasData = isDataSynced || items.length > 0;
    
    if (!isAuthenticated || !hasData) {
      logger.log('Skip fetch - not ready', { isAuthenticated, isDataSynced, hasData, itemsCount: items.length });
      return;
    }

    try {
      logger.log('Fetching active alarm count...');
      await fetchActiveAlarmCount();
      logger.log('Active alarm count fetched successfully');
    } catch (error) {
      logger.error('Failed to fetch active alarm count:', error);
    }
  }, [isAuthenticated, isDataSynced, items.length, fetchActiveAlarmCount]);

  /**
   * Stop polling for active alarms
   */
  const stopPolling = useCallback(() => {
    if (!isPollingActiveRef.current) {
      logger.log('Polling not active, skipping stop');
      return;
    }

    logger.log('Stopping active alarm polling');

    if (pollIntervalIdRef.current) {
      clearInterval(pollIntervalIdRef.current);
      pollIntervalIdRef.current = null;
    }

    isPollingActiveRef.current = false;
    pollingStartTimeRef.current = null;

    logger.log('Polling stopped successfully');
  }, []);

  /**
   * Start polling for active alarms
   */
  const startPolling = useCallback(() => {
    if (isPollingActiveRef.current) {
      logger.log('Polling already active, skipping start');
      return;
    }

    logger.log('Starting active alarm polling', {
      pollInterval: `${POLL_INTERVAL}ms`,
      pollingDuration: `${POLLING_DURATION}ms`,
    });

    isPollingActiveRef.current = true;
    pollingStartTimeRef.current = Date.now();

    // Fetch immediately
    fetchAlarms();

    // Set up polling interval
    pollIntervalIdRef.current = setInterval(() => {
      const elapsedTime = Date.now() - (pollingStartTimeRef.current || 0);
      
      // Check if we've been polling for 1 minute
      if (elapsedTime >= POLLING_DURATION) {
        // FIXED: Use ref to get current stream status, not stale closure value
        const currentStatus = currentStreamStatusRef.current;
        
        // If SignalR is connected, stop polling
        if (currentStatus === StreamStatus.CONNECTED) {
          logger.log('1 minute elapsed and SignalR connected - stopping polling', {
            streamStatus: currentStatus,
          });
          stopPolling();
          return;
        } else {
          logger.log('1 minute elapsed but SignalR not connected - continuing polling', {
            streamStatus: currentStatus,
          });
        }
      }

      // Continue polling
      fetchAlarms();
    }, POLL_INTERVAL);

    logger.log('Polling started successfully');
  }, [fetchAlarms, stopPolling]);

  /**
   * Initial fetch on app start/refresh
   */
  useEffect(() => {
    // UPDATED: Also check if items are loaded, not just sync flag
    const hasData = isDataSynced || items.length > 0;
    
    if (isAuthLoading || !isAuthenticated || !hasData || hasInitialFetchRef.current) {
      return;
    }

    logger.log('Performing initial fetch on app start/refresh');
    hasInitialFetchRef.current = true;
    
    // Small delay to ensure IndexedDB is ready
    setTimeout(() => {
      fetchAlarms();
      // Start polling after initial fetch
      startPolling();
    }, 500);

    return () => {
      hasInitialFetchRef.current = false;
    };
  }, [isAuthLoading, isAuthenticated, isDataSynced, items.length, fetchAlarms, startPolling]);

  /**
   * Monitor SignalR connection state changes
   */
  useEffect(() => {
    const currentState = activeAlarms.streamStatus;
    const previousState = lastSignalRStateRef.current;

    // Update ref
    lastSignalRStateRef.current = currentState;

    // Skip if state hasn't changed
    if (currentState === previousState) {
      return;
    }

    logger.log('SignalR state changed', {
      from: previousState,
      to: currentState,
    });

    // Handle state transitions
    if (currentState === StreamStatus.CONNECTED) {
      // SignalR connected
      logger.log('SignalR connected - checking if we should stop polling');

      // Clear any pending disconnect timeout
      if (signalRDisconnectTimeoutRef.current) {
        clearTimeout(signalRDisconnectTimeoutRef.current);
        signalRDisconnectTimeoutRef.current = null;
        logger.log('Cleared SignalR disconnect timeout');
      }

      // If we've been polling for at least 1 minute, stop polling
      if (isPollingActiveRef.current && pollingStartTimeRef.current) {
        const elapsedTime = Date.now() - pollingStartTimeRef.current;
        if (elapsedTime >= POLLING_DURATION) {
          logger.log('Stopping polling - SignalR connected after 1 minute of polling');
          stopPolling();
        } else {
          logger.log('SignalR connected but polling duration not reached yet', {
            elapsedTime: `${elapsedTime}ms`,
            remainingTime: `${POLLING_DURATION - elapsedTime}ms`,
          });
        }
      }
    } else if (
      currentState === StreamStatus.DISCONNECTED ||
      currentState === StreamStatus.ERROR
    ) {
      // SignalR disconnected or error
      logger.log('SignalR disconnected/error - scheduling polling resume check', {
        graceperiod: `${SIGNALR_DISCONNECT_GRACE_PERIOD}ms`,
      });

      // Clear any existing timeout
      if (signalRDisconnectTimeoutRef.current) {
        clearTimeout(signalRDisconnectTimeoutRef.current);
      }

      // Wait for grace period before resuming polling
      signalRDisconnectTimeoutRef.current = setTimeout(() => {
        // Check if still disconnected
        if (
          activeAlarms.streamStatus === StreamStatus.DISCONNECTED ||
          activeAlarms.streamStatus === StreamStatus.ERROR
        ) {
          logger.log('SignalR still disconnected after grace period - resuming polling');
          startPolling();
        } else {
          logger.log('SignalR reconnected during grace period - not resuming polling');
        }
        signalRDisconnectTimeoutRef.current = null;
      }, SIGNALR_DISCONNECT_GRACE_PERIOD);
    }
  }, [activeAlarms.streamStatus, startPolling, stopPolling]);

  /**
   * Cleanup on unmount or logout
   */
  useEffect(() => {
    return () => {
      logger.log('Component unmounting - cleaning up polling');
      
      // Stop polling
      stopPolling();
      
      // Clear any pending timeouts
      if (signalRDisconnectTimeoutRef.current) {
        clearTimeout(signalRDisconnectTimeoutRef.current);
        signalRDisconnectTimeoutRef.current = null;
      }
    };
  }, [stopPolling]);

  /**
   * Reset on logout
   */
  useEffect(() => {
    if (!isAuthenticated) {
      logger.log('User logged out - resetting polling state');
      stopPolling();
      hasInitialFetchRef.current = false;
      
      // Clear any pending timeouts
      if (signalRDisconnectTimeoutRef.current) {
        clearTimeout(signalRDisconnectTimeoutRef.current);
        signalRDisconnectTimeoutRef.current = null;
      }
    }
  }, [isAuthenticated, stopPolling]);

  return {
    isPolling: isPollingActiveRef.current,
    startPolling,
    stopPolling,
  };
}
