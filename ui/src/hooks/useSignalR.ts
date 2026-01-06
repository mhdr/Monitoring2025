/**
 * useSignalR Hook
 * React hook for managing SignalR connection lifecycle and state
 */

import { useEffect, useCallback, useRef } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { signalRManager, type ActiveAlarmsUpdate } from '../services/signalrClient';
import { useMonitoring } from './useMonitoring';
import { StreamStatus } from '../stores/monitoringStore';
import { createLogger } from '../utils/logger';

const logger = createLogger('useSignalR');

interface UseSignalROptions {
  /** Callback to trigger background sync when ReceiveSettingsUpdate is received */
  onSettingsUpdate?: () => void | Promise<void>;
}

/**
 * Map SignalR connection state to our StreamStatus
 */
function mapConnectionState(state: HubConnectionState): StreamStatus {
  switch (state) {
    case HubConnectionState.Connected:
      return StreamStatus.CONNECTED;
    case HubConnectionState.Connecting:
    case HubConnectionState.Reconnecting:
      return StreamStatus.CONNECTING;
    case HubConnectionState.Disconnected:
      return StreamStatus.DISCONNECTED;
    case HubConnectionState.Disconnecting:
      return StreamStatus.DISCONNECTED;
    default:
      return StreamStatus.IDLE;
  }
}

/**
 * Hook to manage SignalR connection for real-time active alarms
 * Automatically connects when authenticated and disconnects on unmount
 * 
 * @param isAuthenticated - Whether user is authenticated
 * @param isAuthLoading - Whether authentication is still loading
 * @param options - Optional configuration including onSettingsUpdate callback
 */
export function useSignalR(
  isAuthenticated: boolean,
  isAuthLoading: boolean,
  options?: UseSignalROptions
) {
  const {
    setActiveAlarmsStreamStatus,
    setActiveAlarmsStreamError,
    fetchActiveAlarmCount,
  } = useMonitoring();

  const connectionAttemptedRef = useRef(false);
  const isConnectingRef = useRef(false);

  /**
   * Handle active alarms update from SignalR
   * 
   * CRITICAL FIX: Don't update count immediately from SignalR broadcast
   * SignalR broadcasts the system-wide alarm count (unfiltered), but users only
   * see alarms they have permission for (filtered by itemIds). If we update the
   * badge immediately with the unfiltered count, it will briefly mismatch with
   * the filtered count shown on ActiveAlarmsPage, causing confusion.
   * 
   * Solution: Only fetch the filtered alarm list and let the API response update
   * the count. This ensures badge and page always show the same filtered count.
   */
  const handleActiveAlarmsUpdate = useCallback(
    (update: ActiveAlarmsUpdate) => {
      logger.log('Received active alarms update via SignalR:', update);
      logger.log('Fetching filtered active alarm list (will update count after fetch)...');

      // Fetch full active alarm list with itemIds filter
      // This will update the count with the filtered value, ensuring badge matches page
      fetchActiveAlarmCount().catch((error) => {
        logger.error('Failed to fetch active alarms after SignalR update:', error);
      });
    },
    [fetchActiveAlarmCount]
  );

  /**
   * Handle settings update from SignalR
   * Triggers background sync to refresh data
   */
  const handleSettingsUpdate = useCallback(() => {
    logger.info('Settings update received - triggering background sync');
    if (options?.onSettingsUpdate) {
      const result = options.onSettingsUpdate();
      // Handle both sync and async callbacks
      if (result instanceof Promise) {
        result.catch((error) => {
          logger.error('Error in onSettingsUpdate callback:', error);
        });
      }
    }
  }, [options]);

  /**
   * Connect to SignalR hub
   */
  const connect = useCallback(async () => {
    if (isConnectingRef.current) {
      logger.log('Connection already in progress, skipping...');
      return;
    }

    if (!isAuthenticated) {
      logger.log('Not authenticated, skipping SignalR connection');
      return;
    }

    try {
      isConnectingRef.current = true;
      setActiveAlarmsStreamStatus(StreamStatus.CONNECTING);

      logger.log('Connecting to SignalR...');

      // Subscribe to active alarms updates before connecting
      signalRManager.onActiveAlarmsUpdate(handleActiveAlarmsUpdate);

      // Subscribe to settings updates before connecting
      signalRManager.onSettingsUpdate(handleSettingsUpdate);

      // Register silent handlers for other SignalR messages to prevent console warnings
      // These messages are handled by specific page components (GlobalVariableManagementPage, ModbusGatewayPage)
      // when they mount, but we need base handlers to prevent "No client method found" warnings
      // which cause CPU overhead from the SignalR library continuously searching for handlers
      signalRManager.onGlobalVariablesUpdate(() => {
        // Silent handler - specific pages subscribe with their own handlers when mounted
        logger.log('Received global variables update (silent handler)');
      });
      signalRManager.onGatewayStatusUpdate(() => {
        // Silent handler - ModbusGatewayPage subscribes with its own handler when mounted
        logger.log('Received gateway status update (silent handler)');
      });

      // Start the connection
      await signalRManager.start();

      // Update status based on actual connection state
      const state = signalRManager.getState();
      setActiveAlarmsStreamStatus(mapConnectionState(state));

      logger.log('SignalR connected successfully', { state });
    } catch (error) {
      logger.error('Failed to connect to SignalR:', error);
      setActiveAlarmsStreamStatus(StreamStatus.ERROR);
      setActiveAlarmsStreamError(
        error instanceof Error ? error.message : 'Failed to connect to SignalR'
      );
    } finally {
      isConnectingRef.current = false;
    }
  }, [isAuthenticated, handleActiveAlarmsUpdate, handleSettingsUpdate, setActiveAlarmsStreamStatus, setActiveAlarmsStreamError]);

  /**
   * Disconnect from SignalR hub
   */
  const disconnect = useCallback(async () => {
    try {
      logger.log('Disconnecting from SignalR...');

      // Unsubscribe from updates
      signalRManager.offActiveAlarmsUpdate();
      signalRManager.offSettingsUpdate();
      signalRManager.offGlobalVariablesUpdate();
      signalRManager.offGatewayStatusUpdate();

      // Stop the connection
      await signalRManager.stop();

      setActiveAlarmsStreamStatus(StreamStatus.DISCONNECTED);
      logger.log('SignalR disconnected');
    } catch (error) {
      logger.error('Error disconnecting from SignalR:', error);
    }
  }, [setActiveAlarmsStreamStatus]);

  /**
   * Reconnect to SignalR hub
   */
  const reconnect = useCallback(async () => {
    logger.log('Reconnecting to SignalR...');
    try {
      setActiveAlarmsStreamStatus(StreamStatus.CONNECTING);
      await signalRManager.reconnect();
      setActiveAlarmsStreamStatus(StreamStatus.CONNECTED);
      logger.log('SignalR reconnected successfully');
    } catch (error) {
      logger.error('Failed to reconnect to SignalR:', error);
      setActiveAlarmsStreamStatus(StreamStatus.ERROR);
      setActiveAlarmsStreamError(
        error instanceof Error ? error.message : 'Failed to reconnect to SignalR'
      );
    }
  }, [setActiveAlarmsStreamStatus, setActiveAlarmsStreamError]);

  /**
   * Auto-connect when authenticated
   */
  useEffect(() => {
    // Don't connect if:
    // 1. Auth is still loading
    // 2. Not authenticated
    // 3. Already attempted connection
    if (isAuthLoading || !isAuthenticated || connectionAttemptedRef.current) {
      return;
    }

    logger.log('Auth ready, initiating SignalR connection...', {
      isAuthenticated,
      isAuthLoading,
    });

    connectionAttemptedRef.current = true;

    // Add small delay to ensure auth storage is completely settled
    setTimeout(() => {
      connect();
    }, 100);
  }, [isAuthenticated, isAuthLoading, connect]);

  /**
   * Cleanup on unmount or when authentication changes
   */
  useEffect(() => {
    return () => {
      if (connectionAttemptedRef.current) {
        logger.log('Component unmounting, disconnecting SignalR...');
        disconnect();
        connectionAttemptedRef.current = false;
      }
    };
  }, [disconnect]);

  /**
   * Disconnect when user logs out
   */
  useEffect(() => {
    if (!isAuthenticated && connectionAttemptedRef.current) {
      logger.log('User logged out, disconnecting SignalR...');
      disconnect();
      connectionAttemptedRef.current = false;
    }
  }, [isAuthenticated, disconnect]);

  return {
    connect,
    disconnect,
    reconnect,
  };
}
